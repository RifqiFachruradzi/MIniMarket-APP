import { Lock } from "lucide-react";
import { sqlite } from "@/db";
import { ActionForm, SubmitButton } from "@/components/form";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ACCOUNT_TYPE_LABEL, CASHFLOW_LABEL } from "@/lib/accounts";
import { accounting } from "@/lib/format";
import { saveAccount } from "../actions";

export const metadata = { title: "Bagan Akun" };

const GROUP_LABEL: Record<string, string> = { current: "Lancar", fixed: "Tetap / Jangka Panjang", cogs: "HPP", operating: "Operasional", other: "Lain-lain" };

export default function AccountsPage() {
  const rows = sqlite
    .prepare(
      `SELECT a.id, a.code, a.name, a.type, a.report_group AS "group", a.cashflow, a.is_cash AS isCash, a.is_system AS isSystem,
              COALESCE(SUM(l.debit),0) AS debit, COALESCE(SUM(l.credit),0) AS credit
         FROM accounts a LEFT JOIN journal_lines l ON l.account_id = a.id GROUP BY a.id ORDER BY a.code`,
    )
    .all() as { id: number; code: string; name: string; type: string; group: string | null; cashflow: string; isCash: number; isSystem: number; debit: number; credit: number }[];
  const types = ["asset", "liability", "equity", "revenue", "expense"];

  return (
    <>
      <PageHeader title="Bagan Akun (Chart of Accounts)" description="Struktur akun buku besar beserta saldo berjalan." />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card title="Tambah Akun" description="Contoh: rekening bank baru, jenis beban baru." className="h-fit">
          <ActionForm action={saveAccount}>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <label className="block">
                <span className="label">Kode</span>
                <input name="code" required placeholder="6-1600" className="input font-mono" />
              </label>
              <label className="block">
                <span className="label">Nama Akun</span>
                <input name="name" required className="input" placeholder="Beban Pemasaran" />
              </label>
            </div>
            <label className="block">
              <span className="label">Tipe</span>
              <select name="type" className="input" defaultValue="expense">
                {types.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Kelompok Laporan</span>
              <select name="group" className="input" defaultValue="operating">
                {Object.entries(GROUP_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Klasifikasi Arus Kas</span>
              <select name="cashflow" className="input" defaultValue="operating">
                {Object.entries(CASHFLOW_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isCash" className="size-4 accent-zinc-900" /> Akun kas / rekening bank
            </label>
            <SubmitButton className="btn-primary w-full">Tambah Akun</SubmitButton>
          </ActionForm>
        </Card>
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Akun</th>
                  <th>Kelompok</th>
                  <th>Arus Kas</th>
                  <th className="num">Saldo</th>
                </tr>
              </thead>
              {types.map((t) => (
                <tbody key={t}>
                  <tr className="bg-zinc-50">
                    <td colSpan={5} className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                      {ACCOUNT_TYPE_LABEL[t]}
                    </td>
                  </tr>
                  {rows
                    .filter((r) => r.type === t)
                    .map((r) => {
                      const bal = t === "asset" || t === "expense" ? r.debit - r.credit : r.credit - r.debit;
                      return (
                        <tr key={r.id}>
                          <td className="font-mono text-xs">{r.code}</td>
                          <td>
                            <span className="inline-flex items-center gap-2">
                              {r.name}
                              {r.isCash ? <Badge tone="blue">Kas/Bank</Badge> : null}
                              {r.isSystem ? (
                                <span title="Akun sistem, diposting otomatis">
                                  <Lock className="size-3.5 text-zinc-400" />
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="text-zinc-500">{r.group ? GROUP_LABEL[r.group] : "-"}</td>
                          <td className="text-zinc-500">{CASHFLOW_LABEL[r.cashflow]}</td>
                          <td className="num font-medium">{accounting(bal)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
