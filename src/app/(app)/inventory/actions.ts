"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { optionalId } from "@/lib/items";
import { createStockAdjustment } from "@/server/transactions";

export async function submitStockOpname(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const productId = optionalId(formData.get("productId"));
  if (!productId) return { error: "Pilih produk terlebih dahulu." };
  const physical = formData.get("physicalQty");
  if (physical === null || physical === "") return { error: "Isi jumlah stok fisik." };
  try {
    const { number } = await createStockAdjustment({
      date: String(formData.get("date")),
      productId,
      physicalQty: Number(physical),
      note: String(formData.get("note") ?? ""),
    });
    revalidatePath("/", "layout");
    return { success: `Penyesuaian ${number} berhasil disimpan.` };
  } catch (err) {
    return toActionError(err);
  }
}
