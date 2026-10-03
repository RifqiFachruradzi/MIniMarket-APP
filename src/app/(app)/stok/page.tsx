import Link from "next/link";
import { AlertTriangle, Boxes, Package, PackageX, Pencil, Plus, Search } from "lucide-react";
import { sqlite } from "@/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { number, rupiah } from "@/lib/format";
import { productCategories } from "@/server/queries";

export const metadata = { title: "Stok Barang" };

type Row = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  avgCost: number;
  sellPrice: number;
  stockValue: number;
  isActive: number;
};

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; status?: string }> }) {
  const { q = "", category = "", status = "" } = await searchParams;
  const where: string[] = [];
  const params: Record<string, string> = {};
  if (q) {
    where.push("(name LIKE @q OR sku LIKE @q OR barcode LIKE @q)");
    params.q = `%${q}%`;
  }
  if (category) {
    where.push("category = @category");
    params.category = category;
  }
  if (status === "low") where.push("stock <= min_stock AND stock > 0");
  if (status === "out") where.push("stock = 0");
  if (status === "inactive") where.push("is_active = 0");

  const rows = sqlite
    .prepare(
      `SELECT id, sku, name, category, unit, stock, min_stock AS minStock, avg_cost AS avgCost, sell_price AS sellPrice,
              stock_value AS stockValue, is_active AS isActive
         FROM products ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY name`,
    )
    .all(params) as Row[];
  const totals = sqlite
    .prepare(
      `SELECT COUNT(*) AS products, COALESCE(SUM(stock),0) AS units, COALESCE(SUM(stock_value),0) AS value,
              SUM(CASE WHEN stock <= min_stock AND stock > 0 THEN 1 ELSE 0 END) AS low,
              SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out
         FROM products WHERE is_active = 1`,
    )
    .get() as { products: number; units: number; value: number; low: number; out: number };
  const categories = productCategories();

  return (
    <>
      <PageHeader
        title="Stok Barang"
        description="Daftar produk, level stok, harga pokok rata-rata, dan harga jual."
        actions={
          <LinkButton href="/stok/baru" icon={Plus}>
            Tambah Produk
          </LinkButton>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produk Aktif" value={number(totals.products)} hint={`${number(totals.units)} unit di gudang`} icon={Package} />
        <StatCard label="Nilai Persediaan" value={rupiah(totals.value)} hint="Berdasarkan HPP rata-rata" icon={Boxes} tone="sky" />
        <StatCard label="Stok Menipis" value={number(totals.low)} hint="Di bawah / sama dengan stok minimum" icon={AlertTriangle} tone="amber" />
        <StatCard label="Stok Habis" value={number(totals.out)} hint="Perlu segera dipesan" icon={PackageX} tone="rose" />
      </div>

      <Card bodyClassName="p-0">
        <form className="flex flex-col gap-2 border-b border-zinc-200 p-4 sm:flex-row" method="get">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input name="q" defaultValue={q} placeholder="Cari nama, SKU, atau barcode..." className="input pl-9" />
          </div>
          <select name="category" defaultValue={category} className="input sm:w-48">
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="input sm:w-44">
            <option value="">Semua status</option>
            <option value="low">Stok menipis</option>
            <option value="out">Stok habis</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button className="btn-secondary">Filter</button>
        </form>

        {rows.length === 0 ? (
          <EmptyState title="Produk tidak ditemukan" description="Ubah kata kunci/filter atau tambahkan produk baru." icon={Package} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th className="num">Stok</th>
                  <th className="num">HPP Rata-rata</th>
                  <th className="num">Harga Jual</th>
                  <th className="num">Margin</th>
                  <th className="num">Nilai Stok</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const margin = p.sellPrice > 0 && p.avgCost > 0 ? ((p.sellPrice - p.avgCost) / p.sellPrice) * 100 : null;
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs text-zinc-500">{p.sku}</td>
                      <td>
                        <Link href={`/stok/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="text-zinc-600">{p.category}</td>
                      <td className="num">
                        <span className="font-medium">{number(p.stock)}</span> <span className="text-xs text-zinc-400">{p.unit}</span>
                      </td>
                      <td className="num">{rupiah(p.avgCost)}</td>
                      <td className="num">{rupiah(p.sellPrice)}</td>
                      <td className={`num ${margin !== null && margin < 0 ? "text-rose-600" : "text-zinc-600"}`}>{margin === null ? "-" : `${margin.toFixed(1)}%`}</td>
                      <td className="num">{rupiah(p.stockValue)}</td>
                      <td>
                        {!p.isActive ? (
                          <Badge>Nonaktif</Badge>
                        ) : p.stock === 0 ? (
                          <Badge tone="red">Habis</Badge>
                        ) : p.stock <= p.minStock ? (
                          <Badge tone="amber">Menipis</Badge>
                        ) : (
                          <Badge tone="green">Aman</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <Link href={`/stok/${p.id}`} className="inline-flex rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" title="Ubah">
                          <Pencil className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
