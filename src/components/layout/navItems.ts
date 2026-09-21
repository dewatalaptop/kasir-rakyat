import type { ComponentType } from "react";
import { ChartIcon, GridIcon, HelpIcon, HomeIcon, ListIcon, ReceiptIcon, SettingsIcon, StoreIcon, TagIcon, UsersIcon, WalletIcon, type IconProps } from "../ui/icons";
import type { Requirement } from "../../lib/permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  end?: boolean;
  // Permission needed to see/open it; omitted = everyone.
  need?: Requirement;
}

// Hide what the current person can't open (owner sees everything).
export function visibleNav(items: NavItem[], can: (req: Requirement) => boolean): NavItem[] {
  return items.filter((i) => !i.need || can(i.need));
}

// One source of truth for the desktop sidebar and the mobile "Menu" home.
export const CASHIER_NAV: NavItem[] = [
  { to: "/kasir", label: "Kasir", icon: StoreIcon, end: true },
  { to: "/kasir/riwayat", label: "Riwayat Hari Ini", icon: ReceiptIcon },
];

// Admin destinations sit behind the admin-password gate (AdminAuthGuard) —
// linking to them from the sidebar is fine, the gate handles the rest.
export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: HomeIcon, end: true, need: "laporan" },
  { to: "/admin/produk", label: "Produk", icon: GridIcon, need: "produk" },
  { to: "/admin/kategori", label: "Kategori", icon: TagIcon, need: "produk" },
  { to: "/admin/transaksi", label: "Transaksi", icon: ListIcon, need: "riwayat" },
  { to: "/admin/laporan", label: "Laporan", icon: ChartIcon, need: "laporan" },
  { to: "/admin/kasir", label: "Kasir & Izin", icon: UsersIcon, need: "owner" },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: SettingsIcon, need: "owner" },
];

export const EXTRA_NAV: NavItem[] = [
  { to: "/bantuan", label: "Bantuan", icon: HelpIcon },
  { to: "/admin/akun", label: "Akun & Langganan", icon: WalletIcon, need: "owner" },
];
