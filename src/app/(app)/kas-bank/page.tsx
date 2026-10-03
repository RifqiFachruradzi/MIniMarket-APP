import clsx from "clsx";
import Link from "next/link";
import { Landmark, Wallet } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { PrintButton } from "@/components/print-button";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { accounting, formatDate, rupiah, startOfMonth, today } from "@/lib/format";
import { cashBalances, cashLedger } from "@/server/reports";
import { CashForm } from "./cash-form";

export const metadata = { title: "Kas & Bank" };

export default async function CashBankPage({ searchParams }: { searchParams: Promise<{ account?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const balances = await cashBalances();
  const selected = balances.find((b) => b.id === Number(sp.account)) ?? balances[0];
  const from = sp.from || startOfMonth();
  const to = sp.to || today();
  const ledger = selected ? await cashLedger(selected.id, from, to) : null;
  const all = await db.select({ id: accounts.id, code: accounts.code, name: accounts.name, type: accounts.type, isCash: accounts.isCash, isSystem: accounts.isSystem }).from(accounts).orderBy(asc(accounts.code)).all();
  const cashAccounts = all.filter((a) => a.isCash);
  const counterAccounts = all.filter((a) => !a.isCash && !a.isSystem);
  const total = balances.reduce((s, b) => s + b.balance, 0);

  return (
    <>
      <PageHeader title="Kas & Bank" description="Saldo kas toko dan rekening bank, transaksi kas masuk/keluar, serta transfer antar akun." actions={<PrintButton label="Cetak Mutasi" />} />

      <div className="no-print mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card bg-zinc-900 p-5 text-white">
          <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Total Kas & Bank</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{rupiah(total)}</p>
          <p className="mt-1 text-xs text-zinc-400">{balances.length} akun</p>
        </div>
        {balances.map((b) => (
          <Link
            key={b.id}
            href={`/kas-bank?account=${b.id}&from=${from}&to=${to}`}
            className={clsx("card p-5 transition hover:border-zinc-400", selected?.id === b.id && "border-zinc-900 ring-1 ring-zinc-900")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{b.name}</p>
              {b.code === "1-1100" ? <Wallet className="size-4 text-zinc-400" /> : <Landmark className="size-4 text-zinc-400" />}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{rupiah(b.balance)}</p>
            <p className="mt-1 text-xs text-zinc-500">{b.code}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card title="Transaksi Kas Baru" className="no-print h-fit">
          <CashForm cashAccounts={cashAccounts} counterAccounts={counterAccounts} today={today()} />
        </Card>

        <Card
          title={`Mutasi ${selected?.name ?? ""}`}
          description={`${formatDate(from)} – ${formatDate(to)}`}
          bodyClassName="p-0"
          actions={
            <form method="get" className="no-print flex items-center gap-2">
              <input type="hidden" name="account" value={selected?.id} />
              <input type="date" name="from" defaultValue={from} className="input w-36 py-1.5 text-xs" />
              <input type="date" name="to" defaultValue={to} className="input w-36 py-1.5 text-xs" />
              <button className="btn-secondary py-1.5 text-xs">Terapkan</button>
            </form>
          }
        >
          {!ledger ? (
            <EmptyState title="Belum ada akun kas" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Referensi</th>
                    <th>Keterangan</th>
                    <th className="num">Masuk</th>
                    <th className="num">Keluar</th>
                    <th className="num">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-zinc-50/60">
                    <td colSpan={5} className="font-medium text-zinc-600">
                      Saldo awal
                    </td>
                    <td className="num font-medium">{accounting(ledger.opening)}</td>
                  </tr>
                  {ledger.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap text-zinc-500">{formatDate(r.date)}</td>
                      <td className="font-mono text-xs whitespace-nowrap">{r.reference}</td>
                      <td>{r.description}</td>
                      <td className="num text-emerald-700">{r.debit ? accounting(r.debit) : ""}</td>
                      <td className="num text-rose-700">{r.credit ? accounting(r.credit) : ""}</td>
                      <td className="num font-medium">{accounting(r.balance)}</td>
                    </tr>
                  ))}
                  {ledger.rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        Tidak ada mutasi pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Saldo akhir</td>
                    <td className="num text-emerald-700">{accounting(ledger.rows.reduce((s, r) => s + r.debit, 0))}</td>
                    <td className="num text-rose-700">{accounting(ledger.rows.reduce((s, r) => s + r.credit, 0))}</td>
                    <td className="num">{accounting(ledger.closing)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
