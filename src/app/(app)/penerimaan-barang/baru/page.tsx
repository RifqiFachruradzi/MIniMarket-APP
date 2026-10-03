import { PageHeader } from "@/components/ui";
import { addDays, today } from "@/lib/format";
import { activeProducts, cashAccountOptions, supplierOptions } from "@/server/queries";
import { ReceiptForm } from "./receipt-form";

export const metadata = { title: "Penerimaan Barang Baru" };

export default async function NewReceiptPage() {
  const now = today();
  const products = (await activeProducts()).map(({ id, sku, barcode, name, unit, stock, avgCost, sellPrice }) => ({ id, sku, barcode, name, unit, stock, avgCost, sellPrice }));
  return (
    <>
      <PageHeader title="Penerimaan Barang" description="Catat barang masuk dari pemasok. Stok, HPP rata-rata, dan hutang usaha diperbarui otomatis." />
      <ReceiptForm products={products} suppliers={await supplierOptions()} cashAccounts={await cashAccountOptions()} today={now} dueDefault={addDays(now, 30)} />
    </>
  );
}
