import { CircleAlert, CircleCheck } from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { ReportPaper, SectionBlock, TotalRow } from "@/components/report";
import { PageHeader, PeriodFilter } from "@/components/ui";
import { formatDate, today } from "@/lib/format";
import { balanceSheet } from "@/server/reports";

export const metadata = { title: "Neraca" };

export default async function BalanceSheetPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to = today() } = await searchParams;
  const bs = await balanceSheet(to);
  return (
    <>
      <PageHeader title="Neraca (Balance Sheet)" description="Posisi aset, kewajiban, dan ekuitas pada tanggal tertentu." actions={<><PeriodFilter to={to} single /><PrintButton /></>} />
      <div className={`no-print mx-auto mb-4 flex max-w-3xl items-center gap-2 rounded-md px-3 py-2 text-sm ring-1 ${bs.balanced ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
        {bs.balanced ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />}
        {bs.balanced ? "Neraca seimbang: Total Aset = Total Kewajiban + Ekuitas." : "Peringatan: neraca tidak seimbang."}
      </div>
      <ReportPaper title="Neraca" period={`Per ${formatDate(to, { day: "numeric", month: "long", year: "numeric" })}`}>
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Aset</h3>
        <SectionBlock section={bs.currentAssets} totalLabel="Jumlah Aset Lancar" />
        <SectionBlock section={bs.fixedAssets} totalLabel="Jumlah Aset Tetap" />
        <TotalRow label="TOTAL ASET" value={bs.totalAssets} strong double />

        <h3 className="mt-10 mb-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Kewajiban & Ekuitas</h3>
        <SectionBlock section={bs.liabilities} totalLabel="Jumlah Kewajiban" />
        <SectionBlock section={bs.equity} totalLabel="Jumlah Ekuitas" />
        <TotalRow label="TOTAL KEWAJIBAN & EKUITAS" value={bs.totalLiabilitiesEquity} strong double />
      </ReportPaper>
    </>
  );
}
