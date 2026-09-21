import { NavLink, useNavigate } from "react-router-dom";
import { BrandMark, LockIcon, LogoutIcon, UsersIcon } from "../ui/icons";
import { ADMIN_NAV, CASHIER_NAV, EXTRA_NAV, visibleNav, type NavItem } from "./navItems";
import { useAccess } from "../../context/AccessContext";
import { signOutUser } from "../../lib/auth";
import { useSettings } from "../../context/SettingsContext";

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--sidebar-text-dim)]">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-sm"
                  : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text-strong)]"
              }`
            }
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// Desktop / tablet-landscape sidebar (lg and up). Below lg the app uses the
// bottom tab bar (cashier) or the drawer (admin) instead.
export function SideNav() {
  const navigate = useNavigate();
  const { plan, settings } = useSettings();
  const { can, isOwner, kasirList, logoutKasir } = useAccess();
  const switchable = kasirList.some((k) => k.aktif);
  // Without owner mode the admin links are hidden, so give the owner a visible way in
  // (the admin gate asks for the password).
  const ownerEntry: NavItem[] = isOwner ? [] : [{ to: "/admin/kasir", label: "Mode Pemilik", icon: LockIcon }];
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[var(--sidebar-bg)] px-4 py-5 lg:flex">
      <div className="mb-6 flex items-center gap-3 px-1">
        <BrandMark size={40} />
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold leading-tight text-[var(--sidebar-text-strong)]">Kasir Rakyat</p>
          <p className="truncate text-[11px] text-[var(--sidebar-text-dim)]">{settings.businessName || "Mudah • Lengkap • Fleksibel"}</p>
        </div>
      </div>
      <nav data-tour="nav" className="scrollbar-hide flex-1 overflow-y-auto">
        <NavGroup title="Kasir" items={visibleNav(CASHIER_NAV, can)} />
        <NavGroup title="Kelola" items={visibleNav(ADMIN_NAV, can)} />
        <NavGroup title="Lainnya" items={[...visibleNav(EXTRA_NAV, can), ...ownerEntry]} />
      </nav>
      <div className="border-t border-[var(--sidebar-border)] pt-3">
        <div className="mb-2 flex items-center justify-between px-3 text-[11px] text-[var(--sidebar-text-dim)]">
          <span>Paket</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              plan === "berbayar" ? "bg-[var(--brand-400)] text-[#06281b]" : "bg-white/15 text-white"
            }`}
          >
            {plan === "berbayar" ? "BERBAYAR" : "GRATIS"}
          </span>
        </div>
        {switchable && (
          <button
            type="button"
            onClick={logoutKasir}
            className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white"
          >
            <UsersIcon size={19} />
            Ganti Kasir / Kunci
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await signOutUser();
            navigate("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white"
        >
          <LogoutIcon size={19} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
