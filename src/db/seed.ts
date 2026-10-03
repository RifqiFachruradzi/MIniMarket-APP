import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { ACC } from "@/lib/accounts";
import { addDays, today } from "@/lib/format";
import { accountIdByCode, postJournal } from "@/server/ledger";
import {
  createCashTransaction,
  createGoodsIssue,
  createGoodsReceipt,
  createSale,
  createStockAdjustment,
  openingStock,
  paySupplier,
  receiveCustomerPayment,
} from "@/server/transactions";
import { db } from "./index";
import { accounts, customers, goodsReceipts, products, sales, suppliers, users } from "./schema";

type AccountSeed = typeof accounts.$inferInsert;

const CHART: AccountSeed[] = [
  { code: ACC.CASH, name: "Kas Toko", type: "asset", group: "current", isCash: true, isSystem: true },
  { code: ACC.BANK_BCA, name: "Bank BCA", type: "asset", group: "current", isCash: true, isSystem: true },
  { code: ACC.BANK_MANDIRI, name: "Bank Mandiri", type: "asset", group: "current", isCash: true, isSystem: true },
  { code: ACC.RECEIVABLE, name: "Piutang Usaha", type: "asset", group: "current", isSystem: true },
  { code: ACC.INVENTORY, name: "Persediaan Barang Dagang", type: "asset", group: "current", isSystem: true },
  { code: "1-1600", name: "Sewa Dibayar di Muka", type: "asset", group: "current" },
  { code: ACC.EQUIPMENT, name: "Peralatan Toko", type: "asset", group: "fixed", cashflow: "investing" },
  { code: "1-2200", name: "Kendaraan", type: "asset", group: "fixed", cashflow: "investing" },
  { code: ACC.PAYABLE, name: "Hutang Usaha", type: "liability", group: "current", isSystem: true },
  { code: "2-1200", name: "Hutang Gaji", type: "liability", group: "current" },
  { code: ACC.BANK_LOAN, name: "Hutang Bank", type: "liability", group: "fixed", cashflow: "financing" },
  { code: ACC.CAPITAL, name: "Modal Pemilik", type: "equity", cashflow: "financing" },
  { code: ACC.DRAWING, name: "Prive Pemilik", type: "equity", cashflow: "financing" },
  { code: ACC.SALES, name: "Penjualan", type: "revenue", group: "operating", isSystem: true },
  { code: ACC.OTHER_INCOME, name: "Pendapatan Lain-lain", type: "revenue", group: "other" },
  { code: ACC.COGS, name: "Harga Pokok Penjualan", type: "expense", group: "cogs", isSystem: true },
  { code: ACC.INVENTORY_LOSS, name: "Beban Kerusakan & Kehilangan Barang", type: "expense", group: "operating", isSystem: true },
  { code: ACC.INVENTORY_VARIANCE, name: "Selisih Stock Opname", type: "expense", group: "operating", isSystem: true },
  { code: "6-1100", name: "Beban Gaji Karyawan", type: "expense", group: "operating" },
  { code: "6-1200", name: "Beban Listrik, Air & Internet", type: "expense", group: "operating" },
  { code: "6-1300", name: "Beban Sewa Tempat", type: "expense", group: "operating" },
  { code: "6-1400", name: "Beban Perlengkapan & Kantong Belanja", type: "expense", group: "operating" },
  { code: "6-1500", name: "Beban Transportasi", type: "expense", group: "operating" },
  { code: "6-1900", name: "Beban Operasional Lainnya", type: "expense", group: "operating" },
  { code: "7-1100", name: "Beban Administrasi Bank", type: "expense", group: "other" },
];

const PRODUCTS = [
  ["BRS-001", "Beras Premium 5 kg", "Sembako", "karung", 62000, 72500, 10],
  ["MYK-001", "Minyak Goreng 2 L", "Sembako", "pouch", 31500, 36900, 12],
  ["GUL-001", "Gula Pasir 1 kg", "Sembako", "pak", 15200, 17900, 15],
  ["TLR-001", "Telur Ayam 1 kg", "Sembako", "kg", 25500, 29500, 10],
  ["TPG-001", "Tepung Terigu 1 kg", "Sembako", "pak", 11000, 13500, 10],
  ["MIE-001", "Mie Instan Goreng", "Makanan", "pcs", 2650, 3500, 60],
  ["MIE-002", "Mie Instan Kuah Ayam", "Makanan", "pcs", 2550, 3300, 60],
  ["ROT-001", "Roti Tawar Gandum", "Makanan", "pcs", 14500, 18000, 8],
  ["BSK-001", "Biskuit Kelapa 300 g", "Makanan", "pcs", 9800, 12500, 12],
  ["SNK-001", "Keripik Kentang 68 g", "Makanan", "pcs", 8200, 10500, 15],
  ["AIR-001", "Air Mineral 600 ml", "Minuman", "botol", 2300, 3500, 48],
  ["AIR-002", "Air Mineral 1,5 L", "Minuman", "botol", 4600, 6500, 24],
  ["TEH-001", "Teh Botol 450 ml", "Minuman", "botol", 4200, 5500, 24],
  ["KOP-001", "Kopi Sachet 3in1 (10 pcs)", "Minuman", "renceng", 12800, 15500, 10],
  ["SSU-001", "Susu UHT Cokelat 1 L", "Minuman", "kotak", 16200, 19500, 10],
  ["SBN-001", "Sabun Mandi Batang", "Perawatan Diri", "pcs", 3400, 4500, 20],
  ["SMP-001", "Sampo Sachet (12 pcs)", "Perawatan Diri", "renceng", 10500, 13000, 10],
  ["PGG-001", "Pasta Gigi 190 g", "Perawatan Diri", "pcs", 11200, 14000, 10],
  ["DTJ-001", "Deterjen Bubuk 800 g", "Kebutuhan Rumah", "pak", 18500, 22500, 8],
  ["TIS-001", "Tisu Wajah 250 lembar", "Kebutuhan Rumah", "pak", 12100, 15000, 10],
] as const;

/** PRNG deterministik agar data demo selalu sama */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function main() {
  const minimal = process.argv.includes("--minimal");
  const existing = await db.select().from(users).limit(1).all();
  if (existing.length > 0) {
    console.log("Database sudah berisi data. Seed dilewati.");
    return;
  }

  const rand = rng(20261003);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const end = today();
  const start = addDays(end, -60);

  await db.insert(users)
    .values([
      { name: "Administrator", email: "admin@minimarket.id", passwordHash: bcrypt.hashSync("admin123", 10), role: "admin" },
      { name: "Kasir Toko", email: "kasir@minimarket.id", passwordHash: bcrypt.hashSync("kasir123", 10), role: "kasir" },
    ])
    .run();
  await db.insert(accounts).values(CHART).run();
  if (minimal) {
    console.log("Seed minimal selesai (pengguna & bagan akun).");
    console.log("Login: admin@minimarket.id / admin123 — segera ganti password di database production.");
    return;
  }

  await db.insert(suppliers)
    .values([
      { name: "PT Sumber Pangan Nusantara", phone: "021-5550101", address: "Jl. Industri Raya No. 12, Jakarta" },
      { name: "CV Sinar Distribusi", phone: "021-5550202", address: "Jl. Gatot Subroto No. 88, Tangerang" },
      { name: "PT Segar Minuman Indonesia", phone: "021-5550303", address: "Kawasan Industri Pulogadung, Jakarta" },
      { name: "UD Berkah Rumah Tangga", phone: "0812-7788-9900", address: "Pasar Induk Blok C-21, Bekasi" },
    ])
    .run();
  await db.insert(customers)
    .values([
      { name: "Warung Bu Sari", phone: "0813-1111-2222", address: "Jl. Melati No. 5" },
      { name: "Kantin SMP Harapan", phone: "0813-3333-4444", address: "Jl. Pendidikan No. 2" },
      { name: "Kos Putri Anggrek", phone: "0813-5555-6666", address: "Jl. Anggrek No. 17" },
      { name: "Bapak Hendra", phone: "0813-7777-8888", address: "Perum Griya Asri B-4" },
    ])
    .run();
  await db.insert(products)
    .values(PRODUCTS.map(([sku, name, category, unit, , sellPrice, minStock]) => ({ sku, name, category, unit, sellPrice, minStock })))
    .run();

  // Saldo awal: modal disetor ke kas & bank, peralatan, dan persediaan awal
  await db.transaction(async (tx) => {
    const capital = await accountIdByCode(tx, ACC.CAPITAL);
    await postJournal(
      tx,
      { date: start, reference: "OPEN-CASH", description: "Setoran modal awal", source: "opening" },
      [
        { accountId: await accountIdByCode(tx, ACC.CASH), debit: 15_000_000 },
        { accountId: await accountIdByCode(tx, ACC.BANK_BCA), debit: 60_000_000 },
        { accountId: await accountIdByCode(tx, ACC.BANK_MANDIRI), debit: 25_000_000 },
        { accountId: await accountIdByCode(tx, ACC.EQUIPMENT), debit: 45_000_000 },
        { accountId: capital, credit: 145_000_000 },
      ],
    );
    const all = await tx.select().from(products).all();
    for (const p of all) {
      const def = PRODUCTS.find((d) => d[0] === p.sku)!;
      await openingStock(tx, { date: start, productId: p.id, qty: p.minStock * 6, unitCost: def[4] });
    }
  });

  const productList = await db.select().from(products).all();
  const supplierIds = (await db.select({ id: suppliers.id }).from(suppliers).all()).map((s) => s.id);
  const customerIds = (await db.select({ id: customers.id }).from(customers).all()).map((c) => c.id);
  const accountRows = await db.select({ id: accounts.id, code: accounts.code }).from(accounts).all();
  const acc = (code: string) => accountRows.find((a) => a.code === code)!.id;
  const cashId = acc(ACC.CASH);
  const bcaId = acc(ACC.BANK_BCA);

  for (let d = 1; d <= 60; d++) {
    const date = addDays(start, d);

    // Restock mingguan & ketika stok menipis
    if (d % 4 === 1) {
      const fresh = await db.select().from(products).all();
      const low = fresh.filter((p) => p.stock <= Math.max(p.minStock * 3, 45));
      if (low.length > 0) {
        const items = low.map((p) => {
          const def = PRODUCTS.find((x) => x[0] === p.sku)!;
          const cost = Math.round(def[4] * (0.98 + rand() * 0.06));
          return { productId: p.id, qty: Math.max(p.minStock * 5, 60), unitCost: cost };
        });
        await createGoodsReceipt({
          date,
          supplierId: pick(supplierIds),
          supplierInvoice: `SI-${1000 + d}`,
          dueDate: addDays(date, 30),
          items,
          payNowAccountId: rand() < 0.3 ? bcaId : null,
        });
      }
    }

    // Penjualan harian
    const txCount = 25 + Math.floor(rand() * 15);
    for (let i = 0; i < txCount; i++) {
      const fresh = await db.select().from(products).all();
      const itemCount = 1 + Math.floor(rand() * 5);
      const chosen = new Map<number, number>();
      for (let k = 0; k < itemCount; k++) {
        const p = pick(fresh);
        const qty = 1 + Math.floor(rand() * 3);
        if (p.stock - (chosen.get(p.id) ?? 0) >= qty) chosen.set(p.id, (chosen.get(p.id) ?? 0) + qty);
      }
      if (chosen.size === 0) continue;
      const items = [...chosen].map(([productId, qty]) => ({ productId, qty }));
      const credit = rand() < 0.08;
      await createSale({
        date,
        paymentType: credit ? "credit" : "cash",
        customerId: credit ? pick(customerIds) : null,
        cashAccountId: rand() < 0.75 ? cashId : bcaId,
        userId: 2,
        items,
      });
    }

    // Beban operasional mengikuti tanggal kalender
    const dom = Number(date.slice(8, 10));
    if (dom === 25) {
      await createCashTransaction({ date, type: "out", cashAccountId: bcaId, counterAccountId: acc("6-1100"), amount: 6_000_000, description: "Gaji karyawan bulanan" });
      await createCashTransaction({ date, type: "out", cashAccountId: bcaId, counterAccountId: acc("6-1300"), amount: 3_000_000, description: "Sewa ruko bulanan" });
    }
    if (dom === 10) {
      await createCashTransaction({ date, type: "out", cashAccountId: bcaId, counterAccountId: acc("6-1200"), amount: 1_250_000 + Math.round(rand() * 200_000), description: "Tagihan listrik, air & internet" });
      await createCashTransaction({ date, type: "out", cashAccountId: bcaId, counterAccountId: acc("7-1100"), amount: 15_000, description: "Biaya administrasi bank" });
    }
    if (d === 58) {
      await createCashTransaction({ date, type: "out", cashAccountId: bcaId, counterAccountId: acc(ACC.EQUIPMENT), amount: 8_500_000, description: "Pembelian freezer display minuman" });
    }
    if (d === 59) {
      await createCashTransaction({ date, type: "out", cashAccountId: cashId, counterAccountId: acc(ACC.DRAWING), amount: 2_000_000, description: "Prive pemilik" });
    }
    if (d % 10 === 3) {
      await createCashTransaction({ date, type: "out", cashAccountId: cashId, counterAccountId: acc("6-1400"), amount: 150_000 + Math.round(rand() * 100_000), description: "Pembelian kantong plastik & perlengkapan" });
    }
    if (d % 7 === 6) {
      await createCashTransaction({ date, type: "transfer", cashAccountId: cashId, counterAccountId: bcaId, amount: 15_000_000, description: "Setor kas toko ke Bank BCA" });
    }

    // Pelunasan piutang & hutang
    if (d % 5 === 0) {
      const openSales = (await db.select().from(sales).where(eq(sales.paymentType, "credit")).all()).filter((s) => s.status !== "paid");
      for (const s of openSales.slice(0, 2)) {
        await receiveCustomerPayment({ date, saleId: s.id, cashAccountId: cashId, amount: s.total - s.amountPaid });
      }
    }
    if (d % 14 === 0) {
      const openReceipts = (await db.select().from(goodsReceipts).all()).filter((r) => r.status !== "paid" && r.date <= addDays(date, -10));
      for (const r of openReceipts) {
        const outstanding = r.total - r.amountPaid;
        await paySupplier({ date, receiptId: r.id, cashAccountId: bcaId, amount: rand() < 0.7 ? outstanding : Math.round(outstanding / 2) });
      }
    }

    // Pengeluaran barang & stock opname
    if (d % 15 === 8) {
      const p = pick((await db.select().from(products).all()).filter((x) => x.stock > 5));
      await createGoodsIssue({ date, reason: pick(["Rusak", "Kedaluwarsa"] as const), note: "Ditemukan saat pengecekan rak", items: [{ productId: p.id, qty: 2 }] });
    }
    if (d === 45) {
      const p = productList[5];
      const current = (await db.select().from(products).where(eq(products.id, p.id)).get())!;
      await createStockAdjustment({ date, productId: p.id, physicalQty: Math.max(current.stock - 3, 0), note: "Stock opname bulanan" });
    }
  }

  console.log("Seed selesai.");
  console.log("Login: admin@minimarket.id / admin123  atau  kasir@minimarket.id / kasir123");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
