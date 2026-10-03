import Link from "next/link";
import { PackagePlus, Plus, Search } from "lucide-react";
import { sqlite } from "@/db";
import { PAGE_SIZE, Pagination, pageParam } from "@/components/pagination";
import { Card, EmptyState, LinkButton, PageHeader, PaymentStatusBadge } from "@/components/ui";
import { formatDate, rupiah, startOfMonth, today } from "@/lib/format";

export const metadata = { title: "Penerimaan Barang" };

type SP = { q?: string; from?: string; to?: string; status?: string; page?: string };

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = sp.from || startOfMonth();
  const to = sp.to || today();
  const page = pageParam(sp.page);
  const where = ["r.date BETWEEN @from AND @to"];
  const params: Record<string, string> = { from, to };
  if (sp.q) {
    where.push("(r.number LIKE @q OR s.name LIKE @q OR r.supplier_invoice LIKE @q)");
    params.q = `%${sp.q}%`;
  }
  if (sp.status) {
    where.push("r.status = @status");
    params.status = sp.status;
  }
  const w = where.join(" AND ");
  const summary = sqlite
    .prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(r.total),0) AS total, COALESCE(SUM(r.total - r.amount_paid),0) AS outstanding FROM goods_receipts r JOIN suppliers s ON s.id = r.supplier_id WHERE ${w}`)
    .get(params) as { count: number; total: number; outstanding: number };
  const rows = sqlite
    .prepare(
      `SELECT r.id, r.number, r.date, r.due_date AS dueDate, r.supplier_invoice AS supplierInvoice, r.total, r.amount_paid AS amountPaid, r.status, s.name AS supplier,
              (SELECT SUM(qty) FROM goods_receipt_items i WHERE i.receipt_id = r.id) AS qty
         FROM goods_receipts r JOIN suppliers s ON s.id = r.supplier_id
        WHERE ${w} ORDER BY r.date DESC, r.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    )
    .all(params) as { id: number; number: string; date: string; dueDate: string | null; supplierInvoice: string | null; total: number; amountPaid: number; status: string; supplier: string; qty: number }[];

  return (
    <>
      <PageHeader
        title="Penerimaan Barang"
        description="Barang masuk dari pemasok beserta status pembayarannya."
        actions={
          <LinkButton href="/penerimaan-barang/baru" icon={Plus}>
            Terima Barang
          </LinkButton>
        }
      />
      <Card bodyClassName="p-0">
        <form method="get" className="flex flex-col gap-2 border-b border-zinc-200 p-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={sp.q} placeholder="No. dokumen, pemasok, faktur pemasok..." className="input pl-9" />
          </div>
          <input type="date" name="from" defaultValue={from} className="input lg:w-40" />
          <input type="date" name="to" defaultValue={to} className="input lg:w-40" />
          <select name="status" defaultValue={sp.status ?? ""} className="input lg:w-40">
            <option value="">Semua status</option>
            <option value="paid">Lunas</option>
            <option value="partial">Sebagian</option>
            <option value="unpaid">Belum lunas</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </form>
        <div className="grid grid-cols-2 divide-x divide-zinc-200 border-b border-zinc-200 text-sm sm:grid-cols-3">
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-500">Dokumen</p>
            <p className="font-semibold tabular-nums">{summary.count}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-500">Total pembelian</p>
            <p className="font-semibold tabular-nums">{rupiah(summary.total)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-zinc-500">Belum dibayar</p>
            <p className="font-semibold text-amber-700 tabular-nums">{rupiah(summary.outstanding)}</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada penerimaan barang" description="Catat barang masuk dari pemasok untuk menambah stok." icon={PackagePlus} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Dokumen</th>
                  <th>Tanggal</th>
                  <th>Pemasok</th>
                  <th>Faktur Pemasok</th>
                  <th className="num">Qty</th>
                  <th className="num">Total</th>
                  <th className="num">Sisa</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/penerimaan-barang/${r.id}`} className="font-medium hover:underline">
                        {r.number}
                      </Link>
                    </td>
                    <td className="text-zinc-500">{formatDate(r.date)}</td>
                    <td>{r.supplier}</td>
                    <td className="text-zinc-500">{r.supplierInvoice ?? "-"}</td>
                    <td className="num">{r.qty}</td>
                    <td className="num font-medium">{rupiah(r.total)}</td>
                    <td className="num">{rupiah(r.total - r.amountPaid)}</td>
                    <td>
                      <PaymentStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={summary.count} params={{ q: sp.q, from, to, status: sp.status }} />
      </Card>
    </>
  );
}
