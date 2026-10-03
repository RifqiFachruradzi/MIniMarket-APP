import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Wallet } from "lucide-react";
import { query, queryOne } from "@/db";
import { PrintButton } from "@/components/print-button";
import { Card, LinkButton, PageHeader, PaymentStatusBadge } from "@/components/ui";
import { formatDate, number, rupiah } from "@/lib/format";

export const metadata = { title: "Detail Penerimaan Barang" };

export default async function ReceiptDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const r = (await queryOne(`SELECT r.*, s.name AS supplier, s.phone, s.address FROM goods_receipts r JOIN suppliers s ON s.id = r.supplier_id WHERE r.id = ?`, [
    Number(id),
  ])) as
    | { id: number; number: string; date: string; due_date: string | null; supplier_invoice: string | null; total: number; amount_paid: number; status: string; note: string | null; supplier: string; phone: string | null; address: string | null }
    | undefined;
  if (!r) notFound();
  const items = (await query(`SELECT i.*, p.name, p.sku, p.unit FROM goods_receipt_items i JOIN products p ON p.id = i.product_id WHERE i.receipt_id = ? ORDER BY i.id`, [r.id])) as { id: number; name: string; sku: string; unit: string; qty: number; unit_cost: number; subtotal: number }[];
  const payments = (await query(`SELECT p.*, a.name AS account FROM supplier_payments p JOIN accounts a ON a.id = p.cash_account_id WHERE p.receipt_id = ? ORDER BY p.id`, [r.id])) as { id: number; number: string; date: string; amount: number; account: string }[];
  const outstanding = r.total - r.amount_paid;

  return (
    <>
      <PageHeader
        title={`Penerimaan ${r.number}`}
        description={`${r.supplier} · ${formatDate(r.date)}`}
        actions={
          <>
            <LinkButton href="/penerimaan-barang" variant="ghost" icon={ArrowLeft}>
              Kembali
            </LinkButton>
            <PrintButton />
            {outstanding > 0 && (
              <LinkButton href={`/pembayaran-pemasok?receipt=${r.id}`} icon={Wallet}>
                Bayar Pemasok
              </LinkButton>
            )}
          </>
        }
      />
      {isNew && (
        <div className="no-print mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CircleCheck className="size-4" /> Penerimaan barang tersimpan. Stok dan HPP rata-rata telah diperbarui.
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="print-plain xl:col-span-2" bodyClassName="p-0">
          <div className="grid gap-4 border-b border-zinc-200 p-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500 uppercase">Pemasok</p>
              <p className="mt-1 font-medium">{r.supplier}</p>
              <p className="text-zinc-500">{r.phone}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Faktur Pemasok</p>
              <p className="mt-1">{r.supplier_invoice ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase">Jatuh Tempo</p>
              <p className="mt-1">{formatDate(r.due_date)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="num">Qty</th>
                  <th className="num">Harga Beli</th>
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
                    <td className="num">{rupiah(i.unit_cost)}</td>
                    <td className="num font-medium">{rupiah(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="num">{rupiah(r.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <div className="no-print space-y-4">
          <Card title="Status Pembayaran" actions={<PaymentStatusBadge status={r.status} />} bodyClassName="p-0">
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
              <span>Sisa hutang</span>
              <span className="tabular-nums">{rupiah(outstanding)}</span>
            </div>
          </Card>
          {r.note && (
            <Card title="Catatan">
              <p className="text-sm">{r.note}</p>
            </Card>
          )}
          <Link href={`/laporan/jurnal?ref=${r.number}`} className="block text-center text-xs font-medium text-zinc-500 hover:text-zinc-900">
            Lihat jurnal akuntansi transaksi ini
          </Link>
        </div>
      </div>
    </>
  );
}
