"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { optionalId, parseItems } from "@/lib/items";
import { createGoodsReceipt } from "@/server/transactions";

export async function submitGoodsReceipt(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = parseItems(formData.get("items"));
  if ("error" in parsed) return { error: parsed.error };
  const supplierId = optionalId(formData.get("supplierId"));
  if (!supplierId) return { error: "Pilih pemasok terlebih dahulu." };

  let id: number;
  try {
    const result = await createGoodsReceipt({
      date: String(formData.get("date")),
      supplierId,
      supplierInvoice: String(formData.get("supplierInvoice") ?? ""),
      dueDate: String(formData.get("dueDate") ?? ""),
      note: String(formData.get("note") ?? ""),
      payNowAccountId: formData.get("payment") === "cash" ? optionalId(formData.get("cashAccountId")) : null,
      items: parsed.items.map((i) => ({ productId: i.productId, qty: i.qty, unitCost: i.price })),
    });
    id = result.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect(`/penerimaan-barang/${id}?new=1`);
}
