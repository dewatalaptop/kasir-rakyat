import type { ComponentType } from "react";
import { ChartIcon, GridIcon, HelpIcon, HomeIcon, ListIcon, ReceiptIcon, SettingsIcon, StoreIcon, TagIcon, WalletIcon, type IconProps } from "../ui/icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  end?: boolean;
}

// One source of truth for the desktop sidebar and the mobile "Menu" home.
export const CASHIER_NAV: NavItem[] = [
  { to: "/kasir", label: "Kasir", icon: StoreIcon, end: true },
  { to: "/kasir/riwayat", label: "Riwayat Hari Ini", icon: ReceiptIcon },
];

// Admin destinations sit behind the admin-password gate (AdminAuthGuard) —
// linking to them from the sidebar is fine, the gate handles the rest.
export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/admin/produk", label: "Produk", icon: GridIcon },
  { to: "/admin/kategori", label: "Kategori", icon: TagIcon },
  { to: "/admin/transaksi", label: "Transaksi", icon: ListIcon },
  { to: "/admin/laporan", label: "Laporan", icon: ChartIcon },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: SettingsIcon },
];

export const EXTRA_NAV: NavItem[] = [
  { to: "/bantuan", label: "Bantuan", icon: HelpIcon },
  { to: "/admin/akun", label: "Akun & Langganan", icon: WalletIcon },
];
