"use client";

import { Lock, Mail } from "lucide-react";
import { FormAlert, SubmitButton, useActionForm } from "@/components/form";
import { login } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useActionForm(login);
  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="label">Email</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="email" type="email" autoComplete="email" required placeholder="nama@minimarket.id" className="input pl-9" />
        </div>
      </label>
      <label className="block">
        <span className="label">Password</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className="input pl-9" />
        </div>
      </label>
      <SubmitButton pending={pending} className="btn-primary w-full py-2.5" pendingText="Memeriksa...">
        Masuk
      </SubmitButton>
    </form>
  );
}
