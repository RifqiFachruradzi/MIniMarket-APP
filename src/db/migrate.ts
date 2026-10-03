import { remoteDatabaseUrl } from "./env";

const url = remoteDatabaseUrl();

async function main() {
  if (process.env.VERCEL && !url) {
    // Jangan gagalkan build: aplikasi akan menampilkan pesan jelas saat dijalankan tanpa database.
    console.warn(
      "[migrate] PERINGATAN: DATABASE_URL belum diset di Vercel — migrasi dilewati. " +
        "Hubungkan database Turso (Storage) dengan prefix DATABASE, lalu Redeploy.",
    );
    return;
  }
  // Import dinamis agar pengecekan di atas berjalan sebelum koneksi dibuat
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { databaseUrl, db } = await import("./index");
  console.log(`[migrate] Menjalankan migrasi ke ${databaseUrl.replace(/^(libsql:\/\/[^/?]+).*$/, "$1")} ...`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Migrasi database selesai.");
}

main().catch((err) => {
  const cause = err instanceof Error && err.cause instanceof Error ? ` (penyebab: ${err.cause.message})` : "";
  console.error("[migrate] GAGAL:", err instanceof Error ? err.message.split("\n")[0] : err, cause);
  process.exit(1);
});
