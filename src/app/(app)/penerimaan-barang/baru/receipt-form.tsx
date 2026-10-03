"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import { ItemsEditor, type LineItem, type PickerProduct } from "@/components/items-editor";
import { rupiah } from "@/lib/format";
import { submitGoodsReceipt } from "../actions";

type Option = { id: number; name: string };

export function ReceiptForm({ products, suppliers, cashAccounts, today, dueDefault }: { products: PickerProduct[]; suppliers: Option[]; cashAccounts: Option[]; today: string; dueDefault: string }) {
  const { state, pending, onSubmit } = useActionForm(submitGoodsReceipt);
  const [items, setItems] = useState<LineItem[]>([]);
  const [payment, setPayment] = useState<"credit" | "cash">("credit");
  const total = items.reduce((s, l) => s + l.price * l.qty, 0);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormAlert state={state} />
      <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="label">Pemasok</span>
          <select name="supplierId" required defaultValue="" className="input">
            <option value="" disabled>
              Pilih pemasok...
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Tanggal Terima</span>
          <input type="date" name="date" defaultValue={today} required className="input" />
        </label>
        <label className="block">
          <span className="label">No. Faktur Pemasok</span>
          <input name="supplierInvoice" className="input" placeholder="Opsional" />
        </label>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">Barang Diterima</h2>
        <ItemsEditor products={products} items={items} setItems={setItems} mode="receipt" />
      </div>

      <div className="card grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <span className="label">Pembayaran</span>
            <input type="hidden" name="payment" value={payment} />
            <div className="inline-grid grid-cols-2 rounded-md bg-zinc-100 p-1 text-sm">
              {(["credit", "cash"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPayment(t)}
                  className={clsx("rounded px-3 py-1.5 font-medium transition", payment === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
                >
                  {t === "credit" ? "Tempo (Hutang)" : "Bayar Langsung"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {payment === "credit" ? (
              <label className="block">
                <span className="label">Jatuh Tempo</span>
                <input type="date" name="dueDate" defaultValue={dueDefault} className="input" />
              </label>
            ) : (
              <label className="block">
                <span className="label">Dibayar dari Akun</span>
                <select name="cashAccountId" className="input">
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="label">Catatan</span>
              <input name="note" className="input" placeholder="Opsional" />
            </label>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-md bg-zinc-50 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-500">Total Pembelian</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{rupiah(total)}</span>
          </div>
          <div className="flex gap-2">
            <Link href="/penerimaan-barang" className="btn-secondary flex-1">
              Batal
            </Link>
            <SubmitButton pending={pending} className="btn-primary flex-1">Simpan</SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
