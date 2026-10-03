import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-500">
        <FileQuestion className="size-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-1 text-sm text-zinc-500">Data yang Anda cari tidak tersedia atau sudah dihapus.</p>
      <Link href="/" className="btn-primary mt-6">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
