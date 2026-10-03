import { Search } from "lucide-react";
import { sqlite } from "@/db";
import { PAGE_SIZE, Pagination, pageParam } from "@/components/pagination";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { accounting, formatDate, startOfMonth, today } from "@/lib/format";

export const metadata = { title: "Jurnal Umum" };

const SOURCE_LABEL: Record<string, string> = {
  sale: "Penjualan",
  sale_cogs: "HPP",
  customer_payment: "Penerimaan",
  goods_receipt: "Pembelian",
  supplier_payment: "Pembayaran",
  goods_issue: "Pengeluaran",
  stock_adjustment: "Opname",
  cash: "Kas & Bank",
  opening: "Saldo Awal",
};

type SP = { from?: string; to?: string; ref?: string; source?: string; page?: string };

export default async function JournalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const byRef = Boolean(sp.ref);
  const from = sp.from || (byRef ? "0000-01-01" : startOfMonth());
  const to = sp.to || today();
  const page = pageParam(sp.page);
  const where = ["e.date BETWEEN @from AND @to"];
  const params: Record<string, string> = { from, to };
  if (sp.ref) {
    where.push("(e.reference LIKE @ref OR e.description LIKE @ref)");
    params.ref = `%${sp.ref}%`;
  }
  if (sp.source) {
    where.push("e.source = @source");
    params.source = sp.source;
  }
  const w = where.join(" AND ");
  const count = (sqlite.prepare(`SELECT COUNT(*) AS c FROM journal_entries e WHERE ${w}`).get(params) as { c: number }).c;
  const entries = sqlite
    .prepare(`SELECT e.* FROM journal_entries e WHERE ${w} ORDER BY e.date DESC, e.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`)
    .all(params) as { id: number; date: string; reference: string; description: string; source: string }[];
  const ids = entries.map((e) => e.id);
  const lines = ids.length
    ? (sqlite
        .prepare(
          `SELECT l.entry_id AS entryId, l.debit, l.credit, a.code, a.name FROM journal_lines l JOIN accounts a ON a.id = l.account_id
            WHERE l.entry_id IN (${ids.map(() => "?").join(",")}) ORDER BY l.entry_id, l.credit > 0, l.id`,
        )
        .all(...ids) as { entryId: number; debit: number; credit: number; code: string; name: string }[])
    : [];

  return (
    <>
      <PageHeader title="Jurnal Umum" description="Seluruh jurnal double-entry yang dibuat otomatis oleh setiap transaksi." />
      <Card bodyClassName="p-0">
        <form method="get" className="flex flex-col gap-2 border-b border-zinc-200 p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="ref" defaultValue={sp.ref} placeholder="Cari referensi atau keterangan..." className="input pl-9" />
          </div>
          <select name="source" defaultValue={sp.source ?? ""} className="input lg:w-44">
            <option value="">Semua sumber</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={byRef && !sp.from ? "" : from} className="input lg:w-40" />
          <input type="date" name="to" defaultValue={to} className="input lg:w-40" />
          <button className="btn-secondary">Filter</button>
        </form>
        {entries.length === 0 ? (
          <EmptyState title="Tidak ada jurnal" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-28">Tanggal</th>
                  <th>Akun</th>
                  <th className="num w-36">Debit</th>
                  <th className="num w-36">Kredit</th>
                </tr>
              </thead>
              {entries.map((e) => (
                <tbody key={e.id} className="border-b border-zinc-200">
                  <tr className="bg-zinc-50/70">
                    <td className="text-xs whitespace-nowrap text-zinc-500">{formatDate(e.date)}</td>
                    <td colSpan={3}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium">{e.reference}</span>
                        <Badge>{SOURCE_LABEL[e.source] ?? e.source}</Badge>
                        <span className="text-zinc-600">{e.description}</span>
                      </div>
                    </td>
                  </tr>
                  {lines
                    .filter((l) => l.entryId === e.id)
                    .map((l, i) => (
                      <tr key={i}>
                        <td />
                        <td className={l.credit > 0 ? "pl-10" : ""}>
                          <span className="mr-2 font-mono text-xs text-zinc-400">{l.code}</span>
                          {l.name}
                        </td>
                        <td className="num">{l.debit ? accounting(l.debit) : ""}</td>
                        <td className="num">{l.credit ? accounting(l.credit) : ""}</td>
                      </tr>
                    ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
        <Pagination page={page} total={count} params={{ from: byRef && !sp.from ? undefined : from, to, ref: sp.ref, source: sp.source }} />
      </Card>
    </>
  );
}
