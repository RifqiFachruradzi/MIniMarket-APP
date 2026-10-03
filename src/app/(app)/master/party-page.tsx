import Link from "next/link";
import { Pencil, Users } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import type { ActionState } from "@/lib/errors";
import { rupiah } from "@/lib/format";

type Party = { id: number; name: string; phone: string | null; address: string | null; docs: number; total: number; outstanding: number };

export function PartyPage({
  title,
  description,
  basePath,
  rows,
  editing,
  action,
  totalLabel,
  outstandingLabel,
}: {
  title: string;
  description: string;
  basePath: string;
  rows: Party[];
  editing?: Party;
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  totalLabel: string;
  outstandingLabel: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card title={editing ? `Ubah ${editing.name}` : "Tambah Baru"} className="h-fit">
          <ActionForm action={action} key={editing?.id ?? "new"}>
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="block">
              <span className="label">Nama</span>
              <input name="name" required defaultValue={editing?.name} className="input" />
            </label>
            <label className="block">
              <span className="label">Telepon</span>
              <input name="phone" defaultValue={editing?.phone ?? ""} className="input" />
            </label>
            <label className="block">
              <span className="label">Alamat</span>
              <textarea name="address" rows={3} defaultValue={editing?.address ?? ""} className="input" />
            </label>
            <div className="flex gap-2">
              {editing && (
                <Link href={basePath} className="btn-secondary flex-1">
                  Batal
                </Link>
              )}
              <SubmitButton className="btn-primary flex-1">Simpan</SubmitButton>
            </div>
          </ActionForm>
        </Card>
        <Card bodyClassName="p-0">
          {rows.length === 0 ? (
            <EmptyState title="Belum ada data" icon={Users} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Kontak</th>
                    <th className="num">Transaksi</th>
                    <th className="num">{totalLabel}</th>
                    <th className="num">{outstandingLabel}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={editing?.id === r.id ? "bg-zinc-50" : ""}>
                      <td>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-zinc-500">{r.address}</p>
                      </td>
                      <td className="text-zinc-600">{r.phone ?? "-"}</td>
                      <td className="num">{r.docs}</td>
                      <td className="num">{rupiah(r.total)}</td>
                      <td className={`num font-medium ${r.outstanding > 0 ? "text-amber-700" : "text-zinc-400"}`}>{rupiah(r.outstanding)}</td>
                      <td className="text-right">
                        <Link href={`${basePath}?edit=${r.id}`} className="inline-flex rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" title="Ubah">
                          <Pencil className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
