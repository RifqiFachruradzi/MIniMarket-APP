import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";
import { MOVEMENT_LABEL } from "@/lib/labels";
import { formatDate, number, rupiah } from "@/lib/format";
import { productCategories } from "@/server/queries";
import { ProductForm } from "../product-form";

export const metadata = { title: "Detail Produk" };

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const product = await db.select().from(products).where(eq(products.id, Number(id))).get();
  if (!product) notFound();
  const moves = await db.select().from(stockMovements).where(eq(stockMovements.productId, product.id)).orderBy(desc(stockMovements.id)).limit(8).all();

  return (
    <>
      <PageHeader title={product.name} description={`${product.sku} · ${product.category}`} />
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CircleCheck className="size-4" /> Data produk berhasil disimpan.
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Informasi Produk" className="xl:col-span-2">
          <ProductForm product={product} categories={await productCategories()} />
        </Card>
        <div className="space-y-4">
          <Card title="Posisi Stok">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Stok saat ini</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {number(product.stock)} <span className="text-xs font-normal text-zinc-500">{product.unit}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Stok minimum</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{number(product.minStock)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">HPP rata-rata</dt>
                <dd className="mt-1 font-medium tabular-nums">{rupiah(product.avgCost)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Nilai persediaan</dt>
                <dd className="mt-1 font-medium tabular-nums">{rupiah(product.stockValue)}</dd>
              </div>
            </dl>
          </Card>
          <Card
            title="Mutasi Terakhir"
            bodyClassName="p-0"
            actions={
              <Link href={`/inventory?product=${product.id}`} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                Kartu stok
              </Link>
            }
          >
            <ul className="divide-y divide-zinc-100">
              {moves.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{MOVEMENT_LABEL[m.type]}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(m.date)} · {m.reference}
                    </p>
                  </div>
                  <span className={`tabular-nums font-medium ${m.qtyIn ? "text-emerald-700" : "text-rose-700"}`}>
                    {m.qtyIn ? `+${m.qtyIn}` : `-${m.qtyOut}`}
                  </span>
                </li>
              ))}
              {moves.length === 0 && <li className="px-5 py-6 text-center text-sm text-zinc-500">Belum ada mutasi.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
