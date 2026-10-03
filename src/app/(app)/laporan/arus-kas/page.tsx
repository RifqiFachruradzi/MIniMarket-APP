import { PrintButton } from "@/components/print-button";
import { ReportPaper, SectionBlock, TotalRow } from "@/components/report";
import { PageHeader, PeriodFilter } from "@/components/ui";
import { formatDate, startOfMonth, today } from "@/lib/format";
import { cashFlow } from "@/server/reports";

export const metadata = { title: "Arus Kas" };

export default async function CashFlowPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || startOfMonth();
  const to = sp.to || today();
  const cf = await cashFlow(from, to);
  const fmt = (d: string) => formatDate(d, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Laporan Arus Kas (Cash Flow)" description="Metode langsung: penerimaan dan pengeluaran kas & bank per aktivitas." actions={<><PeriodFilter from={from} to={to} /><PrintButton /></>} />
      <ReportPaper title="Laporan Arus Kas" period={`Periode ${fmt(from)} s.d. ${fmt(to)}`}>
        <SectionBlock section={cf.operating} totalLabel="Kas Bersih dari Aktivitas Operasi" />
        <SectionBlock section={cf.investing} totalLabel="Kas Bersih dari Aktivitas Investasi" />
        <SectionBlock section={cf.financing} totalLabel="Kas Bersih dari Aktivitas Pendanaan" />
        <TotalRow label="KENAIKAN (PENURUNAN) BERSIH KAS" value={cf.netChange} strong />
        <TotalRow label="Saldo kas & bank awal periode" value={cf.opening} />
        <TotalRow label="SALDO KAS & BANK AKHIR PERIODE" value={cf.closing} strong double />
      </ReportPaper>
    </>
  );
}
