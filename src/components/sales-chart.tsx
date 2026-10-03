import { formatDate, rupiah } from "@/lib/format";

/** Grafik batang ringan berbasis SVG (tanpa library tambahan) */
export function SalesChart({ data }: { data: { date: string; total: number; cogs: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const niceMax = Math.ceil(max / 500_000) * 500_000;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const H = 220;
  const barGap = 4;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col-reverse justify-between pb-6 text-right text-[11px] text-zinc-400 tabular-nums" style={{ height: H + 24 }}>
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 leading-none">{t >= 1_000_000 ? `${(t / 1_000_000).toLocaleString("id-ID")} jt` : `${Math.round(t / 1000)} rb`}</span>
        ))}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-x-0 top-0 flex flex-col-reverse justify-between" style={{ height: H }}>
          {ticks.map((t) => (
            <div key={t} className="border-t border-dashed border-zinc-200" />
          ))}
        </div>
        <div className="relative flex items-end" style={{ height: H, gap: barGap }}>
          {data.map((d) => {
            const h = (d.total / niceMax) * H;
            const profitH = (Math.max(d.total - d.cogs, 0) / niceMax) * H;
            return (
              <div key={d.date} className="group relative flex h-full flex-1 items-end">
                <div className="relative w-full overflow-hidden rounded-t-sm bg-zinc-200 transition group-hover:bg-zinc-300" style={{ height: h }}>
                  <div className="absolute inset-x-0 bottom-0 bg-zinc-900 group-hover:bg-zinc-700" style={{ height: h - profitH }} />
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-[11px] whitespace-nowrap text-white shadow-lg group-hover:block">
                  <p className="font-medium">{formatDate(d.date, { day: "numeric", month: "short" })}</p>
                  <p className="text-zinc-300">Penjualan {rupiah(d.total)}</p>
                  <p className="text-emerald-300">Laba kotor {rupiah(d.total - d.cogs)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex text-[11px] text-zinc-400" style={{ gap: barGap }}>
          {data.map((d, i) => (
            <span key={d.date} className="flex-1 text-center">
              {i % 5 === 0 || i === data.length - 1 ? formatDate(d.date, { day: "numeric", month: "short" }) : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
