import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, HandCoins, Plus } from "lucide-react";
import { query, queryOne } from "@/db";
import { PrintButton } from "@/components/print-button";
import { Badge, Card, LinkButton, PageHeader, PaymentStatusBadge } from "@/components/ui";
import { formatDate, number, rupiah } from "@/lib/format";

export const metadata = { title: "Detail Penjualan" };

export default async function SaleDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const sale = (await queryOne(
      `SELECT s.*, c.name AS customer, c.phone AS customerPhone, a.name AS account, u.name AS cashier
         FROM sales s LEFT JOIN customers c ON c.id = s.customer_id LEFT JOIN accounts a ON a.id = s.cash_account_id
         LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    [Number(id)],
  )) as
    | {
        id: number;
        number: string;
        date: string;
        payment_type: string;
        subtotal: number;
        discount: number;
        total: number;
        cogs: number;
        amount_paid: number;
        tendered: number;
        status: string;
        note: string | null;
        customer: string | null;
        customerPhone: string | null;
        account: string | null;
        cashier: string | null;
      }
    | undefined;
  if (!sale) notFound();

  const items = (await query(`SELECT i.*, p.name, p.sku, p.unit FROM sale_items i JOIN products p ON p.id = i.product_id WHERE i.sale_id = ? ORDER BY i.id`, [sale.id])) as { id: number; name: string; sku: string; unit: string; qty: number; price: number; subtotal: number }[];
  const payments = (await query(`SELECT p.*, a.name AS account FROM customer_payments p JOIN accounts a ON a.id = p.cash_account_id WHERE p.sale_id = ? ORDER BY p.id`, [sale.id])) as { id: number; number: string; date: string; amount: number; account: string }[];
  const outstanding = sale.total - sale.amount_paid;

  return (
    <>
      <PageHeader
        title={`Faktur ${sale.number}`}
        description={formatDate(sale.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <>
            <LinkButton href="/penjualan" variant="ghost" icon={ArrowLeft}>
              Kembali
            </LinkButton>
            <PrintButton label="Cetak Struk" />
            {outstanding > 0 && (
              <LinkButton href={`/penerimaan-pembayaran?sale=${sale.id}`} variant="secondary" icon={HandCoins}>
                Terima Pembayaran
              </LinkButton>
            )}
            <LinkButton href="/penjualan/baru" icon={Plus}>
              Transaksi Baru
            </LinkButton>
          </>
        }
      />
      {isNew && (
        <div className="no-print mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CircleCheck className="size-4" /> Transaksi berhasil disimpan.
          {sale.payment_type === "cash" && sale.tendered > sale.total && (
            <span className="ml-1 font-semibold">Kembalian: {rupiah(sale.tendered - sale.total)}</span>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="print-plain xl:col-span-2" bodyClassName="p-0">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 p-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase">Pelanggan</p>
              <p className="mt-1 font-medium">{sale.customer ?? "Umum"}</p>
              {sale.customerPhone && <p className="text-sm text-zinc-500">{sale.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase">Status</p>
              <div className="mt-1">
                <PaymentStatusBadge status={sale.status} />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="num">Qty</th>
                  <th className="num">Harga</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <p className="font-medium">{i.name}</p>
                      <p className="font-mono text-xs text-zinc-500">{i.sku}</p>
                    </td>
                    <td className="num">
                      {number(i.qty)} <span className="text-xs text-zinc-400">{i.unit}</span>
                    </td>
                    <td className="num">{rupiah(i.price)}</td>
                    <td className="num font-medium">{rupiah(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto max-w-xs space-y-1.5 border-t border-zinc-200 p-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subtotal</dt>
              <dd className="tabular-nums">{rupiah(sale.subtotal)}</dd>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Diskon</dt>
                <dd className="tabular-nums">-{rupiah(sale.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{rupiah(sale.total)}</dd>
            </div>
            {sale.payment_type === "cash" && sale.tendered > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Dibayar</dt>
                  <dd className="tabular-nums">{rupiah(sale.tendered)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Kembalian</dt>
                  <dd className="tabular-nums">{rupiah(sale.tendered - sale.total)}</dd>
                </div>
              </>
            )}
          </dl>
        </Card>

        <div className="no-print space-y-4">
          <Card title="Informasi Transaksi">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Metode</dt>
                <dd>{sale.payment_type === "cash" ? "Tunai / Transfer" : <Badge tone="blue">Kredit</Badge>}</dd>
              </div>
              {sale.account && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Akun penerimaan</dt>
                  <dd>{sale.account}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Kasir</dt>
                <dd>{sale.cashier ?? "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">HPP</dt>
                <dd className="tabular-nums">{rupiah(sale.cogs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Laba kotor</dt>
                <dd className="font-medium tabular-nums text-emerald-700">{rupiah(sale.total - sale.cogs)}</dd>
              </div>
              {sale.note && (
                <div>
                  <dt className="text-zinc-500">Catatan</dt>
                  <dd className="mt-1">{sale.note}</dd>
                </div>
              )}
            </dl>
          </Card>
          {sale.payment_type === "credit" && (
            <Card title="Pembayaran Piutang" bodyClassName="p-0">
              <ul className="divide-y divide-zinc-100 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between px-5 py-3">
                    <div>
                      <p className="font-medium">{p.number}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(p.date)} · {p.account}
                      </p>
                    </div>
                    <span className="tabular-nums">{rupiah(p.amount)}</span>
                  </li>
                ))}
                {payments.length === 0 && <li className="px-5 py-4 text-zinc-500">Belum ada pembayaran.</li>}
              </ul>
              <div className="flex justify-between border-t border-zinc-200 px-5 py-3 text-sm font-semibold">
                <span>Sisa piutang</span>
                <span className="tabular-nums">{rupiah(outstanding)}</span>
              </div>
            </Card>
          )}
          <Link href={`/laporan/jurnal?ref=${sale.number}`} className="block text-center text-xs font-medium text-zinc-500 hover:text-zinc-900">
            Lihat jurnal akuntansi transaksi ini
          </Link>
        </div>
      </div>
    </>
  );
}
