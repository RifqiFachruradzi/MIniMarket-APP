"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { optionalId, parseItems } from "@/lib/items";
import { createSale } from "@/server/transactions";

export async function submitSale(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = parseItems(formData.get("items"));
  if ("error" in parsed) return { error: parsed.error };
  const paymentType = formData.get("paymentType") === "credit" ? "credit" : "cash";

  let saleId: number;
  try {
    const sale = createSale({
      date: String(formData.get("date")),
      paymentType,
      cashAccountId: optionalId(formData.get("cashAccountId")),
      customerId: optionalId(formData.get("customerId")),
      discount: Number(formData.get("discount") || 0),
      tendered: paymentType === "cash" ? Number(formData.get("tendered") || 0) || undefined : undefined,
      note: String(formData.get("note") ?? ""),
      userId: session.userId,
      items: parsed.items.map((i) => ({ productId: i.productId, qty: i.qty, price: i.price })),
    });
    saleId = sale.id;
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  redirect(`/penjualan/${saleId}?new=1`);
}
