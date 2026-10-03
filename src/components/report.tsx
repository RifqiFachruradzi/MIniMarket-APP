import clsx from "clsx";
import { accounting } from "@/lib/format";
import type { ReportSection } from "@/server/reports";

/** Kertas laporan keuangan dengan kop standar */
export function ReportPaper({ title, period, children }: { title: string; period: string; children: React.ReactNode }) {
  return (
    <div className="card print-plain mx-auto max-w-3xl px-6 py-8 sm:px-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-zinc-900 uppercase">MiniMarket</p>
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        <p className="text-sm text-zinc-500">{period}</p>
        <p className="mt-1 text-xs text-zinc-400">(dalam Rupiah)</p>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function SectionBlock({ section, totalLabel, negate = false, showEmpty = true }: { section: ReportSection; totalLabel?: string; negate?: boolean; showEmpty?: boolean }) {
  const sign = negate ? -1 : 1;
  if (!showEmpty && section.lines.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-1.5 font-semibold text-zinc-900">{section.title}</p>
      {section.lines.length === 0 && <p className="py-1 pl-4 text-zinc-400 italic">Tidak ada</p>}
      {section.lines.map((l) => (
        <div key={`${l.code}-${l.name}`} className="flex justify-between py-1 pl-4">
          <span className="text-zinc-700">
            {l.code && <span className="mr-2 font-mono text-xs text-zinc-400">{l.code}</span>}
            {l.name}
          </span>
          <span className="tabular-nums">{accounting(sign * l.amount)}</span>
        </div>
      ))}
      {totalLabel && <TotalRow label={totalLabel} value={sign * section.total} />}
    </div>
  );
}

export function TotalRow({ label, value, strong = false, double = false }: { label: string; value: number; strong?: boolean; double?: boolean }) {
  return (
    <div
      className={clsx(
        "flex justify-between py-1.5",
        strong ? "mt-2 border-t border-zinc-900 font-semibold text-zinc-900" : "border-t border-zinc-200 font-medium",
        double && "border-b-4 border-double border-b-zinc-900",
      )}
    >
      <span>{label}</span>
      <span className={clsx("tabular-nums", value < 0 && "text-rose-600")}>{accounting(value)}</span>
    </div>
  );
}
