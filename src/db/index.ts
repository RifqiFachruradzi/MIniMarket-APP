import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __minimarketDb?: DB; __minimarketSqlite?: Database.Database };

function createConnection() {
  const file = path.resolve(process.env.DATABASE_PATH ?? "./data/minimarket.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

if (!globalForDb.__minimarketDb) {
  const conn = createConnection();
  globalForDb.__minimarketDb = conn.db;
  globalForDb.__minimarketSqlite = conn.sqlite;
}

export const db = globalForDb.__minimarketDb!;
export const sqlite = globalForDb.__minimarketSqlite!;
export { schema };
