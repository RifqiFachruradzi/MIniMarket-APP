import Link from "next/link";
import { CalendarClock, Truck, Wallet } from "lucide-react";
import { sqlite } from "@/db";
import { SettlementForm } from "@/components/settlement-form";
import { Card, EmptyState, PageHeader, PaymentStatusBadge, StatCard } from "@/components/ui";
import { formatDate, rupiah, today } from "@/lib/format";
import { cashAccountOptions } from "@/server/queries";
import { submitSupplierPayment } from "./actions";

export const metadata = { title: "Pembayaran Pemasok" };

export default async function SupplierPaymentsPage({ searchParams }: { searchParams: Promise<{ receipt?: string }> }) {
  const { receipt } = await searchParams;
  const now = today();
  const open = sqlite
    .prepare(
      `SELECT r.id, r.number, r.date, r.due_date AS dueDate, r.supplier_invoice AS supplierInvoice, r.total, r.amount_paid AS amountPaid, r.status, s.name AS supplier
         FROM goods_receipts r JOIN suppliers s ON s.id = r.supplier_id WHERE r.status <> 'paid' ORDER BY COALESCE(r.due_date, r.date)`,
    )
    .all() as { id: number; number: string; date: string; dueDate: string | null; supplierInvoice: string | null; total: number; amountPaid: number; status: string; supplier: string }[];
  const history = sqlite
    .prepare(
      `SELECT p.id, p.number, p.date, p.amount, r.id AS receiptId, r.number AS receiptNumber, s.name AS supplier, a.name AS account
         FROM supplier_payments p JOIN goods_receipts r ON r.id = p.receipt_id JOIN suppliers s ON s.id = p.supplier_id JOIN accounts a ON a.id = p.cash_account_id
        ORDER BY p.date DESC, p.id DESC LIMIT 15`,
    )
    .all() as { id: number; number: string; date: string; amount: number; receiptId: number; receiptNumber: string; supplier: string; account: string }[];
  const total = open.reduce((s, r) => s + r.total - r.amountPaid, 0);
  const dueSoon = open.filter((r) => r.dueDate && r.dueDate <= now).reduce((s, r) => s + r.total - r.amountPaid, 0);

  return (
    <>
      <PageHeader title="Pembayaran Pemasok" description="Pelunasan hutang usaha atas penerimaan barang dari pemasok." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Hutang Usaha" value={rupiah(total)} hint={`${open.length} dokumen belum lunas`} icon={Wallet} tone="amber" />
        <StatCard label="Jatuh Tempo" value={rupiah(dueSoon)} hint="Sudah/hari ini jatuh tempo" icon={CalendarClock} tone="rose" />
        <StatCard label="Pemasok" value={String(new Set(open.map((r) => r.supplier)).size)} hint="Dengan tagihan terbuka" icon={Truck} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card title="Catat Pembayaran" description="Hutang usaha berkurang, kas/bank berkurang.">
          <SettlementForm
            action={submitSupplierPayment}
            documents={open.map((r) => ({ id: r.id, label: r.number, party: r.supplier, outstanding: r.total - r.amountPaid }))}
            cashAccounts={cashAccountOptions()}
            defaultDocId={receipt ? Number(receipt) : undefined}
            today={now}
            docLabel="Dokumen Penerimaan Barang"
            accountLabel="Dibayar dari"
            submitLabel="Simpan Pembayaran"
          />
        </Card>
        <div className="space-y-4">
          <Card title="Hutang Belum Lunas" bodyClassName="p-0">
            {open.length === 0 ? (
              <EmptyState title="Tidak ada hutang" description="Semua tagihan pemasok sudah lunas." icon={Wallet} />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dokumen</th>
                      <th>Pemasok</th>
                      <th>Jatuh Tempo</th>
                      <th className="num">Total</th>
                      <th className="num">Sisa</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/penerimaan-barang/${r.id}`} className="font-medium hover:underline">
                            {r.number}
                          </Link>
                          {r.supplierInvoice && <p className="text-xs text-zinc-500">{r.supplierInvoice}</p>}
                        </td>
                        <td>{r.supplier}</td>
                        <td className={r.dueDate && r.dueDate <= now ? "font-medium text-rose-600" : "text-zinc-500"}>{formatDate(r.dueDate)}</td>
                        <td className="num">{rupiah(r.total)}</td>
                        <td className="num font-medium">{rupiah(r.total - r.amountPaid)}</td>
                        <td>
                          <PaymentStatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Riwayat Pembayaran" bodyClassName="p-0">
            {history.length === 0 ? (
              <EmptyState title="Belum ada pembayaran" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Bukti</th>
                      <th>Tanggal</th>
                      <th>Pemasok</th>
                      <th>Dokumen</th>
                      <th>Akun</th>
                      <th className="num">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.number}</td>
                        <td className="text-zinc-500">{formatDate(p.date)}</td>
                        <td>{p.supplier}</td>
                        <td>
                          <Link href={`/penerimaan-barang/${p.receiptId}`} className="hover:underline">
                            {p.receiptNumber}
                          </Link>
                        </td>
                        <td className="text-zinc-600">{p.account}</td>
                        <td className="num font-medium">{rupiah(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
