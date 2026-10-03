"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Cetak" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary">
      <Printer className="size-4" />
      {label}
    </button>
  );
}
