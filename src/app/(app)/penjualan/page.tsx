import Link from "next/link";
import { Plus, Receipt, Search, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { query, queryOne } from "@/db";
import { PAGE_SIZE, Pagination, pageParam } from "@/components/pagination";
import { Badge, Card, EmptyState, LinkButton, PageHeader, PaymentStatusBadge, StatCard } from "@/components/ui";
import { formatDate, rupiah, startOfMonth, today } from "@/lib/format";

export const metadata = { title: "Penjualan" };

type SP = { q?: string; from?: string; to?: string; status?: string; payment?: string; page?: string };

export default async function SalesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const from = sp.from || startOfMonth();
  const to = sp.to || today();
  const page = pageParam(sp.page);

  const where = ["s.date BETWEEN @from AND @to"];
  const params: Record<string, string | number> = { from, to };
  if (sp.q) {
    where.push("(s.number LIKE @q OR c.name LIKE @q)");
    params.q = `%${sp.q}%`;
  }
  if (sp.status) {
    where.push("s.status = @status");
    params.status = sp.status;
  }
  if (sp.payment) {
    where.push("s.payment_type = @payment");
    params.payment = sp.payment;
  }
  const whereSql = where.join(" AND ");

  const summary = (await queryOne(`SELECT COUNT(*) AS count, COALESCE(SUM(s.total),0) AS total, COALESCE(SUM(s.cogs),0) AS cogs, COALESCE(SUM(s.total - s.amount_paid),0) AS outstanding
         FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE ${whereSql}`, params)) as { count: number; total: number; cogs: number; outstanding: number };
  const rows = (await query(`SELECT s.id, s.number, s.date, s.total, s.discount, s.amount_paid AS amountPaid, s.status, s.payment_type AS paymentType,
              c.name AS customer, a.name AS account, (SELECT SUM(qty) FROM sale_items i WHERE i.sale_id = s.id) AS qty
         FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN accounts a ON a.id = s.cash_account_id
        WHERE ${whereSql} ORDER BY s.date DESC, s.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, params)) as {
    id: number;
    number: string;
    date: string;
    total: number;
    discount: number;
    amountPaid: number;
    status: string;
    paymentType: string;
    customer: string | null;
    account: string | null;
    qty: number;
  }[];

  return (
    <>
      <PageHeader
        title="Penjualan"
        description="Riwayat transaksi penjualan tunai dan kredit."
        actions={
          <LinkButton href="/penjualan/baru" icon={Plus}>
            Transaksi Baru
          </LinkButton>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Penjualan" value={rupiah(summary.total)} hint={`${formatDate(from)} – ${formatDate(to)}`} icon={ShoppingCart} tone="emerald" />
        <StatCard label="Jumlah Transaksi" value={String(summary.count)} hint={`Rata-rata ${rupiah(summary.count ? Math.round(summary.total / summary.count) : 0)}`} icon={Receipt} />
        <StatCard label="Laba Kotor" value={rupiah(summary.total - summary.cogs)} hint={`HPP ${rupiah(summary.cogs)}`} icon={TrendingUp} tone="sky" />
        <StatCard label="Belum Dibayar" value={rupiah(summary.outstanding)} hint="Piutang dari periode ini" icon={Wallet} tone="amber" />
      </div>

      <Card bodyClassName="p-0">
        <form method="get" className="flex flex-col gap-2 border-b border-zinc-200 p-4 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={sp.q} placeholder="No. faktur atau pelanggan..." className="input pl-9" />
          </div>
          <input type="date" name="from" defaultValue={from} className="input lg:w-40" />
          <input type="date" name="to" defaultValue={to} className="input lg:w-40" />
          <select name="payment" defaultValue={sp.payment ?? ""} className="input lg:w-40">
            <option value="">Semua metode</option>
            <option value="cash">Tunai</option>
            <option value="credit">Kredit</option>
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="input lg:w-40">
            <option value="">Semua status</option>
            <option value="paid">Lunas</option>
            <option value="partial">Sebagian</option>
            <option value="unpaid">Belum lunas</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada transaksi" description="Belum ada penjualan pada periode/filter ini." icon={ShoppingCart} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Faktur</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Pembayaran</th>
                  <th className="num">Item</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/penjualan/${r.id}`} className="font-medium hover:underline">
                        {r.number}
                      </Link>
                    </td>
                    <td className="text-zinc-500">{formatDate(r.date)}</td>
                    <td>{r.customer ?? <span className="text-zinc-400">Umum</span>}</td>
                    <td>{r.paymentType === "cash" ? <span className="text-zinc-600">{r.account}</span> : <Badge tone="blue">Kredit</Badge>}</td>
                    <td className="num">{r.qty}</td>
                    <td className="num font-medium">{rupiah(r.total)}</td>
                    <td>
                      <PaymentStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={summary.count} params={{ q: sp.q, from, to, status: sp.status, payment: sp.payment }} />
      </Card>
    </>
  );
}
