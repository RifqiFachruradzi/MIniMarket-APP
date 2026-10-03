const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function rupiah(value: number | null | undefined) {
  return idr.format(value ?? 0).replace(/ /g, " ");
}

/** Format akuntansi: angka negatif ditampilkan dalam kurung */
export function accounting(value: number | null | undefined) {
  const v = (value ?? 0) || 0; // normalisasi -0 menjadi 0
  if (v < 0) return `(${num.format(Math.abs(v))})`;
  return num.format(v);
}

export function number(value: number | null | undefined) {
  return num.format(value ?? 0);
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!iso) return "-";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("id-ID", opts);
}

/** Tanggal hari ini dalam format YYYY-MM-DD (zona waktu lokal server) */
export function today() {
  return toISODate(new Date());
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function startOfMonth(iso = today()) {
  return `${iso.slice(0, 7)}-01`;
}

export function startOfYear(iso = today()) {
  return `${iso.slice(0, 4)}-01-01`;
}
