"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/form";
import type { Product } from "@/db/schema";
import { saveProduct } from "./actions";

export function ProductForm({ product, categories }: { product?: Product; categories: string[] }) {
  return (
    <ActionForm action={saveProduct} resetOnSuccess={false}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">SKU / Kode Barang</span>
          <input name="sku" required defaultValue={product?.sku} className="input font-mono uppercase" placeholder="BRS-001" />
        </label>
        <label className="block">
          <span className="label">Barcode (opsional)</span>
          <input name="barcode" defaultValue={product?.barcode ?? ""} className="input font-mono" placeholder="899xxxxxxxxxx" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Nama Produk</span>
          <input name="name" required defaultValue={product?.name} className="input" placeholder="Beras Premium 5 kg" />
        </label>
        <label className="block">
          <span className="label">Kategori</span>
          <input name="category" required list="categories" defaultValue={product?.category ?? ""} className="input" placeholder="Sembako" />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="label">Satuan</span>
          <input name="unit" required defaultValue={product?.unit ?? "pcs"} className="input" placeholder="pcs" />
        </label>
        <label className="block">
          <span className="label">Harga Jual (Rp)</span>
          <input name="sellPrice" type="number" min={0} step={1} required defaultValue={product?.sellPrice} className="input text-right tabular-nums" />
        </label>
        <label className="block">
          <span className="label">Stok Minimum</span>
          <input name="minStock" type="number" min={0} step={1} required defaultValue={product?.minStock ?? 0} className="input text-right tabular-nums" />
        </label>
        {product && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="size-4 rounded border-zinc-300 accent-zinc-900" />
            Produk aktif (dapat dijual)
          </label>
        )}
      </div>
      {!product && (
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 ring-1 ring-zinc-200">
          Stok awal dan harga pokok diisi melalui menu <b>Penerimaan Barang</b> agar tercatat di kartu stok dan jurnal persediaan.
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Link href="/stok" className="btn-secondary">
          Batal
        </Link>
        <SubmitButton>{product ? "Simpan Perubahan" : "Simpan Produk"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
