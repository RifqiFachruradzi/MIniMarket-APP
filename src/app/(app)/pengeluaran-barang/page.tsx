import { CircleCheck, PackageMinus, Plus } from "lucide-react";
import { query, queryOne } from "@/db";
import { PAGE_SIZE, Pagination, pageParam } from "@/components/pagination";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { formatDate, rupiah, startOfYear, today } from "@/lib/format";

export const metadata = { title: "Pengeluaran Barang" };

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; saved?: string; page?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || startOfYear();
  const to = sp.to || today();
  const page = pageParam(sp.page);
  const summary = (await queryOne(`SELECT COUNT(*) AS count, COALESCE(SUM(total_cost),0) AS total FROM goods_issues WHERE date BETWEEN ? AND ?`, [from, to])) as { count: number; total: number };
  const rows = (await query(`SELECT g.id, g.number, g.date, g.reason, g.total_cost AS totalCost, g.note,
              (SELECT GROUP_CONCAT(p.name || ' × ' || i.qty, ', ') FROM goods_issue_items i JOIN products p ON p.id = i.product_id WHERE i.issue_id = g.id) AS items
         FROM goods_issues g WHERE g.date BETWEEN ? AND ? ORDER BY g.date DESC, g.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, [from, to])) as { id: number; number: string; date: string; reason: string; totalCost: number; note: string | null; items: string }[];
  const tone = (r: string) => (r === "Rusak" || r === "Hilang" ? "red" : r === "Kedaluwarsa" ? "amber" : "gray") as "red" | "amber" | "gray";

  return (
    <>
      <PageHeader
        title="Pengeluaran Barang"
        description="Barang keluar non-penjualan yang mengurangi stok dan dibebankan pada laba rugi."
        actions={
          <LinkButton href="/pengeluaran-barang/baru" icon={Plus}>
            Keluarkan Barang
          </LinkButton>
        }
      />
      {sp.saved && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CircleCheck className="size-4" /> Pengeluaran barang berhasil dicatat.
        </div>
      )}
      <Card bodyClassName="p-0">
        <form method="get" className="flex flex-wrap items-end gap-2 border-b border-zinc-200 p-4">
          <input type="date" name="from" defaultValue={from} className="input w-40" />
          <input type="date" name="to" defaultValue={to} className="input w-40" />
          <button className="btn-secondary">Filter</button>
          <div className="ml-auto text-right text-sm">
            <p className="text-xs text-zinc-500">{summary.count} dokumen · total nilai</p>
            <p className="font-semibold tabular-nums">{rupiah(summary.total)}</p>
          </div>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada pengeluaran barang" icon={PackageMinus} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Dokumen</th>
                  <th>Tanggal</th>
                  <th>Alasan</th>
                  <th>Barang</th>
                  <th>Keterangan</th>
                  <th className="num">Nilai (HPP)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.number}</td>
                    <td className="text-zinc-500">{formatDate(r.date)}</td>
                    <td>
                      <Badge tone={tone(r.reason)}>{r.reason}</Badge>
                    </td>
                    <td className="max-w-xs text-zinc-700">{r.items}</td>
                    <td className="text-zinc-500">{r.note ?? "-"}</td>
                    <td className="num font-medium">{rupiah(r.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={summary.count} params={{ from, to }} />
      </Card>
    </>
  );
}
