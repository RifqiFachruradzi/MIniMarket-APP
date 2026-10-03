import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  cashTransactions,
  customerPayments,
  customers,
  goodsIssueItems,
  goodsIssues,
  goodsReceiptItems,
  goodsReceipts,
  products,
  saleItems,
  sales,
  stockAdjustments,
  supplierPayments,
  suppliers,
} from "@/db/schema";
import { ACC } from "@/lib/accounts";
import { AppError } from "@/lib/errors";
import { stockIn, stockOut } from "./inventory";
import { accountIdByCode, assertCashAccount, nextNumber, postJournal, type Tx } from "./ledger";

function paymentStatus(total: number, paid: number) {
  if (paid >= total) return "paid" as const;
  if (paid > 0) return "partial" as const;
  return "unpaid" as const;
}

function assertDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError("Tanggal tidak valid.");
}

function assertItems<T extends { productId: number; qty: number }>(items: T[]) {
  if (items.length === 0) throw new AppError("Tambahkan minimal satu barang.");
  for (const it of items) {
    if (!Number.isInteger(it.qty) || it.qty <= 0) throw new AppError("Jumlah barang harus bilangan bulat lebih dari 0.");
  }
}

// ---------------------------------------------------------------------------
// Penjualan
// ---------------------------------------------------------------------------

export type SaleInput = {
  date: string;
  paymentType: "cash" | "credit";
  cashAccountId?: number | null;
  customerId?: number | null;
  discount?: number;
  tendered?: number;
  note?: string;
  userId?: number;
  items: { productId: number; qty: number; price?: number }[];
};

export async function createSale(input: SaleInput) {
  assertDate(input.date);
  assertItems(input.items);
  return db.transaction(async (tx) => {
    const lines: { productId: number; qty: number; price: number; subtotal: number }[] = [];
    for (const it of input.items) {
      const p = await tx.select().from(products).where(eq(products.id, it.productId)).get();
      if (!p) throw new AppError("Produk tidak ditemukan.");
      const price = it.price ?? p.sellPrice;
      if (price < 0) throw new AppError("Harga jual tidak valid.");
      lines.push({ productId: it.productId, qty: it.qty, price, subtotal: price * it.qty });
    }
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const discount = Math.max(0, Math.round(input.discount ?? 0));
    if (discount > subtotal) throw new AppError("Diskon melebihi subtotal.");
    const total = subtotal - discount;

    let cashAccountId: number | null = null;
    let customerId: number | null = input.customerId ?? null;
    if (input.paymentType === "cash") {
      cashAccountId = input.cashAccountId ?? (await accountIdByCode(tx, ACC.CASH));
      await assertCashAccount(tx, cashAccountId);
      if ((input.tendered ?? total) < total) throw new AppError("Uang yang diterima kurang dari total belanja.");
    } else {
      if (!customerId) throw new AppError("Penjualan kredit wajib memilih pelanggan.");
      if (!(await tx.select().from(customers).where(eq(customers.id, customerId)).get())) throw new AppError("Pelanggan tidak ditemukan.");
    }

    const number = await nextNumber(tx, sales, "INV", input.date);
    const amountPaid = input.paymentType === "cash" ? total : 0;
    const sale = await tx
      .insert(sales)
      .values({
        number,
        date: input.date,
        customerId,
        paymentType: input.paymentType,
        cashAccountId,
        subtotal,
        discount,
        total,
        amountPaid,
        tendered: input.paymentType === "cash" ? (input.tendered ?? total) : 0,
        status: paymentStatus(total, amountPaid),
        note: input.note || null,
        userId: input.userId ?? null,
      })
      .returning()
      .get();

    let cogs = 0;
    for (const l of lines) {
      const { cost, unitCost } = await stockOut(tx, { productId: l.productId, qty: l.qty, date: input.date, type: "sale", reference: number });
      cogs += cost;
      await tx.insert(saleItems).values({ saleId: sale.id, productId: l.productId, qty: l.qty, price: l.price, unitCost, subtotal: l.subtotal }).run();
    }
    await tx.update(sales).set({ cogs }).where(eq(sales.id, sale.id)).run();

    const debitAccount = input.paymentType === "cash" ? cashAccountId! : await accountIdByCode(tx, ACC.RECEIVABLE);
    await postJournal(
      tx,
      { date: input.date, reference: number, description: `Penjualan ${number}`, source: "sale" },
      [
        { accountId: debitAccount, debit: total },
        { accountId: await accountIdByCode(tx, ACC.SALES), credit: total },
      ],
    );
    await postJournal(
      tx,
      { date: input.date, reference: number, description: `HPP penjualan ${number}`, source: "sale_cogs" },
      [
        { accountId: await accountIdByCode(tx, ACC.COGS), debit: cogs },
        { accountId: await accountIdByCode(tx, ACC.INVENTORY), credit: cogs },
      ],
    );
    return { id: sale.id, number };
  });
}

// ---------------------------------------------------------------------------
// Penerimaan pembayaran pelanggan (pelunasan piutang)
// ---------------------------------------------------------------------------

export async function receiveCustomerPayment(input: { date: string; saleId: number; cashAccountId: number; amount: number; note?: string }) {
  assertDate(input.date);
  return db.transaction(async (tx) => {
    const sale = await tx.select().from(sales).where(eq(sales.id, input.saleId)).get();
    if (!sale) throw new AppError("Faktur penjualan tidak ditemukan.");
    const outstanding = sale.total - sale.amountPaid;
    const amount = Math.round(input.amount);
    if (amount <= 0) throw new AppError("Nominal pembayaran harus lebih dari 0.");
    if (amount > outstanding) throw new AppError(`Nominal melebihi sisa piutang (${outstanding.toLocaleString("id-ID")}).`);
    await assertCashAccount(tx, input.cashAccountId);

    const number = await nextNumber(tx, customerPayments, "RCV", input.date);
    await tx.insert(customerPayments)
      .values({ number, date: input.date, saleId: sale.id, customerId: sale.customerId, cashAccountId: input.cashAccountId, amount, note: input.note || null })
      .run();
    const paid = sale.amountPaid + amount;
    await tx.update(sales).set({ amountPaid: paid, status: paymentStatus(sale.total, paid) }).where(eq(sales.id, sale.id)).run();

    await postJournal(
      tx,
      { date: input.date, reference: number, description: `Penerimaan piutang ${sale.number}`, source: "customer_payment" },
      [
        { accountId: input.cashAccountId, debit: amount },
        { accountId: await accountIdByCode(tx, ACC.RECEIVABLE), credit: amount },
      ],
    );
    return { number };
  });
}

// ---------------------------------------------------------------------------
// Penerimaan barang (pembelian dari pemasok)
// ---------------------------------------------------------------------------

export type GoodsReceiptInput = {
  date: string;
  supplierId: number;
  supplierInvoice?: string;
  dueDate?: string;
  note?: string;
  /** Jika diisi, pembelian langsung dibayar lunas dari akun kas/bank ini */
  payNowAccountId?: number | null;
  items: { productId: number; qty: number; unitCost: number }[];
};

export async function createGoodsReceipt(input: GoodsReceiptInput) {
  assertDate(input.date);
  assertItems(input.items);
  const result = await db.transaction(async (tx) => {
    if (!(await tx.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).get())) throw new AppError("Pemasok tidak ditemukan.");
    for (const it of input.items) {
      if (!Number.isFinite(it.unitCost) || it.unitCost < 0) throw new AppError("Harga beli tidak valid.");
    }
    const total = input.items.reduce((s, it) => s + Math.round(it.unitCost) * it.qty, 0);
    const number = await nextNumber(tx, goodsReceipts, "GRN", input.date);
    const receipt = await tx
      .insert(goodsReceipts)
      .values({
        number,
        date: input.date,
        supplierId: input.supplierId,
        supplierInvoice: input.supplierInvoice || null,
        dueDate: input.dueDate || null,
        total,
        amountPaid: 0,
        status: paymentStatus(total, 0),
        note: input.note || null,
      })
      .returning()
      .get();

    for (const it of input.items) {
      const unitCost = Math.round(it.unitCost);
      await stockIn(tx, { productId: it.productId, qty: it.qty, unitCost, date: input.date, type: "receipt", reference: number });
      await tx.insert(goodsReceiptItems).values({ receiptId: receipt.id, productId: it.productId, qty: it.qty, unitCost, subtotal: unitCost * it.qty }).run();
    }

    await postJournal(
      tx,
      { date: input.date, reference: number, description: `Penerimaan barang ${number}`, source: "goods_receipt" },
      [
        { accountId: await accountIdByCode(tx, ACC.INVENTORY), debit: total },
        { accountId: await accountIdByCode(tx, ACC.PAYABLE), credit: total },
      ],
    );
    return { id: receipt.id, number, total };
  });

  if (input.payNowAccountId && result.total > 0) {
    await paySupplier({ date: input.date, receiptId: result.id, cashAccountId: input.payNowAccountId, amount: result.total, note: "Dibayar tunai saat penerimaan" });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pembayaran pemasok (pelunasan hutang)
// ---------------------------------------------------------------------------

export async function paySupplier(input: { date: string; receiptId: number; cashAccountId: number; amount: number; note?: string }) {
  assertDate(input.date);
  return db.transaction(async (tx) => {
    const receipt = await tx.select().from(goodsReceipts).where(eq(goodsReceipts.id, input.receiptId)).get();
    if (!receipt) throw new AppError("Dokumen penerimaan barang tidak ditemukan.");
    const outstanding = receipt.total - receipt.amountPaid;
    const amount = Math.round(input.amount);
    if (amount <= 0) throw new AppError("Nominal pembayaran harus lebih dari 0.");
    if (amount > outstanding) throw new AppError(`Nominal melebihi sisa hutang (${outstanding.toLocaleString("id-ID")}).`);
    await assertCashAccount(tx, input.cashAccountId);

    const number = await nextNumber(tx, supplierPayments, "PAY", input.date);
    await tx.insert(supplierPayments)
      .values({ number, date: input.date, receiptId: receipt.id, supplierId: receipt.supplierId, cashAccountId: input.cashAccountId, amount, note: input.note || null })
      .run();
    const paid = receipt.amountPaid + amount;
    await tx.update(goodsReceipts).set({ amountPaid: paid, status: paymentStatus(receipt.total, paid) }).where(eq(goodsReceipts.id, receipt.id)).run();

    await postJournal(
      tx,
      { date: input.date, reference: number, description: `Pembayaran pemasok ${receipt.number}`, source: "supplier_payment" },
      [
        { accountId: await accountIdByCode(tx, ACC.PAYABLE), debit: amount },
        { accountId: input.cashAccountId, credit: amount },
      ],
    );
    return { number };
  });
}

// ---------------------------------------------------------------------------
// Pengeluaran barang (rusak, kedaluwarsa, hilang, pemakaian internal)
// ---------------------------------------------------------------------------

export async function createGoodsIssue(input: { date: string; reason: string; note?: string; items: { productId: number; qty: number }[] }) {
  assertDate(input.date);
  assertItems(input.items);
  if (!input.reason) throw new AppError("Alasan pengeluaran wajib diisi.");
  return db.transaction(async (tx) => {
    const number = await nextNumber(tx, goodsIssues, "GIN", input.date);
    const issue = await tx.insert(goodsIssues).values({ number, date: input.date, reason: input.reason, totalCost: 0, note: input.note || null }).returning().get();
    let totalCost = 0;
    for (const it of input.items) {
      const { cost, unitCost } = await stockOut(tx, { productId: it.productId, qty: it.qty, date: input.date, type: "issue", reference: number, note: input.reason });
      totalCost += cost;
      await tx.insert(goodsIssueItems).values({ issueId: issue.id, productId: it.productId, qty: it.qty, unitCost, subtotal: cost }).run();
    }
    await tx.update(goodsIssues).set({ totalCost }).where(eq(goodsIssues.id, issue.id)).run();

    await postJournal(
      tx,
      { date: input.date, reference: number, description: `Pengeluaran barang (${input.reason}) ${number}`, source: "goods_issue" },
      [
        { accountId: await accountIdByCode(tx, ACC.INVENTORY_LOSS), debit: totalCost },
        { accountId: await accountIdByCode(tx, ACC.INVENTORY), credit: totalCost },
      ],
    );
    return { id: issue.id, number };
  });
}

// ---------------------------------------------------------------------------
// Stock opname (penyesuaian stok fisik)
// ---------------------------------------------------------------------------

export async function createStockAdjustment(input: { date: string; productId: number; physicalQty: number; note?: string }) {
  assertDate(input.date);
  if (!Number.isInteger(input.physicalQty) || input.physicalQty < 0) throw new AppError("Stok fisik harus bilangan bulat ≥ 0.");
  return db.transaction(async (tx) => {
    const p = await tx.select().from(products).where(eq(products.id, input.productId)).get();
    if (!p) throw new AppError("Produk tidak ditemukan.");
    const diff = input.physicalQty - p.stock;
    if (diff === 0) throw new AppError("Stok fisik sama dengan stok sistem, tidak ada penyesuaian.");
    const number = await nextNumber(tx, stockAdjustments, "ADJ", input.date);
    const unitCost = p.avgCost;
    let value: number;
    if (diff > 0) value = await stockIn(tx, { productId: p.id, qty: diff, unitCost, date: input.date, type: "adjustment", reference: number, note: input.note });
    else value = (await stockOut(tx, { productId: p.id, qty: -diff, date: input.date, type: "adjustment", reference: number, note: input.note })).cost;

    await tx.insert(stockAdjustments)
      .values({ number, date: input.date, productId: p.id, systemQty: p.stock, physicalQty: input.physicalQty, difference: diff, unitCost, value, note: input.note || null })
      .run();

    const inv = await accountIdByCode(tx, ACC.INVENTORY);
    const variance = await accountIdByCode(tx, ACC.INVENTORY_VARIANCE);
    await postJournal(
      tx,
      { date: input.date, reference: number, description: `Stock opname ${p.name}`, source: "stock_adjustment" },
      diff > 0
        ? [
            { accountId: inv, debit: value },
            { accountId: variance, credit: value },
          ]
        : [
            { accountId: variance, debit: value },
            { accountId: inv, credit: value },
          ],
    );
    return { number };
  });
}

// ---------------------------------------------------------------------------
// Kas & bank
// ---------------------------------------------------------------------------

export async function createCashTransaction(input: {
  date: string;
  type: "in" | "out" | "transfer";
  cashAccountId: number;
  counterAccountId: number;
  amount: number;
  description: string;
}) {
  assertDate(input.date);
  const amount = Math.round(input.amount);
  if (amount <= 0) throw new AppError("Nominal harus lebih dari 0.");
  if (!input.description.trim()) throw new AppError("Keterangan wajib diisi.");
  return db.transaction(async (tx) => {
    await assertCashAccount(tx, input.cashAccountId);
    const counter = await tx.select().from(accounts).where(eq(accounts.id, input.counterAccountId)).get();
    if (!counter) throw new AppError("Akun lawan tidak ditemukan.");
    if (input.type === "transfer") {
      if (!counter.isCash) throw new AppError("Akun tujuan transfer harus akun kas/bank.");
      if (counter.id === input.cashAccountId) throw new AppError("Akun asal dan tujuan tidak boleh sama.");
    } else if (counter.isCash || counter.isSystem) {
      throw new AppError("Akun lawan tidak boleh akun kas/bank atau akun sistem (piutang, hutang, persediaan).");
    }

    const prefix = input.type === "in" ? "CIN" : input.type === "out" ? "COUT" : "TRF";
    const number = await nextNumber(tx, cashTransactions, prefix, input.date);
    await tx.insert(cashTransactions)
      .values({ number, date: input.date, type: input.type, cashAccountId: input.cashAccountId, counterAccountId: counter.id, amount, description: input.description.trim() })
      .run();

    const lines =
      input.type === "in"
        ? [
            { accountId: input.cashAccountId, debit: amount },
            { accountId: counter.id, credit: amount },
          ]
        : // kas keluar & transfer: debit lawan akun, kredit akun kas asal
          [
            { accountId: counter.id, debit: amount },
            { accountId: input.cashAccountId, credit: amount },
          ];
    await postJournal(tx, { date: input.date, reference: number, description: input.description.trim(), source: "cash" }, lines);
    return { number };
  });
}

// ---------------------------------------------------------------------------
// Saldo awal persediaan (dipakai saat setup / produk baru dengan stok awal)
// ---------------------------------------------------------------------------

export async function openingStock(tx: Tx, input: { date: string; productId: number; qty: number; unitCost: number }) {
  const reference = `OPEN-${input.productId}`;
  const value = await stockIn(tx, { ...input, type: "opening", reference, note: "Saldo awal" });
  await postJournal(
    tx,
    { date: input.date, reference, description: "Saldo awal persediaan", source: "opening" },
    [
      { accountId: await accountIdByCode(tx, ACC.INVENTORY), debit: value },
      { accountId: await accountIdByCode(tx, ACC.CAPITAL), credit: value },
    ],
  );
}
