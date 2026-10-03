import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MiniMarket ERP", template: "%s · MiniMarket ERP" },
  description: "Sistem manajemen minimarket: stok, penjualan, inventory, kas & bank, dan laporan keuangan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
