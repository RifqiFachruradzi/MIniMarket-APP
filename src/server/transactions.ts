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

export function createSale(input: SaleInput) {
  assertDate(input.date);
  assertItems(input.items);
  return db.transaction((tx) => {
    const lines = input.items.map((it) => {
      const p = tx.select().from(products).where(eq(products.id, it.productId)).get();
      if (!p) throw new AppError("Produk tidak ditemukan.");
      const price = it.price ?? p.sellPrice;
      if (price < 0) throw new AppError("Harga jual tidak valid.");
      return { ...it, price, subtotal: price * it.qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const discount = Math.max(0, Math.round(input.discount ?? 0));
    if (discount > subtotal) throw new AppError("Diskon melebihi subtotal.");
    const total = subtotal - discount;

    let cashAccountId: number | null = null;
    let customerId: number | null = input.customerId ?? null;
    if (input.paymentType === "cash") {
      cashAccountId = input.cashAccountId ?? accountIdByCode(tx, ACC.CASH);
      assertCashAccount(tx, cashAccountId);
      if ((input.tendered ?? total) < total) throw new AppError("Uang yang diterima kurang dari total belanja.");
    } else {
      if (!customerId) throw new AppError("Penjualan kredit wajib memilih pelanggan.");
      if (!tx.select().from(customers).where(eq(customers.id, customerId)).get()) throw new AppError("Pelanggan tidak ditemukan.");
    }

    const number = nextNumber(tx, sales, "INV", input.date);
    const amountPaid = input.paymentType === "cash" ? total : 0;
    const sale = tx
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
      const { cost, unitCost } = stockOut(tx, { productId: l.productId, qty: l.qty, date: input.date, type: "sale", reference: number });
      cogs += cost;
      tx.insert(saleItems).values({ saleId: sale.id, productId: l.productId, qty: l.qty, price: l.price, unitCost, subtotal: l.subtotal }).run();
    }
    tx.update(sales).set({ cogs }).where(eq(sales.id, sale.id)).run();

    const debitAccount = input.paymentType === "cash" ? cashAccountId! : accountIdByCode(tx, ACC.RECEIVABLE);
    postJournal(
      tx,
      { date: input.date, reference: number, description: `Penjualan ${number}`, source: "sale" },
      [
        { accountId: debitAccount, debit: total },
        { accountId: accountIdByCode(tx, ACC.SALES), credit: total },
      ],
    );
    postJournal(
      tx,
      { date: input.date, reference: number, description: `HPP penjualan ${number}`, source: "sale_cogs" },
      [
        { accountId: accountIdByCode(tx, ACC.COGS), debit: cogs },
        { accountId: accountIdByCode(tx, ACC.INVENTORY), credit: cogs },
      ],
    );
    return { id: sale.id, number };
  });
}

// ---------------------------------------------------------------------------
// Penerimaan pembayaran pelanggan (pelunasan piutang)
// ---------------------------------------------------------------------------

export function receiveCustomerPayment(input: { date: string; saleId: number; cashAccountId: number; amount: number; note?: string }) {
  assertDate(input.date);
  return db.transaction((tx) => {
    const sale = tx.select().from(sales).where(eq(sales.id, input.saleId)).get();
    if (!sale) throw new AppError("Faktur penjualan tidak ditemukan.");
    const outstanding = sale.total - sale.amountPaid;
    const amount = Math.round(input.amount);
    if (amount <= 0) throw new AppError("Nominal pembayaran harus lebih dari 0.");
    if (amount > outstanding) throw new AppError(`Nominal melebihi sisa piutang (${outstanding.toLocaleString("id-ID")}).`);
    assertCashAccount(tx, input.cashAccountId);

    const number = nextNumber(tx, customerPayments, "RCV", input.date);
    tx.insert(customerPayments)
      .values({ number, date: input.date, saleId: sale.id, customerId: sale.customerId, cashAccountId: input.cashAccountId, amount, note: input.note || null })
      .run();
    const paid = sale.amountPaid + amount;
    tx.update(sales).set({ amountPaid: paid, status: paymentStatus(sale.total, paid) }).where(eq(sales.id, sale.id)).run();

    postJournal(
      tx,
      { date: input.date, reference: number, description: `Penerimaan piutang ${sale.number}`, source: "customer_payment" },
      [
        { accountId: input.cashAccountId, debit: amount },
        { accountId: accountIdByCode(tx, ACC.RECEIVABLE), credit: amount },
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

export function createGoodsReceipt(input: GoodsReceiptInput) {
  assertDate(input.date);
  assertItems(input.items);
  const result = db.transaction((tx) => {
    if (!tx.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).get()) throw new AppError("Pemasok tidak ditemukan.");
    for (const it of input.items) {
      if (!Number.isFinite(it.unitCost) || it.unitCost < 0) throw new AppError("Harga beli tidak valid.");
    }
    const total = input.items.reduce((s, it) => s + Math.round(it.unitCost) * it.qty, 0);
    const number = nextNumber(tx, goodsReceipts, "GRN", input.date);
    const receipt = tx
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
      stockIn(tx, { productId: it.productId, qty: it.qty, unitCost, date: input.date, type: "receipt", reference: number });
      tx.insert(goodsReceiptItems).values({ receiptId: receipt.id, productId: it.productId, qty: it.qty, unitCost, subtotal: unitCost * it.qty }).run();
    }

    postJournal(
      tx,
      { date: input.date, reference: number, description: `Penerimaan barang ${number}`, source: "goods_receipt" },
      [
        { accountId: accountIdByCode(tx, ACC.INVENTORY), debit: total },
        { accountId: accountIdByCode(tx, ACC.PAYABLE), credit: total },
      ],
    );
    return { id: receipt.id, number, total };
  });

  if (input.payNowAccountId && result.total > 0) {
    paySupplier({ date: input.date, receiptId: result.id, cashAccountId: input.payNowAccountId, amount: result.total, note: "Dibayar tunai saat penerimaan" });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pembayaran pemasok (pelunasan hutang)
// ---------------------------------------------------------------------------

export function paySupplier(input: { date: string; receiptId: number; cashAccountId: number; amount: number; note?: string }) {
  assertDate(input.date);
  return db.transaction((tx) => {
    const receipt = tx.select().from(goodsReceipts).where(eq(goodsReceipts.id, input.receiptId)).get();
    if (!receipt) throw new AppError("Dokumen penerimaan barang tidak ditemukan.");
    const outstanding = receipt.total - receipt.amountPaid;
    const amount = Math.round(input.amount);
    if (amount <= 0) throw new AppError("Nominal pembayaran harus lebih dari 0.");
    if (amount > outstanding) throw new AppError(`Nominal melebihi sisa hutang (${outstanding.toLocaleString("id-ID")}).`);
    assertCashAccount(tx, input.cashAccountId);

    const number = nextNumber(tx, supplierPayments, "PAY", input.date);
    tx.insert(supplierPayments)
      .values({ number, date: input.date, receiptId: receipt.id, supplierId: receipt.supplierId, cashAccountId: input.cashAccountId, amount, note: input.note || null })
      .run();
    const paid = receipt.amountPaid + amount;
    tx.update(goodsReceipts).set({ amountPaid: paid, status: paymentStatus(receipt.total, paid) }).where(eq(goodsReceipts.id, receipt.id)).run();

    postJournal(
      tx,
      { date: input.date, reference: number, description: `Pembayaran pemasok ${receipt.number}`, source: "supplier_payment" },
      [
        { accountId: accountIdByCode(tx, ACC.PAYABLE), debit: amount },
        { accountId: input.cashAccountId, credit: amount },
      ],
    );
    return { number };
  });
}

// ---------------------------------------------------------------------------
// Pengeluaran barang (rusak, kedaluwarsa, hilang, pemakaian internal)
// ---------------------------------------------------------------------------

export function createGoodsIssue(input: { date: string; reason: string; note?: string; items: { productId: number; qty: number }[] }) {
  assertDate(input.date);
  assertItems(input.items);
  if (!input.reason) throw new AppError("Alasan pengeluaran wajib diisi.");
  return db.transaction((tx) => {
    const number = nextNumber(tx, goodsIssues, "GIN", input.date);
    const issue = tx.insert(goodsIssues).values({ number, date: input.date, reason: input.reason, totalCost: 0, note: input.note || null }).returning().get();
    let totalCost = 0;
    for (const it of input.items) {
      const { cost, unitCost } = stockOut(tx, { productId: it.productId, qty: it.qty, date: input.date, type: "issue", reference: number, note: input.reason });
      totalCost += cost;
      tx.insert(goodsIssueItems).values({ issueId: issue.id, productId: it.productId, qty: it.qty, unitCost, subtotal: cost }).run();
    }
    tx.update(goodsIssues).set({ totalCost }).where(eq(goodsIssues.id, issue.id)).run();

    postJournal(
      tx,
      { date: input.date, reference: number, description: `Pengeluaran barang (${input.reason}) ${number}`, source: "goods_issue" },
      [
        { accountId: accountIdByCode(tx, ACC.INVENTORY_LOSS), debit: totalCost },
        { accountId: accountIdByCode(tx, ACC.INVENTORY), credit: totalCost },
      ],
    );
    return { id: issue.id, number };
  });
}

// ---------------------------------------------------------------------------
// Stock opname (penyesuaian stok fisik)
// ---------------------------------------------------------------------------

export function createStockAdjustment(input: { date: string; productId: number; physicalQty: number; note?: string }) {
  assertDate(input.date);
  if (!Number.isInteger(input.physicalQty) || input.physicalQty < 0) throw new AppError("Stok fisik harus bilangan bulat ≥ 0.");
  return db.transaction((tx) => {
    const p = tx.select().from(products).where(eq(products.id, input.productId)).get();
    if (!p) throw new AppError("Produk tidak ditemukan.");
    const diff = input.physicalQty - p.stock;
    if (diff === 0) throw new AppError("Stok fisik sama dengan stok sistem, tidak ada penyesuaian.");
    const number = nextNumber(tx, stockAdjustments, "ADJ", input.date);
    const unitCost = p.avgCost;
    let value: number;
    if (diff > 0) value = stockIn(tx, { productId: p.id, qty: diff, unitCost, date: input.date, type: "adjustment", reference: number, note: input.note });
    else value = stockOut(tx, { productId: p.id, qty: -diff, date: input.date, type: "adjustment", reference: number, note: input.note }).cost;

    tx.insert(stockAdjustments)
      .values({ number, date: input.date, productId: p.id, systemQty: p.stock, physicalQty: input.physicalQty, difference: diff, unitCost, value, note: input.note || null })
      .run();

    const inv = accountIdByCode(tx, ACC.INVENTORY);
    const variance = accountIdByCode(tx, ACC.INVENTORY_VARIANCE);
    postJournal(
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

export function createCashTransaction(input: {
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
  return db.transaction((tx) => {
    assertCashAccount(tx, input.cashAccountId);
    const counter = tx.select().from(accounts).where(eq(accounts.id, input.counterAccountId)).get();
    if (!counter) throw new AppError("Akun lawan tidak ditemukan.");
    if (input.type === "transfer") {
      if (!counter.isCash) throw new AppError("Akun tujuan transfer harus akun kas/bank.");
      if (counter.id === input.cashAccountId) throw new AppError("Akun asal dan tujuan tidak boleh sama.");
    } else if (counter.isCash || counter.isSystem) {
      throw new AppError("Akun lawan tidak boleh akun kas/bank atau akun sistem (piutang, hutang, persediaan).");
    }

    const prefix = input.type === "in" ? "CIN" : input.type === "out" ? "COUT" : "TRF";
    const number = nextNumber(tx, cashTransactions, prefix, input.date);
    tx.insert(cashTransactions)
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
    postJournal(tx, { date: input.date, reference: number, description: input.description.trim(), source: "cash" }, lines);
    return { number };
  });
}

// ---------------------------------------------------------------------------
// Saldo awal persediaan (dipakai saat setup / produk baru dengan stok awal)
// ---------------------------------------------------------------------------

export function openingStock(tx: Tx, input: { date: string; productId: number; qty: number; unitCost: number }) {
  const reference = `OPEN-${input.productId}`;
  const value = stockIn(tx, { ...input, type: "opening", reference, note: "Saldo awal" });
  postJournal(
    tx,
    { date: input.date, reference, description: "Saldo awal persediaan", source: "opening" },
    [
      { accountId: accountIdByCode(tx, ACC.INVENTORY), debit: value },
      { accountId: accountIdByCode(tx, ACC.CAPITAL), credit: value },
    ],
  );
}
