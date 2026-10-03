"use client";

import clsx from "clsx";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import { submitCashTransaction } from "./actions";

type Acc = { id: number; code: string; name: string; type: string };

const TYPES = [
  { key: "in", label: "Kas Masuk", icon: ArrowDownLeft },
  { key: "out", label: "Kas Keluar", icon: ArrowUpRight },
  { key: "transfer", label: "Transfer", icon: ArrowLeftRight },
] as const;

export function CashForm({ cashAccounts, counterAccounts, today }: { cashAccounts: Acc[]; counterAccounts: Acc[]; today: string }) {
  const { state, pending, onSubmit } = useActionForm(submitCashTransaction);
  const [type, setType] = useState<"in" | "out" | "transfer">("out");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  const options =
    type === "transfer"
      ? cashAccounts
      : counterAccounts.filter((a) => (type === "in" ? ["revenue", "equity", "liability"].includes(a.type) : ["expense", "equity", "liability", "asset"].includes(a.type)));
  const groups = [...new Set(options.map((o) => o.type))];
  const GROUP_LABEL: Record<string, string> = { asset: "Aset", liability: "Kewajiban", equity: "Ekuitas", revenue: "Pendapatan", expense: "Beban" };

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-3 gap-1 rounded-md bg-zinc-100 p-1 text-xs">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 font-medium transition",
              type === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <label className="block">
          <span className="label">Tanggal</span>
          <input type="date" name="date" defaultValue={today} required className="input" />
        </label>
        <label className="block">
          <span className="label">{type === "in" ? "Masuk ke" : type === "out" ? "Keluar dari" : "Dari akun"}</span>
          <select name="cashAccountId" className="input">
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">{type === "transfer" ? "Ke akun" : type === "in" ? "Sumber dana (akun kredit)" : "Keperluan (akun debit)"}</span>
        <select name="counterAccountId" key={type} required defaultValue="" className="input">
          <option value="" disabled>
            Pilih akun...
          </option>
          {type === "transfer"
            ? options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))
            : groups.map((g) => (
                <optgroup key={g} label={GROUP_LABEL[g]}>
                  {options
                    .filter((o) => o.type === g)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                </optgroup>
              ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Nominal (Rp)</span>
        <input type="number" name="amount" min={1} required className="input text-right text-base tabular-nums" placeholder="0" />
      </label>
      <label className="block">
        <span className="label">Keterangan</span>
        <input name="description" required className="input" placeholder={type === "out" ? "Bayar listrik bulan ini" : type === "in" ? "Setoran modal tambahan" : "Setor kas ke bank"} />
      </label>
      <SubmitButton pending={pending} className="btn-primary w-full">Simpan Transaksi</SubmitButton>
    </form>
  );
}
