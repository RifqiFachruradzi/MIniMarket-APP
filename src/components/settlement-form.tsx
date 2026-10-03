"use client";

import { useEffect, useRef, useState } from "react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import type { ActionState } from "@/lib/errors";
import { rupiah } from "@/lib/format";

type Doc = { id: number; label: string; party: string; outstanding: number };

/** Form pelunasan dokumen (piutang pelanggan / hutang pemasok) */
export function SettlementForm({
  action,
  documents,
  cashAccounts,
  defaultDocId,
  today,
  docLabel,
  accountLabel,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  documents: Doc[];
  cashAccounts: { id: number; name: string }[];
  defaultDocId?: number;
  today: string;
  docLabel: string;
  accountLabel: string;
  submitLabel: string;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const initial = documents.find((d) => d.id === defaultDocId) ?? null;
  const [docId, setDocId] = useState<number | "">(initial?.id ?? "");
  const [amount, setAmount] = useState<number | "">(initial?.outstanding ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const doc = documents.find((d) => d.id === docId);

  useEffect(() => {
    if (state?.success) {
      setDocId("");
      setAmount("");
    }
  }, [state]);

  if (documents.length === 0 && !state?.success) {
    return <p className="text-sm text-zinc-500">Tidak ada dokumen yang perlu dilunasi.</p>;
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <FormAlert state={state} />
      <label className="block">
        <span className="label">{docLabel}</span>
        <select
          name="docId"
          required
          value={docId}
          onChange={(e) => {
            const id = Number(e.target.value);
            setDocId(id);
            setAmount(documents.find((d) => d.id === id)?.outstanding ?? "");
          }}
          className="input"
        >
          <option value="" disabled>
            Pilih dokumen...
          </option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} — {d.party} ({rupiah(d.outstanding)})
            </option>
          ))}
        </select>
      </label>
      {doc && (
        <div className="flex justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200">
          <span className="text-zinc-500">Sisa tagihan</span>
          <span className="font-semibold tabular-nums">{rupiah(doc.outstanding)}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Tanggal</span>
          <input type="date" name="date" defaultValue={today} required className="input" />
        </label>
        <label className="block">
          <span className="label">{accountLabel}</span>
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
        <span className="label">Nominal (Rp)</span>
        <input
          type="number"
          name="amount"
          min={1}
          max={doc?.outstanding}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : Math.round(Number(e.target.value)))}
          className="input text-right text-base tabular-nums"
        />
      </label>
      <label className="block">
        <span className="label">Catatan</span>
        <input name="note" className="input" placeholder="Opsional" />
      </label>
      <SubmitButton pending={pending} className="btn-primary w-full">{submitLabel}</SubmitButton>
    </form>
  );
}
