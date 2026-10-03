"use client";

import clsx from "clsx";
import { Minus, Plus, ScanLine, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { rupiah } from "@/lib/format";

export type PickerProduct = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  stock: number;
  avgCost: number;
  sellPrice: number;
};

export type LineItem = { productId: number; qty: number; price: number };

type Mode = "sale" | "receipt" | "issue";

const PRICE_LABEL: Record<Mode, string> = { sale: "Harga", receipt: "Harga Beli", issue: "HPP" };

export function ProductPicker({ products, onPick, mode }: { products: PickerProduct[]; onPick: (p: PickerProduct) => void; mode: Mode }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? "").includes(q))
      .slice(0, 8);
  }, [products, query]);

  function pick(p: PickerProduct) {
    onPick(p);
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const exact = products.find((p) => p.barcode === query.trim() || p.sku.toLowerCase() === query.trim().toLowerCase());
            const target = exact ?? matches[active];
            if (target) pick(target);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Cari produk / scan barcode lalu tekan Enter..."
        className="input py-2.5 pl-9"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
          {matches.map((p, i) => {
            const disabled = mode !== "receipt" && p.stock <= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                  onMouseEnter={() => setActive(i)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50",
                    i === active && "bg-zinc-100",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-900">{p.name}</span>
                    <span className="block font-mono text-xs text-zinc-500">{p.sku}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block tabular-nums">{rupiah(mode === "sale" ? p.sellPrice : p.avgCost)}</span>
                    <span className={clsx("block text-xs", p.stock <= 0 ? "text-rose-600" : "text-zinc-500")}>
                      Stok {p.stock} {p.unit}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * Tabel baris barang. Nilai dikirim ke server lewat input tersembunyi `items` (JSON).
 */
export function ItemsEditor({
  products,
  items,
  setItems,
  mode,
}: {
  products: PickerProduct[];
  items: LineItem[];
  setItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
  mode: Mode;
}) {
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const priceEditable = mode !== "issue";

  function add(p: PickerProduct) {
    setItems((prev) => {
      const found = prev.find((l) => l.productId === p.id);
      if (found) return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      const price = mode === "sale" ? p.sellPrice : p.avgCost;
      return [...prev, { productId: p.id, qty: 1, price }];
    });
  }
  const update = (productId: number, patch: Partial<LineItem>) => setItems((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  const remove = (productId: number) => setItems((prev) => prev.filter((l) => l.productId !== productId));

  return (
    <div className="space-y-3">
      <ProductPicker products={products} onPick={add} mode={mode} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th className="num w-36">Qty</th>
              <th className="num w-40">{PRICE_LABEL[mode]}</th>
              <th className="num w-36">Subtotal</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-zinc-500">
                  Belum ada barang. Cari produk di atas untuk menambahkan.
                </td>
              </tr>
            )}
            {items.map((l) => {
              const p = byId.get(l.productId);
              if (!p) return null;
              const over = mode !== "receipt" && l.qty > p.stock;
              return (
                <tr key={l.productId}>
                  <td>
                    <p className="font-medium">{p.name}</p>
                    <p className={clsx("text-xs", over ? "text-rose-600" : "text-zinc-500")}>
                      {p.sku} · stok {p.stock} {p.unit}
                      {over && " · melebihi stok"}
                    </p>
                  </td>
                  <td>
                    <div className="ml-auto flex w-32 items-center rounded-md border border-zinc-300 bg-white">
                      <button type="button" className="p-2 text-zinc-500 hover:text-zinc-900" onClick={() => update(l.productId, { qty: Math.max(1, l.qty - 1) })} aria-label="Kurangi">
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => update(l.productId, { qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                        className="w-full min-w-0 border-0 bg-transparent px-0 py-1.5 text-center text-sm tabular-nums outline-none"
                      />
                      <button type="button" className="p-2 text-zinc-500 hover:text-zinc-900" onClick={() => update(l.productId, { qty: l.qty + 1 })} aria-label="Tambah">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="num">
                    {priceEditable ? (
                      <input
                        type="number"
                        min={0}
                        value={l.price}
                        onChange={(e) => update(l.productId, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className="input ml-auto w-36 py-1.5 text-right tabular-nums"
                      />
                    ) : (
                      <span className="text-zinc-600">{rupiah(p.avgCost)}</span>
                    )}
                  </td>
                  <td className="num font-medium">{rupiah((priceEditable ? l.price : p.avgCost) * l.qty)}</td>
                  <td>
                    <button type="button" onClick={() => remove(l.productId)} className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
