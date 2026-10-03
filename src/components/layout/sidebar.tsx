"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { NAV } from "./nav";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-8" />
      <div className="leading-tight">
        <p className="text-sm font-semibold text-zinc-900">MiniMarket</p>
        <p className="text-[11px] text-zinc-500">Retail & Accounting</p>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav className="space-y-5">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-zinc-400 uppercase">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition",
                      active ? "bg-zinc-900 font-medium text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <item.icon className={clsx("size-4", active ? "text-emerald-400" : "text-zinc-400")} strokeWidth={2} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBox({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-2.5 border-t border-zinc-200 p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white">{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
        <p className="text-xs text-zinc-500 capitalize">{role}</p>
      </div>
      <form action={logout}>
        <button type="submit" title="Keluar" className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ user }: { user: { name: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-zinc-200 px-3">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks />
        </div>
        <UserBox {...user} />
      </aside>

      {/* Mobile top bar */}
      <div className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100" aria-label="Buka menu">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-zinc-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100" aria-label="Tutup menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <UserBox {...user} />
          </aside>
        </div>
      )}
    </>
  );
}
