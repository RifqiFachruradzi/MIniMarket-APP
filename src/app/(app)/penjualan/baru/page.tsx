import { PageHeader } from "@/components/ui";
import { today } from "@/lib/format";
import { activeProducts, cashAccountOptions, customerOptions } from "@/server/queries";
import { SaleForm } from "./sale-form";

export const metadata = { title: "Transaksi Penjualan" };

export default function NewSalePage() {
  const products = activeProducts().map(({ id, sku, barcode, name, unit, stock, avgCost, sellPrice }) => ({ id, sku, barcode, name, unit, stock, avgCost, sellPrice }));
  return (
    <>
      <PageHeader title="Transaksi Penjualan" description="Kasir: tambahkan barang, pilih metode pembayaran, lalu simpan." />
      <SaleForm products={products} cashAccounts={cashAccountOptions()} customers={customerOptions()} today={today()} />
    </>
  );
}
