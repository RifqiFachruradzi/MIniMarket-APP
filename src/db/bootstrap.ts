/**
 * Dijalankan otomatis saat build (vercel-build):
 *  1. Menjalankan migrasi pada database online (Turso).
 *  2. Bila database masih kosong, membuat data awal lalu mengunggahnya secara batch.
 *     Data dibuat dulu di file SQLite sementara karena jauh lebih cepat daripada
 *     ribuan query satu per satu lewat jaringan.
 *
 * Variabel opsional SEED_MODE: "demo" (default, data contoh 60 hari),
 * "minimal" (hanya akun login & bagan akun), atau "none" (tanpa data).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { copyDatabase, countUsers } from "./copy";
import { databaseAuthToken, remoteDatabaseUrl } from "./env";

const log = (msg: string) => console.log(`[bootstrap] ${msg}`);

function runScript(script: string, env: NodeJS.ProcessEnv, args: string[] = []) {
  const tsx = path.resolve("node_modules/.bin/tsx");
  const res = spawnSync(tsx, [script, ...args], { stdio: "inherit", env });
  if (res.status !== 0) throw new Error(`${script} gagal (exit ${res.status}).`);
}

async function main() {
  const url = remoteDatabaseUrl();
  const mode = (process.env.SEED_MODE || "demo").toLowerCase();

  if (!url || url.startsWith("file:")) {
    if (process.env.VERCEL) {
      console.warn("[bootstrap] PERINGATAN: database Turso belum terhubung — migrasi & data awal dilewati.");
      return;
    }
    log("Database lokal: migrasi + seed.");
    runScript("src/db/migrate.ts", process.env);
    if (mode !== "none") runScript("src/db/seed.ts", process.env, mode === "minimal" ? ["--minimal"] : []);
    return;
  }

  log(`Database: ${url.replace(/^(libsql:\/\/[^/?]+).*$/, "$1")}`);
  runScript("src/db/migrate.ts", process.env);

  const target = createClient({ url, authToken: databaseAuthToken() });
  if ((await countUsers(target)) > 0) {
    log("Database sudah berisi data — pengisian data awal dilewati.");
    return;
  }
  if (mode === "none") {
    log("SEED_MODE=none — database dibiarkan kosong.");
    return;
  }

  // 1) Buat data di file sementara
  const tmpFile = path.join(os.tmpdir(), `minimarket-seed-${Date.now()}.db`);
  const localEnv = { ...process.env, DATABASE_URL: `file:${tmpFile}`, DATABASE_AUTH_TOKEN: "", VERCEL: "" };
  log(`Membuat data awal (${mode}) ...`);
  runScript("src/db/migrate.ts", localEnv);
  runScript("src/db/seed.ts", localEnv, mode === "minimal" ? ["--minimal"] : []);

  // 2) Unggah ke Turso
  log("Mengunggah data ke Turso ...");
  try {
    await copyDatabase(createClient({ url: `file:${tmpFile}` }), target, (m) => log(m));
  } catch (err) {
    // Deploy lain (mis. Preview) yang berjalan bersamaan mungkin sudah lebih dulu mengisi data
    if (/UNIQUE|PRIMARY KEY|constraint/i.test(String(err)) && (await countUsers(target)) > 0) {
      log("Data sudah diisi oleh deploy lain — dilewati.");
      return;
    }
    throw err;
  } finally {
    for (const f of [tmpFile, `${tmpFile}-wal`, `${tmpFile}-shm`]) fs.rmSync(f, { force: true });
  }
  log("Data awal berhasil diisi ke Turso. Login: admin@minimarket.id / admin123");
}

main().catch((err) => {
  const cause = err instanceof Error && err.cause instanceof Error ? ` (penyebab: ${err.cause.message})` : "";
  console.error("[bootstrap] GAGAL:", err instanceof Error ? err.message.split("\n")[0] : err, cause);
  process.exit(1);
});
