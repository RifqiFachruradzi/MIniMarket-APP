"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/errors";
import { optionalId } from "@/lib/items";
import { createCashTransaction } from "@/server/transactions";

export async function submitCashTransaction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const type = String(formData.get("type"));
  if (type !== "in" && type !== "out" && type !== "transfer") return { error: "Jenis transaksi tidak valid." };
  const cashAccountId = optionalId(formData.get("cashAccountId"));
  const counterAccountId = optionalId(formData.get("counterAccountId"));
  if (!cashAccountId || !counterAccountId) return { error: "Lengkapi akun kas dan akun lawan." };
  try {
    const { number } = createCashTransaction({
      date: String(formData.get("date")),
      type,
      cashAccountId,
      counterAccountId,
      amount: Number(formData.get("amount")),
      description: String(formData.get("description") ?? ""),
    });
    revalidatePath("/", "layout");
    return { success: `Transaksi ${number} berhasil disimpan.` };
  } catch (err) {
    return toActionError(err);
  }
}
