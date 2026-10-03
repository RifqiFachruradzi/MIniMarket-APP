import clsx from "clsx";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className, bodyClassName }: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={clsx(bodyClassName ?? "p-5")}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "zinc" }: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "zinc" | "emerald" | "amber" | "sky" | "rose";
}) {
  const tones = {
    zinc: "bg-zinc-100 text-zinc-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
        <span className={clsx("grid size-8 place-items-center rounded-md", tones[tone])}>
          <Icon className="size-4" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

const badgeTones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  gray: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge tone="green">Lunas</Badge>;
  if (status === "partial") return <Badge tone="amber">Sebagian</Badge>;
  return <Badge tone="red">Belum Lunas</Badge>;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-500">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary", icon: Icon }: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
}) {
  const cls = { primary: "btn-primary", secondary: "btn-secondary", ghost: "btn-ghost" }[variant];
  return (
    <Link href={href} className={cls}>
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

/** Filter periode berbasis query string (GET) */
export function PeriodFilter({ from, to, single, extra }: { from?: string; to: string; single?: boolean; extra?: React.ReactNode }) {
  return (
    <form className="no-print flex flex-wrap items-end gap-2" method="get">
      {extra}
      {!single && (
        <label className="block">
          <span className="label">Dari</span>
          <input type="date" name="from" defaultValue={from} className="input w-40" />
        </label>
      )}
      <label className="block">
        <span className="label">{single ? "Per tanggal" : "Sampai"}</span>
        <input type="date" name="to" defaultValue={to} className="input w-40" />
      </label>
      <button className="btn-secondary" type="submit">
        Terapkan
      </button>
    </form>
  );
}
