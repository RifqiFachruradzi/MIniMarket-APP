import {
  ArrowLeftRight,
  BookOpen,
  ClipboardList,
  FileBarChart,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Package,
  PackageMinus,
  PackagePlus,
  Scale,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { label: "Ringkasan", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Transaksi",
    items: [
      { href: "/penjualan", label: "Penjualan", icon: ShoppingCart },
      { href: "/penerimaan-barang", label: "Penerimaan Barang", icon: PackagePlus },
      { href: "/pengeluaran-barang", label: "Pengeluaran Barang", icon: PackageMinus },
      { href: "/penerimaan-pembayaran", label: "Penerimaan Pembayaran", icon: HandCoins },
      { href: "/pembayaran-pemasok", label: "Pembayaran Pemasok", icon: Wallet },
      { href: "/kas-bank", label: "Kas & Bank", icon: Landmark },
    ],
  },
  {
    label: "Persediaan",
    items: [
      { href: "/stok", label: "Stok Barang", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Warehouse },
    ],
  },
  {
    label: "Laporan",
    items: [
      { href: "/laporan/neraca", label: "Neraca", icon: Scale },
      { href: "/laporan/laba-rugi", label: "Laba Rugi", icon: FileBarChart },
      { href: "/laporan/arus-kas", label: "Arus Kas", icon: ArrowLeftRight },
      { href: "/laporan/jurnal", label: "Jurnal Umum", icon: BookOpen },
    ],
  },
  {
    label: "Master Data",
    items: [
      { href: "/master/pemasok", label: "Pemasok", icon: Truck },
      { href: "/master/pelanggan", label: "Pelanggan", icon: Users },
      { href: "/master/akun", label: "Bagan Akun", icon: ClipboardList },
    ],
  },
];
