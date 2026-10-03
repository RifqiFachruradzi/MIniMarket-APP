import { sqlite } from "@/db";

type AccountBalanceRow = {
  id: number;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  group: string | null;
  cashflow: "operating" | "investing" | "financing";
  isCash: number;
  debit: number;
  credit: number;
};

export type ReportLine = { code: string; name: string; amount: number };
export type ReportSection = { title: string; lines: ReportLine[]; total: number };

/** Saldo debit/kredit per akun untuk rentang tanggal (inklusif). */
function accountBalances(from: string | null, to: string): AccountBalanceRow[] {
  return sqlite
    .prepare(
      `SELECT a.id, a.code, a.name, a.type, a.report_group AS "group", a.cashflow, a.is_cash AS isCash,
              COALESCE(b.debit, 0) AS debit, COALESCE(b.credit, 0) AS credit
         FROM accounts a
         LEFT JOIN (
              SELECT l.account_id, SUM(l.debit) AS debit, SUM(l.credit) AS credit
                FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
               WHERE e.date <= @to AND (@from IS NULL OR e.date >= @from)
               GROUP BY l.account_id
         ) b ON b.account_id = a.id
        ORDER BY a.code`,
    )
    .all({ from, to }) as AccountBalanceRow[];
}

/** Saldo normal: aset & beban bertambah di debit; kewajiban, ekuitas, pendapatan di kredit. */
function normalBalance(r: AccountBalanceRow) {
  return r.type === "asset" || r.type === "expense" ? r.debit - r.credit : r.credit - r.debit;
}

function section(title: string, rows: AccountBalanceRow[], hideZero = true): ReportSection {
  const lines = rows
    .map((r) => ({ code: r.code, name: r.name, amount: normalBalance(r) }))
    .filter((l) => !hideZero || l.amount !== 0);
  return { title, lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

// ---------------------------------------------------------------------------
// Laporan Laba Rugi
// ---------------------------------------------------------------------------

export function incomeStatement(from: string, to: string) {
  const rows = accountBalances(from, to);
  const revenue = section("Pendapatan Usaha", rows.filter((r) => r.type === "revenue" && r.group !== "other"));
  const cogs = section("Harga Pokok Penjualan", rows.filter((r) => r.type === "expense" && r.group === "cogs"));
  const grossProfit = revenue.total - cogs.total;
  const operating = section("Beban Operasional", rows.filter((r) => r.type === "expense" && r.group === "operating"));
  const operatingIncome = grossProfit - operating.total;
  const otherIncome = section("Pendapatan Lain-lain", rows.filter((r) => r.type === "revenue" && r.group === "other"));
  const otherExpense = section("Beban Lain-lain", rows.filter((r) => r.type === "expense" && (r.group === "other" || r.group === null)));
  const netIncome = operatingIncome + otherIncome.total - otherExpense.total;
  return { revenue, cogs, grossProfit, operating, operatingIncome, otherIncome, otherExpense, netIncome };
}

// ---------------------------------------------------------------------------
// Neraca (Balance Sheet)
// ---------------------------------------------------------------------------

export function balanceSheet(asOf: string) {
  const rows = accountBalances(null, asOf);
  const currentAssets = section("Aset Lancar", rows.filter((r) => r.type === "asset" && r.group !== "fixed"));
  const fixedAssets = section("Aset Tetap", rows.filter((r) => r.type === "asset" && r.group === "fixed"));
  const totalAssets = currentAssets.total + fixedAssets.total;

  const liabilities = section("Kewajiban", rows.filter((r) => r.type === "liability"));
  const equity = section("Ekuitas", rows.filter((r) => r.type === "equity"));

  // Laba berjalan = akumulasi pendapatan - beban (tanpa jurnal penutup)
  const yearStart = `${asOf.slice(0, 4)}-01-01`;
  const currentYear = accountBalances(yearStart, asOf);
  const sumPL = (rs: AccountBalanceRow[]) =>
    rs.filter((r) => r.type === "revenue").reduce((s, r) => s + normalBalance(r), 0) -
    rs.filter((r) => r.type === "expense").reduce((s, r) => s + normalBalance(r), 0);
  const currentEarnings = sumPL(currentYear);
  const priorEarnings = sumPL(rows) - currentEarnings;

  if (priorEarnings !== 0) equity.lines.push({ code: "", name: "Laba Ditahan Tahun Lalu", amount: priorEarnings });
  equity.lines.push({ code: "", name: "Laba Tahun Berjalan", amount: currentEarnings });
  equity.total += priorEarnings + currentEarnings;

  const totalLiabilitiesEquity = liabilities.total + equity.total;
  return { currentAssets, fixedAssets, totalAssets, liabilities, equity, totalLiabilitiesEquity, balanced: totalAssets === totalLiabilitiesEquity };
}

// ---------------------------------------------------------------------------
// Laporan Arus Kas (metode langsung)
// ---------------------------------------------------------------------------

const CASHFLOW_NAMES: Record<string, { in: string; out: string }> = {
  "4-1100": { in: "Penerimaan kas dari penjualan tunai", out: "Retur penjualan tunai" },
  "1-1400": { in: "Penerimaan pelunasan piutang pelanggan", out: "Pemberian piutang" },
  "2-1100": { in: "Penerimaan dari pemasok", out: "Pembayaran kepada pemasok" },
  "3-1100": { in: "Setoran modal pemilik", out: "Penarikan modal" },
  "3-1200": { in: "Pengembalian prive", out: "Prive pemilik" },
};

export function cashFlow(from: string, to: string) {
  const opening = sqlite
    .prepare(
      `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS v
         FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id JOIN accounts a ON a.id = l.account_id
        WHERE a.is_cash = 1 AND e.date < ?`,
    )
    .get(from) as { v: number };

  // Untuk setiap jurnal yang melibatkan akun kas, dampak kas dari lawan akun = kredit - debit
  const rows = sqlite
    .prepare(
      `SELECT a.code, a.name, a.cashflow, SUM(l.credit - l.debit) AS amount
         FROM journal_lines l
         JOIN journal_entries e ON e.id = l.entry_id
         JOIN accounts a ON a.id = l.account_id
        WHERE e.date BETWEEN @from AND @to
          AND a.is_cash = 0
          AND EXISTS (SELECT 1 FROM journal_lines c JOIN accounts ca ON ca.id = c.account_id
                       WHERE c.entry_id = e.id AND ca.is_cash = 1)
        GROUP BY a.id
        HAVING amount <> 0
        ORDER BY a.code`,
    )
    .all({ from, to }) as { code: string; name: string; cashflow: string; amount: number }[];

  const build = (category: string, title: string): ReportSection => {
    const lines = rows
      .filter((r) => r.cashflow === category)
      .map((r) => {
        const label = CASHFLOW_NAMES[r.code];
        const name = label ? (r.amount >= 0 ? label.in : label.out) : r.amount >= 0 ? `Penerimaan ${r.name}` : `Pembayaran ${r.name}`;
        return { code: r.code, name, amount: r.amount };
      });
    return { title, lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  };

  const operating = build("operating", "Arus Kas dari Aktivitas Operasi");
  const investing = build("investing", "Arus Kas dari Aktivitas Investasi");
  const financing = build("financing", "Arus Kas dari Aktivitas Pendanaan");
  const netChange = operating.total + investing.total + financing.total;
  return { opening: opening.v, operating, investing, financing, netChange, closing: opening.v + netChange };
}

// ---------------------------------------------------------------------------
// Saldo kas & bank
// ---------------------------------------------------------------------------

export function cashBalances(asOf?: string) {
  return sqlite
    .prepare(
      `SELECT a.id, a.code, a.name,
              COALESCE((SELECT SUM(l.debit - l.credit) FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
                         WHERE l.account_id = a.id AND (@asOf IS NULL OR e.date <= @asOf)), 0) AS balance
         FROM accounts a WHERE a.is_cash = 1 ORDER BY a.code`,
    )
    .all({ asOf: asOf ?? null }) as { id: number; code: string; name: string; balance: number }[];
}

/** Mutasi rekening untuk satu akun kas/bank */
export function cashLedger(accountId: number, from: string, to: string) {
  const opening = sqlite
    .prepare(
      `SELECT COALESCE(SUM(l.debit - l.credit), 0) AS v FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
        WHERE l.account_id = ? AND e.date < ?`,
    )
    .get(accountId, from) as { v: number };
  const rows = sqlite
    .prepare(
      `SELECT e.id, e.date, e.reference, e.description, l.debit, l.credit
         FROM journal_lines l JOIN journal_entries e ON e.id = l.entry_id
        WHERE l.account_id = ? AND e.date BETWEEN ? AND ?
        ORDER BY e.date, e.id`,
    )
    .all(accountId, from, to) as { id: number; date: string; reference: string; description: string; debit: number; credit: number }[];
  let running = opening.v;
  return {
    opening: opening.v,
    rows: rows.map((r) => {
      running += r.debit - r.credit;
      return { ...r, balance: running };
    }),
    closing: running,
  };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function dashboardSummary(today: string) {
  const month = today.slice(0, 7);
  const salesToday = sqlite
    .prepare(`SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM sales WHERE date = ?`)
    .get(today) as { total: number; count: number };
  const salesMonth = sqlite
    .prepare(`SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(cogs),0) AS cogs, COUNT(*) AS count FROM sales WHERE substr(date,1,7) = ?`)
    .get(month) as { total: number; cogs: number; count: number };
  const receivable = sqlite.prepare(`SELECT COALESCE(SUM(total - amount_paid),0) AS v FROM sales WHERE status <> 'paid'`).get() as { v: number };
  const payable = sqlite.prepare(`SELECT COALESCE(SUM(total - amount_paid),0) AS v FROM goods_receipts WHERE status <> 'paid'`).get() as { v: number };
  const inventory = sqlite.prepare(`SELECT COALESCE(SUM(stock_value),0) AS value, COUNT(*) AS count FROM products`).get() as {
    value: number;
    count: number;
  };
  const lowStock = sqlite
    .prepare(`SELECT id, sku, name, unit, stock, min_stock AS minStock FROM products WHERE is_active = 1 AND stock <= min_stock ORDER BY stock ASC LIMIT 6`)
    .all() as { id: number; sku: string; name: string; unit: string; stock: number; minStock: number }[];
  const lowStockCount = sqlite.prepare(`SELECT COUNT(*) AS c FROM products WHERE is_active = 1 AND stock <= min_stock`).get() as { c: number };
  const topProducts = sqlite
    .prepare(
      `SELECT p.name, SUM(i.qty) AS qty, SUM(i.subtotal) AS revenue
         FROM sale_items i JOIN sales s ON s.id = i.sale_id JOIN products p ON p.id = i.product_id
        WHERE substr(s.date,1,7) = ? GROUP BY p.id ORDER BY revenue DESC LIMIT 5`,
    )
    .all(month) as { name: string; qty: number; revenue: number }[];
  const recentSales = sqlite
    .prepare(
      `SELECT s.id, s.number, s.date, s.total, s.status, s.payment_type AS paymentType, c.name AS customer
         FROM sales s LEFT JOIN customers c ON c.id = s.customer_id ORDER BY s.id DESC LIMIT 6`,
    )
    .all() as { id: number; number: string; date: string; total: number; status: string; paymentType: string; customer: string | null }[];
  return { salesToday, salesMonth, receivable: receivable.v, payable: payable.v, inventory, lowStock, lowStockCount: lowStockCount.c, topProducts, recentSales };
}

export function dailySales(from: string, to: string) {
  return sqlite
    .prepare(`SELECT date, SUM(total) AS total, SUM(cogs) AS cogs FROM sales WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`)
    .all(from, to) as { date: string; total: number; cogs: number }[];
}
