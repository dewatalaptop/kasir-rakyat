import { NavLink, useNavigate } from "react-router-dom";
import {
  ChartIcon,
  CloseIcon,
  GridIcon,
  HelpIcon,
  HomeIcon,
  ListIcon,
  LockIcon,
  LogoutIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "../ui/icons";
import { signOutUser } from "../../lib/auth";
import { clearAdminUnlocked } from "../../lib/adminAuth";
import { useAccess } from "../../context/AccessContext";
import type { Requirement } from "../../lib/permissions";

const ITEMS: { to: string; label: string; icon: typeof HomeIcon; end?: boolean; need?: Requirement }[] = [
  { to: "/admin", label: "Dashboard", icon: HomeIcon, end: true, need: "laporan" },
  { to: "/admin/produk", label: "Produk", icon: GridIcon, need: "produk" },
  { to: "/admin/kategori", label: "Kategori", icon: ListIcon, need: "produk" },
  { to: "/admin/transaksi", label: "Transaksi", icon: ReceiptIcon, need: "riwayat" },
  { to: "/admin/laporan", label: "Laporan", icon: ChartIcon, need: "laporan" },
  { to: "/admin/kasir", label: "Kasir & Izin", icon: UsersIcon, need: "owner" },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: SettingsIcon, need: "owner" },
  { to: "/bantuan", label: "Bantuan", icon: HelpIcon },
  { to: "/admin/akun", label: "Akun", icon: WalletIcon, need: "owner" },
];

// Hamburger/slide-out stack — the admin back-office has 8 destinations,
// too many for a bottom-tab bar (ideal max ~5). Matches this ecosystem's
// own prior-POS precedent for exactly this nav-item-count tradeoff.
export function AdminDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { can } = useAccess();

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex h-full w-72 flex-col bg-[var(--surface)] p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-extrabold text-[var(--brand-600)]">Kasir Rakyat</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.filter((i) => !i.need || can(i.need)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium ${
                  isActive ? "bg-[var(--brand-50)] text-[var(--brand-700)]" : "text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            clearAdminUnlocked();
            navigate("/kasir");
          }}
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
        >
          <LockIcon size={20} />
          Kunci Admin
        </button>
        <button
          type="button"
          onClick={async () => {
            await signOutUser();
            navigate("/login");
          }}
          className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--error-bg)]"
        >
          <LogoutIcon size={20} />
          Keluar
        </button>
      </div>
    </div>
  );
}
