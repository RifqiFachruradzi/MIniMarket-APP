"use client";

import { useEffect, useRef, useState } from "react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import { rupiah } from "@/lib/format";
import { submitStockOpname } from "./actions";

type P = { id: number; sku: string; name: string; unit: string; stock: number; avgCost: number };

export function OpnameForm({ products, today }: { products: P[]; today: string }) {
  const { state, pending, onSubmit } = useActionForm(submitStockOpname);
  const [productId, setProductId] = useState<number | "">("");
  const [physical, setPhysical] = useState<number | "">("");
  const ref = useRef<HTMLFormElement>(null);
  const p = products.find((x) => x.id === productId);
  const diff = p && physical !== "" ? physical - p.stock : 0;

  useEffect(() => {
    if (state?.success) {
      ref.current?.reset();
      setProductId("");
      setPhysical("");
    }
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      <FormAlert state={state} />
      <label className="block">
        <span className="label">Produk</span>
        <select name="productId" required value={productId} onChange={(e) => setProductId(Number(e.target.value))} className="input">
          <option value="" disabled>
            Pilih produk...
          </option>
          {products.map((x) => (
            <option key={x.id} value={x.id}>
              {x.sku} · {x.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="label">Stok Sistem</span>
          <div className="input bg-zinc-50 text-right tabular-nums">{p ? `${p.stock} ${p.unit}` : "-"}</div>
        </div>
        <label className="block">
          <span className="label">Stok Fisik</span>
          <input
            type="number"
            name="physicalQty"
            min={0}
            required
            value={physical}
            onChange={(e) => setPhysical(e.target.value === "" ? "" : Math.max(0, Math.floor(Number(e.target.value))))}
            className="input text-right tabular-nums"
          />
        </label>
      </div>
      {p && physical !== "" && (
        <div className={`flex justify-between rounded-md px-3 py-2 text-sm ring-1 ${diff === 0 ? "bg-zinc-50 ring-zinc-200" : diff > 0 ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
          <span>Selisih {diff > 0 ? `+${diff}` : diff}</span>
          <span className="font-semibold tabular-nums">{rupiah(Math.abs(diff) * p.avgCost)}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Tanggal</span>
          <input type="date" name="date" defaultValue={today} required className="input" />
        </label>
        <label className="block">
          <span className="label">Catatan</span>
          <input name="note" className="input" placeholder="Opsional" />
        </label>
      </div>
      <SubmitButton pending={pending} className="btn-primary w-full">Simpan Penyesuaian</SubmitButton>
    </form>
  );
}
