"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { optionalId } from "@/lib/items";
import { paySupplier } from "@/server/transactions";

export async function submitSupplierPayment(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const receiptId = optionalId(formData.get("docId"));
  const cashAccountId = optionalId(formData.get("cashAccountId"));
  if (!receiptId || !cashAccountId) return { error: "Pilih dokumen penerimaan dan akun pembayaran." };
  try {
    const { number } = paySupplier({
      date: String(formData.get("date")),
      receiptId,
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
