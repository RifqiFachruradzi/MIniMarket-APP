/**
 * Menyalin seluruh data dari database lokal (file) ke database online (Turso).
 *
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run db:push [-- --force]
 */
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { copyDatabase, countUsers, TABLES } from "./copy";
import { client as target, databaseUrl, db } from "./index";

const SOURCE = process.env.SOURCE_DATABASE_URL || "file:./data/minimarket.db";

async function main() {
  if (databaseUrl.startsWith("file:")) {
    throw new Error("Set DATABASE_URL ke database tujuan (libsql://...) sebelum menjalankan db:push.");
  }
  await migrate(db, { migrationsFolder: "./drizzle" });
  const force = process.argv.includes("--force");
  if ((await countUsers(target)) > 0 && !force) {
    throw new Error("Database tujuan sudah berisi data. Gunakan --force untuk menimpa.");
  }
  if (force) await target.batch([...TABLES].reverse().map((t) => `DELETE FROM ${t}`), "write");
  await copyDatabase(createClient({ url: SOURCE }), target);
  console.log("Selesai menyalin data ke database online.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
