import { Card, PageHeader } from "@/components/ui";
import { productCategories } from "@/server/queries";
import { ProductForm } from "../product-form";

export const metadata = { title: "Tambah Produk" };

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Tambah Produk" description="Daftarkan produk baru ke katalog toko." />
      <Card>
        <ProductForm categories={productCategories()} />
      </Card>
    </div>
  );
}
