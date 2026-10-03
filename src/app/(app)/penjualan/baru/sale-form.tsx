"use client";

import clsx from "clsx";
import { useState } from "react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import { ItemsEditor, type LineItem, type PickerProduct } from "@/components/items-editor";
import { rupiah } from "@/lib/format";
import { submitSale } from "../actions";

type Option = { id: number; name: string };

export function SaleForm({ products, cashAccounts, customers, today }: { products: PickerProduct[]; cashAccounts: Option[]; customers: Option[]; today: string }) {
  const { state, pending, onSubmit } = useActionForm(submitSale);
  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [discount, setDiscount] = useState(0);
  const [tendered, setTendered] = useState<number | "">("");

  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const change = typeof tendered === "number" ? tendered - total : 0;
  const quick = [total, Math.ceil(total / 10_000) * 10_000, Math.ceil(total / 50_000) * 50_000, Math.ceil(total / 100_000) * 100_000].filter(
    (v, i, arr) => v > 0 && arr.indexOf(v) === i,
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="card p-5">
        <ItemsEditor products={products} items={items} setItems={setItems} mode="sale" />
      </div>

      <div className="card h-fit space-y-4 p-5 xl:sticky xl:top-6">
        <FormAlert state={state} />
        <label className="block">
          <span className="label">Tanggal</span>
          <input type="date" name="date" defaultValue={today} required className="input" />
        </label>

        <div>
          <span className="label">Metode Pembayaran</span>
          <input type="hidden" name="paymentType" value={paymentType} />
          <div className="grid grid-cols-2 rounded-md bg-zinc-100 p-1 text-sm">
            {(["cash", "credit"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPaymentType(t)}
                className={clsx("rounded px-3 py-1.5 font-medium transition", paymentType === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
              >
                {t === "cash" ? "Tunai / Transfer" : "Kredit (Piutang)"}
              </button>
            ))}
          </div>
        </div>

        {paymentType === "cash" ? (
          <label className="block">
            <span className="label">Diterima ke Akun</span>
            <select name="cashAccountId" className="input">
              {cashAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="label">Pelanggan</span>
            <select name="customerId" required className="input" defaultValue="">
              <option value="" disabled>
                Pilih pelanggan...
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {paymentType === "cash" && (
          <label className="block">
            <span className="label">Pelanggan (opsional)</span>
            <select name="customerId" className="input" defaultValue="">
              <option value="">Umum</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <dl className="space-y-2 border-t border-zinc-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Subtotal ({items.reduce((s, l) => s + l.qty, 0)} item)</dt>
            <dd className="tabular-nums">{rupiah(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-zinc-500">Diskon</dt>
            <dd>
              <input
                type="number"
                name="discount"
                min={0}
                value={discount || ""}
                placeholder="0"
                onChange={(e) => setDiscount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                className="input w-32 py-1 text-right tabular-nums"
              />
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-dashed border-zinc-200 pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">{rupiah(total)}</dd>
          </div>
        </dl>

        {paymentType === "cash" && (
          <div className="space-y-2">
            <label className="block">
              <span className="label">Uang Diterima</span>
              <input
                type="number"
                name="tendered"
                min={0}
                value={tendered}
                placeholder={String(total)}
                onChange={(e) => setTendered(e.target.value === "" ? "" : Math.round(Number(e.target.value)))}
                className="input text-right text-base tabular-nums"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quick.map((v) => (
                <button key={v} type="button" onClick={() => setTendered(v)} className="rounded border border-zinc-300 px-2 py-1 text-xs tabular-nums hover:bg-zinc-50">
                  {v === total ? "Uang pas" : rupiah(v)}
                </button>
              ))}
            </div>
            <div className="flex justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
              <span className="text-zinc-500">Kembalian</span>
              <span className={clsx("font-semibold tabular-nums", change < 0 && "text-rose-600")}>{tendered === "" ? rupiah(0) : rupiah(change)}</span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="label">Catatan</span>
          <input name="note" className="input" placeholder="Opsional" />
        </label>

        <SubmitButton pending={pending} className="btn-primary w-full py-2.5" pendingText="Memproses...">
          Simpan Transaksi
        </SubmitButton>
      </div>
    </form>
  );
}
