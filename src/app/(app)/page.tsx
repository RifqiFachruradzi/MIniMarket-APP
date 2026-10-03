import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, HandCoins, Landmark, Plus, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { SalesChart } from "@/components/sales-chart";
import { Badge, Card, EmptyState, LinkButton, PageHeader, PaymentStatusBadge, StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { addDays, formatDate, number, rupiah, today } from "@/lib/format";
import { cashBalances, dailySales, dashboardSummary } from "@/server/reports";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  const now = today();
  const s = dashboardSummary(now);
  const cash = cashBalances();
  const totalCash = cash.reduce((a, c) => a + c.balance, 0);

  const from = addDays(now, -29);
  const rows = dailySales(from, now);
  const series = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(from, i);
    const r = rows.find((x) => x.date === date);
    return { date, total: r?.total ?? 0, cogs: r?.cogs ?? 0 };
  });
  const grossMonth = s.salesMonth.total - s.salesMonth.cogs;
  const margin = s.salesMonth.total > 0 ? (grossMonth / s.salesMonth.total) * 100 : 0;

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${session?.name ?? ""}`}
        description={`Ringkasan operasional toko per ${formatDate(now, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`}
        actions={
          <>
            <LinkButton href="/penerimaan-barang/baru" variant="secondary" icon={Plus}>
              Terima Barang
            </LinkButton>
            <LinkButton href="/penjualan/baru" icon={ShoppingCart}>
              Transaksi Baru
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Penjualan Hari Ini" value={rupiah(s.salesToday.total)} hint={`${s.salesToday.count} transaksi`} icon={ShoppingCart} tone="emerald" />
        <StatCard
          label="Penjualan Bulan Ini"
          value={rupiah(s.salesMonth.total)}
          hint={`Laba kotor ${rupiah(grossMonth)} · margin ${margin.toFixed(1)}%`}
          icon={TrendingUp}
          tone="sky"
        />
        <StatCard label="Saldo Kas & Bank" value={rupiah(totalCash)} hint={`${cash.length} akun kas/bank`} icon={Landmark} />
        <StatCard label="Nilai Persediaan" value={rupiah(s.inventory.value)} hint={`${s.inventory.count} produk`} icon={Boxes} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card
          title="Penjualan 30 Hari Terakhir"
          description="Total penjualan (abu-abu) dan porsi harga pokok (hitam)"
          className="xl:col-span-2"
        >
          <SalesChart data={series} />
        </Card>

        <Card title="Kas & Bank" actions={<Link href="/kas-bank" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">Detail</Link>} bodyClassName="p-0">
          <ul className="divide-y divide-zinc-100">
            {cash.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.code}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{rupiah(c.balance)}</p>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 border-t border-zinc-200">
            <Link href="/penerimaan-pembayaran" className="border-r border-zinc-200 px-5 py-3.5 transition hover:bg-zinc-50">
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <HandCoins className="size-3.5" /> Piutang
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{rupiah(s.receivable)}</p>
            </Link>
            <Link href="/pembayaran-pemasok" className="px-5 py-3.5 transition hover:bg-zinc-50">
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Wallet className="size-3.5" /> Hutang
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{rupiah(s.payable)}</p>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Transaksi Terbaru" className="xl:col-span-2" bodyClassName="p-0" actions={<Link href="/penjualan" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">Lihat semua</Link>}>
          {s.recentSales.length === 0 ? (
            <EmptyState title="Belum ada transaksi" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No. Faktur</th>
                    <th>Tanggal</th>
                    <th>Pelanggan</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentSales.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/penjualan/${r.id}`} className="font-medium hover:underline">{r.number}</Link>
                      </td>
                      <td className="text-zinc-500">{formatDate(r.date)}</td>
                      <td>{r.customer ?? <span className="text-zinc-400">Umum</span>}</td>
                      <td>
                        <PaymentStatusBadge status={r.status} />
                      </td>
                      <td className="num font-medium">{rupiah(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card
            title="Stok Menipis"
            actions={s.lowStockCount > 0 ? <Badge tone="amber">{s.lowStockCount} produk</Badge> : undefined}
            bodyClassName="p-0"
          >
            {s.lowStock.length === 0 ? (
              <EmptyState title="Semua stok aman" icon={Boxes} />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {s.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-zinc-500">Min. {p.minStock} {p.unit}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-700 tabular-nums">{number(p.stock)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/stok?status=low" className="flex items-center justify-center gap-1 border-t border-zinc-200 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
              Kelola stok <ArrowRight className="size-3.5" />
            </Link>
          </Card>

          <Card title="Produk Terlaris Bulan Ini" bodyClassName="p-0">
            {s.topProducts.length === 0 ? (
              <EmptyState title="Belum ada penjualan bulan ini" />
            ) : (
              <ol className="divide-y divide-zinc-100">
                {s.topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid size-6 place-items-center rounded bg-zinc-100 text-xs font-semibold text-zinc-600">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-zinc-500">{number(p.qty)} terjual</p>
                    </div>
                    <span className="text-sm tabular-nums">{rupiah(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
