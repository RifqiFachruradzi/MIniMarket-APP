import { PageHeader } from "@/components/ui";
import { ISSUE_REASONS } from "@/db/schema";
import { today } from "@/lib/format";
import { activeProducts } from "@/server/queries";
import { IssueForm } from "./issue-form";

export const metadata = { title: "Pengeluaran Barang Baru" };

export default function NewIssuePage() {
  const products = activeProducts().map(({ id, sku, barcode, name, unit, stock, avgCost, sellPrice }) => ({ id, sku, barcode, name, unit, stock, avgCost, sellPrice }));
  return (
    <>
      <PageHeader title="Pengeluaran Barang" description="Catat barang keluar selain penjualan: rusak, kedaluwarsa, hilang, pemakaian internal, atau retur." />
      <IssueForm products={products} reasons={ISSUE_REASONS} today={today()} />
    </>
  );
}
