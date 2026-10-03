import type { Client, InStatement } from "@libsql/client";

// Urutan mengikuti foreign key
export const TABLES = [
  "users",
  "accounts",
  "suppliers",
  "customers",
  "products",
  "journal_entries",
  "journal_lines",
  "stock_movements",
  "sales",
  "sale_items",
  "customer_payments",
  "goods_receipts",
  "goods_receipt_items",
  "supplier_payments",
  "goods_issues",
  "goods_issue_items",
  "stock_adjustments",
  "cash_transactions",
];

export async function countUsers(client: Client) {
  const rs = await client.execute("SELECT COUNT(*) AS c FROM users");
  return Number(rs.rows[0].c);
}

/** Menyalin seluruh baris dari `source` ke `target` secara batch (cepat untuk database online). */
export async function copyDatabase(source: Client, target: Client, log = console.log) {
  for (const table of TABLES) {
    const rs = await source.execute(`SELECT * FROM ${table}`);
    const cols = rs.columns;
    const statements: InStatement[] = [];
    const ROWS_PER_INSERT = 100;
    for (let i = 0; i < rs.rows.length; i += ROWS_PER_INSERT) {
      const chunk = rs.rows.slice(i, i + ROWS_PER_INSERT);
      const placeholders = chunk.map(() => `(${cols.map(() => "?").join(",")})`).join(",");
      statements.push({
        sql: `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(",")}) VALUES ${placeholders}`,
        args: chunk.flatMap((row) => cols.map((_, j) => row[j])),
      });
    }
    for (let i = 0; i < statements.length; i += 50) {
      await target.batch(statements.slice(i, i + 50), "write");
    }
    log(`  ${table.padEnd(22)} ${rs.rows.length} baris`);
  }
}
