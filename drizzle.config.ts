import { defineConfig } from "drizzle-kit";
import { databaseAuthToken, remoteDatabaseUrl } from "./src/db/env";

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: remoteDatabaseUrl() || "file:./data/minimarket.db",
    authToken: databaseAuthToken(),
  },
});
