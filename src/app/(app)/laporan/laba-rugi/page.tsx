import { PrintButton } from "@/components/print-button";
import { ReportPaper, SectionBlock, TotalRow } from "@/components/report";
import { PageHeader, PeriodFilter } from "@/components/ui";
import { formatDate, startOfMonth, today } from "@/lib/format";
import { incomeStatement } from "@/server/reports";

export const metadata = { title: "Laba Rugi" };

export default async function IncomeStatementPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || startOfMonth();
  const to = sp.to || today();
  const is = incomeStatement(from, to);
  const pct = (v: number) => (is.revenue.total ? `${((v / is.revenue.total) * 100).toFixed(1)}%` : "-");
  const fmt = (d: string) => formatDate(d, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Laporan Laba Rugi (Income Statement)" description="Kinerja pendapatan dan beban selama periode." actions={<><PeriodFilter from={from} to={to} /><PrintButton /></>} />
      <div className="no-print mx-auto mb-4 grid max-w-3xl grid-cols-3 gap-3 text-sm">
        {[
          { label: "Margin Kotor", value: pct(is.grossProfit) },
          { label: "Margin Operasi", value: pct(is.operatingIncome) },
          { label: "Margin Bersih", value: pct(is.netIncome) },
        ].map((m) => (
          <div key={m.label} className="card px-4 py-3">
            <p className="text-xs text-zinc-500">{m.label}</p>
            <p className="text-lg font-semibold tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>
      <ReportPaper title="Laporan Laba Rugi" period={`Periode ${fmt(from)} s.d. ${fmt(to)}`}>
        <SectionBlock section={is.revenue} totalLabel="Jumlah Pendapatan Usaha" />
        <SectionBlock section={is.cogs} totalLabel="Jumlah Harga Pokok Penjualan" negate />
        <TotalRow label="LABA KOTOR" value={is.grossProfit} strong />
        <div className="h-5" />
        <SectionBlock section={is.operating} totalLabel="Jumlah Beban Operasional" negate />
        <TotalRow label="LABA OPERASI" value={is.operatingIncome} strong />
        <div className="h-5" />
        <SectionBlock section={is.otherIncome} totalLabel="Jumlah Pendapatan Lain-lain" />
        <SectionBlock section={is.otherExpense} totalLabel="Jumlah Beban Lain-lain" negate />
        <TotalRow label={is.netIncome >= 0 ? "LABA BERSIH" : "RUGI BERSIH"} value={is.netIncome} strong double />
      </ReportPaper>
    </>
  );
}
