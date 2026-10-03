"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accounts, customers, suppliers } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { AppError, toActionError, type ActionState } from "@/lib/errors";

const PartySchema = z.object({
  id: z.coerce.number().int().optional(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(250).optional(),
});

async function saveParty(kind: "supplier" | "customer", formData: FormData): Promise<ActionState> {
  await requireSession();
  const raw = Object.fromEntries(formData);
  const parsed = PartySchema.safeParse({ ...raw, id: raw.id || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...data } = parsed.data;
  const values = { name: data.name, phone: data.phone || null, address: data.address || null };
  const table = kind === "supplier" ? suppliers : customers;
  try {
    if (id) await db.update(table).set(values).where(eq(table.id, id)).run();
    else await db.insert(table).values(values).run();
  } catch (err) {
    return toActionError(err);
  }
  const path = kind === "supplier" ? "/master/pemasok" : "/master/pelanggan";
  revalidatePath(path);
  if (id) redirect(path);
  return { success: `${kind === "supplier" ? "Pemasok" : "Pelanggan"} berhasil disimpan.` };
}

export async function saveSupplier(_: ActionState, formData: FormData) {
  return saveParty("supplier", formData);
}

export async function saveCustomer(_: ActionState, formData: FormData) {
  return saveParty("customer", formData);
}

const AccountSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d-\d{4}$/, "Format kode akun: 0-0000 (contoh 6-1600)."),
  name: z.string().trim().min(3, "Nama akun minimal 3 karakter.").max(100),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  group: z.enum(["current", "fixed", "cogs", "operating", "other"]),
  cashflow: z.enum(["operating", "investing", "financing"]),
  isCash: z.string().optional(),
});

export async function saveAccount(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireSession();
  const parsed = AccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { isCash, ...data } = parsed.data;
  try {
    if (await db.select().from(accounts).where(eq(accounts.code, data.code)).get()) throw new AppError(`Kode akun ${data.code} sudah dipakai.`);
    if (isCash === "on" && data.type !== "asset") throw new AppError("Akun kas/bank harus bertipe Aset.");
    await db.insert(accounts)
      .values({ ...data, isCash: isCash === "on" })
      .run();
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  return { success: `Akun ${data.code} ${data.name} berhasil ditambahkan.` };
}
