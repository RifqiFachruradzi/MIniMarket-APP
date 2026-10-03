"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { parseItems } from "@/lib/items";
import { createGoodsIssue } from "@/server/transactions";

export async function submitGoodsIssue(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = parseItems(formData.get("items"));
  if ("error" in parsed) return { error: parsed.error };
  try {
    createGoodsIssue({
      date: String(formData.get("date")),
      reason: String(formData.get("reason") ?? ""),
      note: String(formData.get("note") ?? ""),
      items: parsed.items.map((i) => ({ productId: i.productId, qty: i.qty })),
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect("/pengeluaran-barang?saved=1");
}
