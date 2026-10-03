import { and, eq, like, sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { DB } from "@/db";
import { accounts, journalEntries, journalLines } from "@/db/schema";
import { AppError } from "@/lib/errors";

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export type JournalLineInput = { accountId: number; debit?: number; credit?: number };

export async function accountIdByCode(tx: Tx, code: string): Promise<number> {
  const row = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, code)).get();
  if (!row) throw new AppError(`Akun ${code} tidak ditemukan. Jalankan "npm run setup".`);
  return row.id;
}

export async function assertCashAccount(tx: Tx, id: number) {
  const row = await tx.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.isCash, true))).get();
  if (!row) throw new AppError("Akun kas/bank tidak valid.");
  return row;
}

/** Membuat jurnal double-entry. Total debit wajib sama dengan total kredit. */
export async function postJournal(
  tx: Tx,
  entry: { date: string; reference: string; description: string; source: string },
  lines: JournalLineInput[],
) {
  const clean = lines
    .map((l) => ({ accountId: l.accountId, debit: Math.round(l.debit ?? 0), credit: Math.round(l.credit ?? 0) }))
    .filter((l) => l.debit !== 0 || l.credit !== 0);
  const debit = clean.reduce((s, l) => s + l.debit, 0);
  const credit = clean.reduce((s, l) => s + l.credit, 0);
  if (debit !== credit) throw new AppError(`Jurnal tidak seimbang (D ${debit} / K ${credit}).`);
  if (clean.length === 0) return null;

  const created = await tx.insert(journalEntries).values(entry).returning({ id: journalEntries.id }).get();
  await tx
    .insert(journalLines)
    .values(clean.map((l) => ({ ...l, entryId: created.id })))
    .run();
  return created.id;
}

/** Penomoran dokumen: PREFIX-YYYYMM-0001 */
export async function nextNumber(tx: Tx, table: SQLiteTable & { number: SQLiteColumn }, prefix: string, date: string) {
  const base = `${prefix}-${date.slice(0, 4)}${date.slice(5, 7)}-`;
  const row = await tx
    .select({ max: sql<string | null>`max(${table.number})` })
    .from(table)
    .where(like(table.number, `${base}%`))
    .get();
  const last = row?.max ? Number(row.max.slice(base.length)) : 0;
  return `${base}${String(last + 1).padStart(4, "0")}`;
}
