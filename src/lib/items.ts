import { z } from "zod";

const ItemsSchema = z.array(
  z.object({
    productId: z.number().int().positive(),
    qty: z.number().int().positive("Jumlah barang harus lebih dari 0."),
    price: z.number().int().min(0, "Harga tidak boleh negatif."),
  }),
);

/** Parse & validasi JSON baris barang dari form */
export function parseItems(raw: FormDataEntryValue | null) {
  let json: unknown;
  try {
    json = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { error: "Data barang tidak valid." } as const;
  }
  const parsed = ItemsSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  if (parsed.data.length === 0) return { error: "Tambahkan minimal satu barang." } as const;
  return { items: parsed.data } as const;
}

export function optionalId(v: FormDataEntryValue | null) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
