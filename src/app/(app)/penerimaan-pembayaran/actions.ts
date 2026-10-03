"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { optionalId } from "@/lib/items";
import { receiveCustomerPayment } from "@/server/transactions";

export async function submitCustomerPayment(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const saleId = optionalId(formData.get("docId"));
  const cashAccountId = optionalId(formData.get("cashAccountId"));
  if (!saleId || !cashAccountId) return { error: "Pilih faktur dan akun penerimaan." };
  try {
    const { number } = receiveCustomerPayment({
      date: String(formData.get("date")),
      saleId,
      cashAccountId,
      amount: Number(formData.get("amount")),
      note: String(formData.get("note") ?? ""),
    });
    revalidatePath("/", "layout");
    return { success: `Pembayaran ${number} berhasil dicatat.` };
  } catch (err) {
    return toActionError(err);
  }
}
