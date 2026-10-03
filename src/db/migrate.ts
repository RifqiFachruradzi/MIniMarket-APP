import { migrate } from "drizzle-orm/libsql/migrator";
import { databaseUrl, db } from "./index";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`Migrasi database selesai (${databaseUrl.replace(/\?.*$/, "")}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
