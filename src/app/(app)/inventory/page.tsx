import clsx from "clsx";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardCheck, Layers } from "lucide-react";
import { sqlite } from "@/db";
import { PrintButton } from "@/components/print-button";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { MOVEMENT_LABEL } from "@/lib/labels";
import { formatDate, number, rupiah, startOfMonth, today } from "@/lib/format";
import { activeProducts } from "@/server/queries";
import { OpnameForm } from "./opname-form";

export const metadata = { title: "Inventory" };

type SP = { tab?: string; product?: string; from?: string; to?: string };

const TABS = [
  { key: "ringkasan", label: "Ringkasan Persediaan" },
  { key: "kartu-stok", label: "Kartu Stok" },
  { key: "opname", label: "Stock Opname" },
];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? (sp.product ? "kartu-stok" : "ringkasan");
  const from = sp.from || startOfMonth();
  const to = sp.to || today();

  const movement = sqlite
    .prepare(`SELECT COALESCE(SUM(qty_in),0) AS qtyIn, COALESCE(SUM(qty_out),0) AS qtyOut, COALESCE(SUM(qty_in*unit_cost),0) AS valIn, COALESCE(SUM(qty_out*unit_cost),0) AS valOut FROM stock_movements WHERE date BETWEEN ? AND ?`)
    .get(from, to) as { qtyIn: number; qtyOut: number; valIn: number; valOut: number };
  const totals = sqlite.prepare(`SELECT COALESCE(SUM(stock),0) AS units, COALESCE(SUM(stock_value),0) AS value, COUNT(*) AS count FROM products`).get() as {
    units: number;
    value: number;
    count: number;
  };

  return (
    <>
      <PageHeader title="Inventory" description="Valuasi persediaan, kartu stok per produk, dan stock opname." actions={<PrintButton />} />
      <div className="no-print mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Nilai Persediaan" value={rupiah(totals.value)} hint={`${number(totals.units)} unit · ${totals.count} produk`} icon={Boxes} />
        <StatCard label="Barang Masuk" value={number(movement.qtyIn)} hint={`${rupiah(movement.valIn)} · periode ini`} icon={ArrowDownToLine} tone="emerald" />
        <StatCard label="Barang Keluar" value={number(movement.qtyOut)} hint={`${rupiah(movement.valOut)} · periode ini`} icon={ArrowUpFromLine} tone="rose" />
        <StatCard
          label="Perputaran"
          value={totals.value > 0 ? `${(movement.valOut / totals.value).toFixed(2)}×` : "-"}
          hint="HPP keluar ÷ nilai persediaan"
          icon={Layers}
          tone="sky"
        />
      </div>

      <div className="no-print mb-4 flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/inventory?tab=${t.key}`}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === t.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "ringkasan" && <Valuation />}
      {tab === "kartu-stok" && <StockCard productId={Number(sp.product) || undefined} from={from} to={to} />}
      {tab === "opname" && <Opname />}
    </>
  );
}

function Valuation() {
  const rows = sqlite
    .prepare(
      `SELECT category, COUNT(*) AS products, SUM(stock) AS units, SUM(stock_value) AS value,
              SUM(stock * sell_price) AS retail FROM products GROUP BY category ORDER BY value DESC`,
    )
    .all() as { category: string; products: number; units: number; value: number; retail: number }[];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const retail = rows.reduce((s, r) => s + r.retail, 0);
  return (
    <Card title="Valuasi Persediaan per Kategori" description="Metode rata-rata tertimbang (moving average)" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th className="num">Produk</th>
              <th className="num">Unit</th>
              <th className="num">Nilai HPP</th>
              <th className="num">Nilai Jual</th>
              <th className="num">Potensi Laba</th>
              <th className="w-48">Porsi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category}>
                <td className="font-medium">{r.category}</td>
                <td className="num">{r.products}</td>
                <td className="num">{number(r.units)}</td>
                <td className="num">{rupiah(r.value)}</td>
                <td className="num">{rupiah(r.retail)}</td>
                <td className="num text-emerald-700">{rupiah(r.retail - r.value)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
                      <div className="h-1.5 rounded-full bg-zinc-900" style={{ width: `${total ? (r.value / total) * 100 : 0}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-zinc-500 tabular-nums">{total ? ((r.value / total) * 100).toFixed(0) : 0}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Total</td>
              <td className="num">{rupiah(total)}</td>
              <td className="num">{rupiah(retail)}</td>
              <td className="num text-emerald-700">{rupiah(retail - total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function StockCard({ productId, from, to }: { productId?: number; from: string; to: string }) {
  const products = activeProducts();
  const product = products.find((p) => p.id === productId) ?? products[0];
  if (!product) return <EmptyState title="Belum ada produk" />;
  const opening = sqlite
    .prepare(`SELECT COALESCE(SUM(qty_in - qty_out),0) AS v FROM stock_movements WHERE product_id = ? AND date < ?`)
    .get(product.id, from) as { v: number };
  const rows = sqlite
    .prepare(`SELECT * FROM stock_movements WHERE product_id = ? AND date BETWEEN ? AND ? ORDER BY date, id`)
    .all(product.id, from, to) as { id: number; date: string; type: string; reference: string; qty_in: number; qty_out: number; unit_cost: number; note: string | null }[];
  let running = opening.v;
  const tone: Record<string, "green" | "blue" | "red" | "amber" | "gray"> = { opening: "gray", receipt: "green", sale: "blue", issue: "red", adjustment: "amber" };

  return (
    <Card
      title={`Kartu Stok · ${product.name}`}
      description={`${product.sku} · ${formatDate(from)} – ${formatDate(to)}`}
      bodyClassName="p-0"
      actions={
        <form method="get" className="no-print flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value="kartu-stok" />
          <select name="product" defaultValue={product.id} className="input w-56 py-1.5 text-xs">
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={from} className="input w-36 py-1.5 text-xs" />
          <input type="date" name="to" defaultValue={to} className="input w-36 py-1.5 text-xs" />
          <button className="btn-secondary py-1.5 text-xs">Tampilkan</button>
        </form>
      }
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Referensi</th>
              <th>Keterangan</th>
              <th className="num">Masuk</th>
              <th className="num">Keluar</th>
              <th className="num">Saldo</th>
              <th className="num">Harga/Unit</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-zinc-50/60">
              <td colSpan={6} className="font-medium text-zinc-600">
                Saldo awal
              </td>
              <td className="num font-medium">{number(opening.v)}</td>
              <td />
            </tr>
            {rows.map((r) => {
              running += r.qty_in - r.qty_out;
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-zinc-500">{formatDate(r.date)}</td>
                  <td>
                    <Badge tone={tone[r.type]}>{MOVEMENT_LABEL[r.type]}</Badge>
                  </td>
                  <td className="font-mono text-xs">{r.reference}</td>
                  <td className="text-zinc-500">{r.note ?? ""}</td>
                  <td className="num text-emerald-700">{r.qty_in || ""}</td>
                  <td className="num text-rose-700">{r.qty_out || ""}</td>
                  <td className="num font-medium">{number(running)}</td>
                  <td className="num text-zinc-500">{rupiah(r.unit_cost)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  Tidak ada mutasi pada periode ini.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Saldo akhir</td>
              <td className="num text-emerald-700">{number(rows.reduce((s, r) => s + r.qty_in, 0))}</td>
              <td className="num text-rose-700">{number(rows.reduce((s, r) => s + r.qty_out, 0))}</td>
              <td className="num">{number(running)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function Opname() {
  const products = activeProducts().map(({ id, sku, name, unit, stock, avgCost }) => ({ id, sku, name, unit, stock, avgCost }));
  const history = sqlite
    .prepare(
      `SELECT a.*, p.name, p.sku, p.unit FROM stock_adjustments a JOIN products p ON p.id = a.product_id ORDER BY a.date DESC, a.id DESC LIMIT 20`,
    )
    .all() as { id: number; number: string; date: string; name: string; sku: string; unit: string; system_qty: number; physical_qty: number; difference: number; value: number; note: string | null }[];
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card title="Input Stock Opname" description="Sesuaikan stok sistem dengan hasil hitung fisik." className="h-fit">
        <OpnameForm products={products} today={today()} />
      </Card>
      <Card title="Riwayat Penyesuaian" bodyClassName="p-0">
        {history.length === 0 ? (
          <EmptyState title="Belum ada stock opname" icon={ClipboardCheck} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Tanggal</th>
                  <th>Produk</th>
                  <th className="num">Sistem</th>
                  <th className="num">Fisik</th>
                  <th className="num">Selisih</th>
                  <th className="num">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="font-medium">{h.number}</td>
                    <td className="text-zinc-500">{formatDate(h.date)}</td>
                    <td>
                      <p>{h.name}</p>
                      {h.note && <p className="text-xs text-zinc-500">{h.note}</p>}
                    </td>
                    <td className="num">{h.system_qty}</td>
                    <td className="num">{h.physical_qty}</td>
                    <td className={`num font-medium ${h.difference < 0 ? "text-rose-600" : "text-emerald-700"}`}>{h.difference > 0 ? `+${h.difference}` : h.difference}</td>
                    <td className="num">{rupiah(h.difference < 0 ? -h.value : h.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
