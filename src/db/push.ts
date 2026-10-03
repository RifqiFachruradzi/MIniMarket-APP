/**
 * Menyalin seluruh data dari database lokal (file) ke database tujuan (DATABASE_URL, mis. Turso).
 * Dipakai untuk mengunggah data demo hasil `npm run setup` ke database online secara cepat (batch).
 *
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run db:push
 */
import { createClient, type InStatement } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { client as target, databaseUrl, db } from "./index";

const SOURCE = process.env.SOURCE_DATABASE_URL || "file:./data/minimarket.db";

// Urutan mengikuti foreign key
const TABLES = [
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

async function main() {
  if (databaseUrl === SOURCE || databaseUrl.startsWith("file:")) {
    throw new Error("Set DATABASE_URL ke database tujuan (libsql://...) sebelum menjalankan db:push.");
  }
  const source = createClient({ url: SOURCE });

  await migrate(db, { migrationsFolder: "./drizzle" });
  const existing = await target.execute("SELECT COUNT(*) AS c FROM users");
  if (Number(existing.rows[0].c) > 0 && !process.argv.includes("--force")) {
    throw new Error("Database tujuan sudah berisi data. Gunakan --force untuk menimpa.");
  }
  if (process.argv.includes("--force")) {
    await target.batch([...TABLES].reverse().map((t) => `DELETE FROM ${t}`), "write");
  }

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
    console.log(`${table.padEnd(22)} ${rs.rows.length} baris`);
  }
  console.log("Selesai menyalin data ke database online.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
