import { query, queryOne } from "@/db";
import { saveSupplier } from "../actions";
import { PartyPage } from "../party-page";

export const metadata = { title: "Pemasok" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const rows = (await query(`SELECT s.id, s.name, s.phone, s.address, COUNT(r.id) AS docs, COALESCE(SUM(r.total),0) AS total, COALESCE(SUM(r.total - r.amount_paid),0) AS outstanding
         FROM suppliers s LEFT JOIN goods_receipts r ON r.supplier_id = s.id GROUP BY s.id ORDER BY s.name`, [])) as { id: number; name: string; phone: string | null; address: string | null; docs: number; total: number; outstanding: number }[];
  return (
    <PartyPage
      title="Pemasok"
      description="Daftar pemasok, total pembelian, dan sisa hutang."
      basePath="/master/pemasok"
      rows={rows}
      editing={rows.find((r) => r.id === Number(edit))}
      action={saveSupplier}
      totalLabel="Total Pembelian"
      outstandingLabel="Sisa Hutang"
    />
  );
}
