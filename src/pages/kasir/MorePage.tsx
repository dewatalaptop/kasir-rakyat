import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../context/SettingsContext";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/Button";
import { BrandMark, LockIcon, LogoutIcon, UsersIcon } from "../../components/ui/icons";
import { ADMIN_NAV, CASHIER_NAV, EXTRA_NAV, visibleNav, type NavItem } from "../../components/layout/navItems";
import { useAccess } from "../../context/AccessContext";
import { signOutUser } from "../../lib/auth";
import { QuickStartCard } from "../../components/help/QuickStartCard";

const TILE_TONES = [
  "bg-[var(--kpi-green-bg)] text-[var(--kpi-green-fg)]",
  "bg-[var(--kpi-blue-bg)] text-[var(--kpi-blue-fg)]",
  "bg-[var(--kpi-violet-bg)] text-[var(--kpi-violet-fg)]",
  "bg-[var(--kpi-amber-bg)] text-[var(--kpi-amber-fg)]",
];

// Phone "Menu" home: a friendly grid of every destination (the phone has no
// sidebar), plus plan status. Admin tiles still go through the admin gate.
const TILES: NavItem[] = [CASHIER_NAV[1], ...ADMIN_NAV, ...EXTRA_NAV];

export function MorePage() {
  const { user } = useAuth();
  const { settings, plan } = useSettings();
  const { can, isOwner, logoutKasir, kasirList } = useAccess();
  const switchable = kasirList.some((k) => k.aktif);
  const ownerTile: NavItem[] = isOwner ? [] : [{ to: "/admin/kasir", label: "Mode Pemilik", icon: LockIcon }];
  const navigate = useNavigate();
  const firstName = (user?.displayName ?? user?.email ?? "Kasir").split(" ")[0];

  return (
    <div>
      <TopBar title="Menu" />
      <div className="flex flex-col gap-4 px-4 pb-6 pt-2 lg:mx-auto lg:max-w-3xl lg:px-6">
        <div className="shape-card flex items-center gap-3 bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-500)] p-4 text-white shadow-md">
          <BrandMark size={46} className="!bg-white/20" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-extrabold leading-tight">Halo, {firstName}</p>
            <p className="truncate text-xs text-white/85">{settings.businessName || "Lengkapi nama usaha di Pengaturan"}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${plan === "berbayar" ? "bg-white text-[var(--brand-700)]" : "bg-black/20 text-white"}`}>
            {plan === "berbayar" ? "BERBAYAR" : "GRATIS"}
          </span>
        </div>

        <QuickStartCard />

        <div className="grid grid-cols-3 gap-3">
          {[...visibleNav(TILES, can), ...ownerTile].map((item, i) => (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className="shape-card card-shadow flex min-h-[96px] flex-col items-center justify-center gap-2 border border-[var(--border)] bg-[var(--surface)] p-2 text-center transition active:scale-[0.97]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${TILE_TONES[i % TILE_TONES.length]}`}>
                <item.icon size={22} />
              </span>
              <span className="text-[12px] font-bold leading-tight text-[var(--text)]">{item.label}</span>
            </button>
          ))}
        </div>

        {plan !== "berbayar" && (
          <div className="shape-card border border-[var(--brand-200)] bg-[var(--brand-50)] p-4">
            <p className="font-display text-sm font-extrabold text-[var(--brand-700)]">Kelola usaha lebih lengkap</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              Versi berbayar: produk tanpa batas, laporan 30/90 hari, struk tanpa watermark, dan foto produk di aplikasi Android.
            </p>
            <Button onClick={() => navigate("/admin/akun")} variant="soft" shape="pill" className="mt-3">
              Lihat paket
            </Button>
          </div>
        )}

        {switchable && (
          <Button onClick={logoutKasir} variant="soft" fullWidth icon={<UsersIcon size={18} />}>
            Ganti Kasir / Kunci
          </Button>
        )}
        <Button
          onClick={async () => {
            await signOutUser();
            navigate("/login");
          }}
          variant="ghost"
          fullWidth
          className="!text-[var(--danger)]"
          icon={<LogoutIcon size={18} />}
        >
          Keluar
        </Button>
      </div>
    </div>
  );
}
