import { sqlite } from "@/db";
import { saveCustomer } from "../actions";
import { PartyPage } from "../party-page";

export const metadata = { title: "Pelanggan" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const rows = sqlite
    .prepare(
      `SELECT c.id, c.name, c.phone, c.address, COUNT(s.id) AS docs, COALESCE(SUM(s.total),0) AS total, COALESCE(SUM(s.total - s.amount_paid),0) AS outstanding
         FROM customers c LEFT JOIN sales s ON s.customer_id = c.id GROUP BY c.id ORDER BY c.name`,
    )
    .all() as { id: number; name: string; phone: string | null; address: string | null; docs: number; total: number; outstanding: number }[];
  return (
    <PartyPage
      title="Pelanggan"
      description="Pelanggan tetap / langganan untuk penjualan kredit dan riwayat belanja."
      basePath="/master/pelanggan"
      rows={rows}
      editing={rows.find((r) => r.id === Number(edit))}
      action={saveCustomer}
      totalLabel="Total Belanja"
      outstandingLabel="Sisa Piutang"
    />
  );
}
