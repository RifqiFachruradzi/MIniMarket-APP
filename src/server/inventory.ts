import { eq } from "drizzle-orm";
import { products, stockMovements } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { Tx } from "./ledger";

type MovementType = (typeof stockMovements.$inferInsert)["type"];

async function getProduct(tx: Tx, productId: number) {
  const p = await tx.select().from(products).where(eq(products.id, productId)).get();
  if (!p) throw new AppError("Produk tidak ditemukan.");
  return p;
}

/**
 * Barang masuk. Harga pokok dihitung ulang dengan metode rata-rata tertimbang (moving average).
 * Mengembalikan nilai persediaan yang bertambah.
 */
export async function stockIn(
  tx: Tx,
  args: { productId: number; qty: number; unitCost: number; date: string; type: MovementType; reference: string; note?: string },
) {
  if (args.qty <= 0) throw new AppError("Jumlah barang masuk harus lebih dari 0.");
  const p = await getProduct(tx, args.productId);
  const newStock = p.stock + args.qty;
  const newValue = p.stockValue + args.qty * args.unitCost;
  const newAvg = Math.round(newValue / newStock);

  await tx.update(products).set({ stock: newStock, stockValue: newValue, avgCost: newAvg }).where(eq(products.id, p.id)).run();
  await tx.insert(stockMovements)
    .values({
      productId: p.id,
      date: args.date,
      type: args.type,
      reference: args.reference,
      qtyIn: args.qty,
      unitCost: args.unitCost,
      balance: newStock,
      note: args.note,
    })
    .run();
  return args.qty * args.unitCost;
}

/**
 * Barang keluar pada harga pokok rata-rata.
 * Mengembalikan total harga pokok yang dikeluarkan (`cost`) dan harga per unit (`unitCost`).
 */
export async function stockOut(
  tx: Tx,
  args: { productId: number; qty: number; date: string; type: MovementType; reference: string; note?: string },
) {
  if (args.qty <= 0) throw new AppError("Jumlah barang keluar harus lebih dari 0.");
  const p = await getProduct(tx, args.productId);
  if (p.stock < args.qty) {
    throw new AppError(`Stok ${p.name} tidak mencukupi (tersedia ${p.stock} ${p.unit}).`);
  }
  const newStock = p.stock - args.qty;
  // Bila stok habis, keluarkan seluruh sisa nilai agar tidak ada selisih pembulatan
  const cost = newStock === 0 ? p.stockValue : Math.min(p.stockValue, p.avgCost * args.qty);
  const unitCost = Math.round(cost / args.qty);
  await tx.update(products)
    .set({ stock: newStock, stockValue: p.stockValue - cost })
    .where(eq(products.id, p.id))
    .run();
  await tx.insert(stockMovements)
    .values({
      productId: p.id,
      date: args.date,
      type: args.type,
      reference: args.reference,
      qtyOut: args.qty,
      unitCost,
      balance: newStock,
      note: args.note,
    })
    .run();
  return { cost, unitCost, product: p };
}
