import { asc, eq } from "drizzle-orm";
import { db, query } from "@/db";
import { accounts, customers, products, suppliers } from "@/db/schema";

export async function productCategories() {
  return ((await query(`SELECT DISTINCT category FROM products ORDER BY category`, [])) as { category: string }[]).map((r) => r.category);
}

export async function activeProducts() {
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name)).all();
}

export async function cashAccountOptions() {
  return db.select({ id: accounts.id, code: accounts.code, name: accounts.name }).from(accounts).where(eq(accounts.isCash, true)).orderBy(asc(accounts.code)).all();
}

export async function supplierOptions() {
  return db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).orderBy(asc(suppliers.name)).all();
}

export async function customerOptions() {
  return db.select({ id: customers.id, name: customers.name }).from(customers).orderBy(asc(customers.name)).all();
}
