import type { Metadata } from "next";
import { BarChart3, Boxes, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-9 rounded-lg ring-1 ring-white/20" />
          <span className="text-base font-semibold">MiniMarket ERP</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">Kelola toko, stok, dan keuangan dalam satu sistem.</h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Setiap transaksi penjualan, pembelian, dan kas tercatat otomatis ke jurnal sehingga laporan keuangan selalu siap kapan saja.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-zinc-300">
            {[
              { icon: Boxes, text: "Stok real-time dengan harga pokok rata-rata" },
              { icon: BarChart3, text: "Neraca, laba rugi & arus kas otomatis" },
              { icon: ShieldCheck, text: "Akses aman berbasis sesi terenkripsi" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-md bg-white/5 ring-1 ring-white/10">
                  <Icon className="size-4 text-emerald-400" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} MiniMarket ERP</p>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="size-9" />
            <span className="text-base font-semibold">MiniMarket ERP</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Masuk ke akun Anda</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Gunakan email dan password yang terdaftar.</p>
          <LoginForm next={next} />
          <div className="mt-8 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-600">
            <p className="font-medium text-zinc-700">Akun demo</p>
            <p className="mt-1 font-mono">admin@minimarket.id / admin123</p>
            <p className="font-mono">kasir@minimarket.id / kasir123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
