import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.STORAGE_URL || "file:./data/minimarket.db",
    authToken:
      process.env.DATABASE_AUTH_TOKEN ||
      process.env.DATABASE_TOKEN ||
      process.env.TURSO_AUTH_TOKEN ||
      process.env.STORAGE_AUTH_TOKEN ||
      process.env.STORAGE_TOKEN,
  },
});
