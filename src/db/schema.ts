import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Semua nilai uang disimpan sebagai integer Rupiah (tanpa desimal).
 * Semua tanggal transaksi disimpan sebagai teks ISO "YYYY-MM-DD".
 */

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "kasir"] }).notNull().default("admin"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Bagan akun (Chart of Accounts) & jurnal umum
// ---------------------------------------------------------------------------

export const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type", { enum: ACCOUNT_TYPES }).notNull(),
  /** Pengelompokan laporan laba rugi: cogs | operating | other */
  group: text("report_group", { enum: ["current", "fixed", "cogs", "operating", "other"] }),
  /** Klasifikasi laporan arus kas untuk lawan akun kas */
  cashflow: text("cashflow", { enum: ["operating", "investing", "financing"] })
    .notNull()
    .default("operating"),
  isCash: integer("is_cash", { mode: "boolean" }).notNull().default(false),
  /** Akun sistem dipakai otomatis oleh modul (piutang, hutang, persediaan, dst.) */
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    reference: text("reference").notNull(),
    description: text("description").notNull(),
    source: text("source").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("journal_entries_date_idx").on(t.date)],
);

export const journalLines = sqliteTable(
  "journal_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryId: integer("entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    debit: integer("debit").notNull().default(0),
    credit: integer("credit").notNull().default(0),
  },
  (t) => [index("journal_lines_entry_idx").on(t.entryId), index("journal_lines_account_idx").on(t.accountId)],
);

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: createdAt(),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: createdAt(),
});

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    name: text("name").notNull(),
    category: text("category").notNull().default("Umum"),
    unit: text("unit").notNull().default("pcs"),
    /** Harga pokok rata-rata tertimbang (moving average) */
    avgCost: integer("avg_cost").notNull().default(0),
    /** Nilai persediaan (Rupiah) — selalu sama dengan saldo akun persediaan untuk produk ini */
    stockValue: integer("stock_value").notNull().default(0),
    sellPrice: integer("sell_price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("products_sku_idx").on(t.sku)],
);

/** Kartu stok: setiap mutasi masuk/keluar barang */
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    date: text("date").notNull(),
    type: text("type", {
      enum: ["opening", "receipt", "sale", "issue", "adjustment"],
    }).notNull(),
    reference: text("reference").notNull(),
    qtyIn: integer("qty_in").notNull().default(0),
    qtyOut: integer("qty_out").notNull().default(0),
    unitCost: integer("unit_cost").notNull().default(0),
    balance: integer("balance").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId, t.date)],
);

// ---------------------------------------------------------------------------
// Penjualan & penerimaan pembayaran (piutang)
// ---------------------------------------------------------------------------

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull().unique(),
    date: text("date").notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    paymentType: text("payment_type", { enum: ["cash", "credit"] }).notNull(),
    cashAccountId: integer("cash_account_id").references(() => accounts.id),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    cogs: integer("cogs").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    tendered: integer("tendered").notNull().default(0),
    status: text("status", { enum: ["paid", "partial", "unpaid"] }).notNull(),
    note: text("note"),
    userId: integer("user_id").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("sales_date_idx").on(t.date)],
);

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: integer("qty").notNull(),
  price: integer("price").notNull(),
  unitCost: integer("unit_cost").notNull(),
  subtotal: integer("subtotal").notNull(),
});

export const customerPayments = sqliteTable("customer_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  date: text("date").notNull(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id),
  customerId: integer("customer_id").references(() => customers.id),
  cashAccountId: integer("cash_account_id")
    .notNull()
    .references(() => accounts.id),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Penerimaan barang (pembelian) & pembayaran pemasok (hutang)
// ---------------------------------------------------------------------------

export const goodsReceipts = sqliteTable(
  "goods_receipts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull().unique(),
    date: text("date").notNull(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    supplierInvoice: text("supplier_invoice"),
    dueDate: text("due_date"),
    total: integer("total").notNull(),
    amountPaid: integer("amount_paid").notNull().default(0),
    status: text("status", { enum: ["paid", "partial", "unpaid"] }).notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("goods_receipts_date_idx").on(t.date)],
);

export const goodsReceiptItems = sqliteTable("goods_receipt_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => goodsReceipts.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: integer("qty").notNull(),
  unitCost: integer("unit_cost").notNull(),
  subtotal: integer("subtotal").notNull(),
});

export const supplierPayments = sqliteTable("supplier_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  date: text("date").notNull(),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => goodsReceipts.id),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  cashAccountId: integer("cash_account_id")
    .notNull()
    .references(() => accounts.id),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Pengeluaran barang (non-penjualan) & stock opname
// ---------------------------------------------------------------------------

export const ISSUE_REASONS = ["Rusak", "Kedaluwarsa", "Hilang", "Pemakaian Internal", "Retur ke Pemasok"] as const;

export const goodsIssues = sqliteTable("goods_issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
  totalCost: integer("total_cost").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

export const goodsIssueItems = sqliteTable("goods_issue_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issueId: integer("issue_id")
    .notNull()
    .references(() => goodsIssues.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: integer("qty").notNull(),
  unitCost: integer("unit_cost").notNull(),
  subtotal: integer("subtotal").notNull(),
});

export const stockAdjustments = sqliteTable("stock_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  date: text("date").notNull(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  systemQty: integer("system_qty").notNull(),
  physicalQty: integer("physical_qty").notNull(),
  difference: integer("difference").notNull(),
  unitCost: integer("unit_cost").notNull(),
  value: integer("value").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Kas & bank (transaksi kas masuk / keluar / transfer)
// ---------------------------------------------------------------------------

export const cashTransactions = sqliteTable(
  "cash_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull().unique(),
    date: text("date").notNull(),
    type: text("type", { enum: ["in", "out", "transfer"] }).notNull(),
    cashAccountId: integer("cash_account_id")
      .notNull()
      .references(() => accounts.id),
    /** Lawan akun (pendapatan/beban/modal) untuk kas masuk/keluar, atau akun kas tujuan untuk transfer */
    counterAccountId: integer("counter_account_id")
      .notNull()
      .references(() => accounts.id),
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("cash_transactions_date_idx").on(t.date)],
);

export type Product = typeof products.$inferSelect;
export type Account = typeof accounts.$inferSelect;
