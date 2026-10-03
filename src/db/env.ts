/**
 * Membaca konfigurasi database dari environment.
 * Mendukung DATABASE_URL/DATABASE_AUTH_TOKEN, serta variabel dari integrasi Vercel × Turso
 * dengan prefix apa pun, mis. TURSO_DATABASE_URL atau DATABASE_TURSO_DATABASE_URL.
 */
function findBySuffix(suffixes: string[]) {
  for (const suffix of suffixes) {
    const key = Object.keys(process.env).find((k) => k.endsWith(suffix) && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
}

export function remoteDatabaseUrl() {
  return process.env.DATABASE_URL || findBySuffix(["TURSO_DATABASE_URL", "STORAGE_URL"]);
}

export function databaseAuthToken() {
  return process.env.DATABASE_AUTH_TOKEN || findBySuffix(["TURSO_AUTH_TOKEN", "STORAGE_AUTH_TOKEN", "DATABASE_TOKEN"]);
}
