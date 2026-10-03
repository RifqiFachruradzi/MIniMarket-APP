import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 25;

export function Pagination({ page, total, params }: { page: number; total: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="no-print flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
      <span>
        {from}–{to} dari {total} data
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn-secondary px-2 py-1.5" aria-label="Sebelumnya">
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className="btn-secondary px-2 py-1.5 opacity-40">
            <ChevronLeft className="size-4" />
          </span>
        )}
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className="btn-secondary px-2 py-1.5" aria-label="Berikutnya">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="btn-secondary px-2 py-1.5 opacity-40">
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

export function pageParam(v: string | undefined) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
