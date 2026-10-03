import { asc, eq } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { accounts, customers, products, suppliers } from "@/db/schema";

export function productCategories() {
  return (sqlite.prepare(`SELECT DISTINCT category FROM products ORDER BY category`).all() as { category: string }[]).map((r) => r.category);
}

export function activeProducts() {
  return db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name)).all();
}

export function cashAccountOptions() {
  return db.select({ id: accounts.id, code: accounts.code, name: accounts.name }).from(accounts).where(eq(accounts.isCash, true)).orderBy(asc(accounts.code)).all();
}

export function supplierOptions() {
  return db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).orderBy(asc(suppliers.name)).all();
}

export function customerOptions() {
  return db.select({ id: customers.id, name: customers.name }).from(customers).orderBy(asc(customers.name)).all();
}
