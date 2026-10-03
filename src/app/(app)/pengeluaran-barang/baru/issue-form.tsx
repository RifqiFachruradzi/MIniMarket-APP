"use client";

import Link from "next/link";
import { useState } from "react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import { ItemsEditor, type LineItem, type PickerProduct } from "@/components/items-editor";
import { rupiah } from "@/lib/format";
import { submitGoodsIssue } from "../actions";

export function IssueForm({ products, reasons, today }: { products: PickerProduct[]; reasons: readonly string[]; today: string }) {
  const { state, pending, onSubmit } = useActionForm(submitGoodsIssue);
  const [items, setItems] = useState<LineItem[]>([]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const total = items.reduce((s, l) => s + (byId.get(l.productId)?.avgCost ?? 0) * l.qty, 0);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormAlert state={state} />
      <div className="card grid gap-4 p-5 sm:grid-cols-3">
        <label className="block">
          <span className="label">Tanggal</span>
          <input type="date" name="date" defaultValue={today} required className="input" />
        </label>
        <label className="block">
          <span className="label">Alasan Pengeluaran</span>
          <select name="reason" required className="input">
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Keterangan</span>
          <input name="note" className="input" placeholder="Opsional" />
        </label>
      </div>
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Barang Dikeluarkan</h2>
        <ItemsEditor products={products} items={items} setItems={setItems} mode="issue" />
      </div>
      <div className="card flex flex-col items-stretch justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-zinc-500">Estimasi nilai persediaan keluar (HPP)</p>
          <p className="text-xl font-semibold tabular-nums">{rupiah(total)}</p>
          <p className="mt-1 text-xs text-zinc-500">Dicatat sebagai beban kerusakan & kehilangan barang.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pengeluaran-barang" className="btn-secondary">
            Batal
          </Link>
          <SubmitButton pending={pending}>Simpan Pengeluaran</SubmitButton>
        </div>
      </div>
    </form>
  );
}
