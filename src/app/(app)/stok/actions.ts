"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { AppError, toActionError, type ActionState } from "@/lib/errors";

const ProductSchema = z.object({
  id: z.coerce.number().int().optional(),
  sku: z.string().trim().min(1, "SKU wajib diisi.").max(32),
  barcode: z.string().trim().max(64).optional(),
  name: z.string().trim().min(2, "Nama produk minimal 2 karakter.").max(120),
  category: z.string().trim().min(1, "Kategori wajib diisi.").max(60),
  unit: z.string().trim().min(1, "Satuan wajib diisi.").max(20),
  sellPrice: z.coerce.number().int("Harga jual harus bilangan bulat.").min(0, "Harga jual tidak boleh negatif."),
  minStock: z.coerce.number().int().min(0, "Stok minimum tidak boleh negatif."),
  isActive: z.string().optional(),
});

export async function saveProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const raw = Object.fromEntries(formData);
  const parsed = ProductSchema.safeParse({ ...raw, id: raw.id || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, isActive, ...data } = parsed.data;
  let savedId = id;
  try {
    const dup = await db
      .select({ id: products.id })
      .from(products)
      .where(id ? and(eq(products.sku, data.sku), ne(products.id, id)) : eq(products.sku, data.sku))
      .get();
    if (dup) throw new AppError(`SKU ${data.sku} sudah dipakai produk lain.`);
    const values = { ...data, barcode: data.barcode || null, isActive: id ? isActive === "on" : true };
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id)).run();
    } else {
      savedId = (await db.insert(products).values(values).returning({ id: products.id }).get()).id;
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/stok");
  redirect(`/stok/${savedId}?saved=1`);
}
