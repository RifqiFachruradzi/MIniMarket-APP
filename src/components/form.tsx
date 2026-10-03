"use client";

import clsx from "clsx";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/errors";

const PendingContext = createContext(false);

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Menjalankan server action lewat onSubmit (bukan prop `action`) agar isian form
 * tidak di-reset otomatis oleh React ketika aksi mengembalikan error validasi.
 */
export function useActionForm(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, pending, onSubmit };
}

export function SubmitButton({
  children,
  className,
  pendingText = "Menyimpan...",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const inActionForm = useContext(PendingContext);
  const pending = pendingProp ?? (inActionForm || status.pending);
  return (
    <button type="submit" disabled={pending} className={clsx(className ?? "btn-primary")}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingText : children}
    </button>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  const isError = Boolean(state.error);
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role="alert"
      className={clsx(
        "flex items-start gap-2 rounded-md px-3 py-2.5 text-sm",
        isError ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{state.error ?? state.success}</span>
    </div>
  );
}

/**
 * Form generik yang menjalankan server action & menampilkan pesan hasilnya.
 * Form direset otomatis bila aksi berhasil.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      <PendingContext.Provider value={pending}>
        <div className="space-y-4">
          <FormAlert state={state} />
          {children}
        </div>
      </PendingContext.Provider>
    </form>
  );
}
