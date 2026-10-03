import Link from "next/link";
import { Clock, HandCoins, Users } from "lucide-react";
import { sqlite } from "@/db";
import { SettlementForm } from "@/components/settlement-form";
import { Card, EmptyState, PageHeader, PaymentStatusBadge, StatCard } from "@/components/ui";
import { formatDate, rupiah, today } from "@/lib/format";
import { cashAccountOptions } from "@/server/queries";
import { submitCustomerPayment } from "./actions";

export const metadata = { title: "Penerimaan Pembayaran" };

export default async function CustomerPaymentsPage({ searchParams }: { searchParams: Promise<{ sale?: string }> }) {
  const { sale } = await searchParams;
  const open = sqlite
    .prepare(
      `SELECT s.id, s.number, s.date, s.total, s.amount_paid AS amountPaid, s.status, c.name AS customer,
              CAST(julianday(?) - julianday(s.date) AS INTEGER) AS age
         FROM sales s JOIN customers c ON c.id = s.customer_id WHERE s.status <> 'paid' ORDER BY s.date`,
    )
    .all(today()) as { id: number; number: string; date: string; total: number; amountPaid: number; status: string; customer: string; age: number }[];
  const history = sqlite
    .prepare(
      `SELECT p.id, p.number, p.date, p.amount, p.note, s.id AS saleId, s.number AS saleNumber, c.name AS customer, a.name AS account
         FROM customer_payments p JOIN sales s ON s.id = p.sale_id LEFT JOIN customers c ON c.id = p.customer_id JOIN accounts a ON a.id = p.cash_account_id
        ORDER BY p.date DESC, p.id DESC LIMIT 15`,
    )
    .all() as { id: number; number: string; date: string; amount: number; note: string | null; saleId: number; saleNumber: string; customer: string | null; account: string }[];
  const totalOutstanding = open.reduce((s, r) => s + r.total - r.amountPaid, 0);
  const overdue = open.filter((r) => r.age > 30).reduce((s, r) => s + r.total - r.amountPaid, 0);
  const customerCount = new Set(open.map((r) => r.customer)).size;

  return (
    <>
      <PageHeader title="Penerimaan Pembayaran" description="Pelunasan piutang dari penjualan kredit pelanggan." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Piutang" value={rupiah(totalOutstanding)} hint={`${open.length} faktur belum lunas`} icon={HandCoins} tone="amber" />
        <StatCard label="Lewat 30 Hari" value={rupiah(overdue)} hint="Perlu ditagih" icon={Clock} tone="rose" />
        <StatCard label="Pelanggan Berhutang" value={String(customerCount)} icon={Users} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card title="Catat Penerimaan" description="Kas/bank bertambah, piutang berkurang.">
          <SettlementForm
            action={submitCustomerPayment}
            documents={open.map((r) => ({ id: r.id, label: r.number, party: r.customer, outstanding: r.total - r.amountPaid }))}
            cashAccounts={cashAccountOptions()}
            defaultDocId={sale ? Number(sale) : undefined}
            today={today()}
            docLabel="Faktur Penjualan"
            accountLabel="Diterima ke"
            submitLabel="Simpan Penerimaan"
          />
        </Card>
        <div className="space-y-4">
          <Card title="Piutang Belum Lunas" bodyClassName="p-0">
            {open.length === 0 ? (
              <EmptyState title="Tidak ada piutang" description="Semua penjualan kredit sudah lunas." icon={HandCoins} />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Faktur</th>
                      <th>Pelanggan</th>
                      <th>Tanggal</th>
                      <th className="num">Umur</th>
                      <th className="num">Total</th>
                      <th className="num">Sisa</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/penjualan/${r.id}`} className="font-medium hover:underline">
                            {r.number}
                          </Link>
                        </td>
                        <td>{r.customer}</td>
                        <td className="text-zinc-500">{formatDate(r.date)}</td>
                        <td className={`num ${r.age > 30 ? "font-medium text-rose-600" : "text-zinc-500"}`}>{r.age} hari</td>
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
          <Card title="Riwayat Penerimaan" bodyClassName="p-0">
            {history.length === 0 ? (
              <EmptyState title="Belum ada penerimaan pembayaran" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Bukti</th>
                      <th>Tanggal</th>
                      <th>Pelanggan</th>
                      <th>Faktur</th>
                      <th>Akun</th>
                      <th className="num">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.number}</td>
                        <td className="text-zinc-500">{formatDate(p.date)}</td>
                        <td>{p.customer}</td>
                        <td>
                          <Link href={`/penjualan/${p.saleId}`} className="hover:underline">
                            {p.saleNumber}
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
