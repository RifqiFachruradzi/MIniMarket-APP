/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type Client, type InArgs } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = LibSQLDatabase<typeof schema>;

/**
 * DATABASE_URL:
 *  - lokal  : file:./data/minimarket.db (default)
 *  - online : libsql://<nama-db>.turso.io  (+ DATABASE_AUTH_TOKEN)
 * Variabel TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (dari integrasi Vercel × Turso) juga diterima.
 */
export const databaseUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./data/minimarket.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

const globalForDb = globalThis as unknown as { __minimarketClient?: Client; __minimarketDb?: DB };

function createConnection() {
  if (process.env.VERCEL && databaseUrl.startsWith("file:") && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("DATABASE_URL belum diset. Di Vercel, database harus online (Turso: libsql://...). Lihat README bagian Deploy ke Vercel.");
  }
  if (databaseUrl.startsWith("file:")) {
    fs.mkdirSync(path.dirname(path.resolve(databaseUrl.slice(5))), { recursive: true });
  }
  const client = createClient({ url: databaseUrl, authToken });
  return { client, db: drizzle(client, { schema }) };
}

if (!globalForDb.__minimarketDb) {
  const conn = createConnection();
  globalForDb.__minimarketClient = conn.client;
  globalForDb.__minimarketDb = conn.db;
  if (databaseUrl.startsWith("file:")) {
    void conn.client.execute("PRAGMA foreign_keys = ON");
    void conn.client.execute("PRAGMA journal_mode = WAL");
  }
}

export const db = globalForDb.__minimarketDb!;
export const client = globalForDb.__minimarketClient!;
export { schema };

/** Query SQL mentah → array objek biasa (aman dikirim ke Client Component) */
export async function query<T = any>(sql: string, args: InArgs = []): Promise<T[]> {
  const rs = await client.execute({ sql, args });
  return rs.rows.map((row) => Object.fromEntries(rs.columns.map((col, i) => [col, row[i]]))) as T[];
}

export async function queryOne<T = any>(sql: string, args: InArgs = []): Promise<T | undefined> {
  return (await query<T>(sql, args))[0];
}
