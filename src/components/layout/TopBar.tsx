import { SearchIcon, BrandMark } from "../ui/icons";
import { useAuth } from "../../hooks/useAuth";
import { useNow } from "../../hooks/useNow";
import { useSettings } from "../../context/SettingsContext";
import { useAccess } from "../../context/AccessContext";
import { ROLE_LABEL } from "../../lib/permissions";

interface TopBarProps {
  title: string;
  subtitle?: string;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
}

// Page header: title (+ optional search) on the left, date/time and the
// signed-in user on the right. On phones it collapses to title + search.
export function TopBar({ title, subtitle, search }: TopBarProps) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { activeKasir, kasirList, logoutKasir, isOwner } = useAccess();
  const switchable = kasirList.some((k) => k.aktif);
  const displayName = activeKasir?.nama ?? user?.displayName ?? user?.email ?? "Kasir";
  const displaySub = activeKasir ? ROLE_LABEL[activeKasir.role] : isOwner && switchable ? "Pemilik" : settings.businessName || "Kasir";
  const now = useNow();
  const date = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pb-2 pt-4 lg:px-6 lg:pt-5">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
        <span className="lg:hidden">
          <BrandMark size={38} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-extrabold leading-tight text-[var(--text)] lg:text-xl">{title}</h1>
          {subtitle && <p className="truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
      </div>
      {search && (
        <label data-tour="search" className="relative order-3 w-full min-w-0 sm:order-none sm:mx-2 sm:w-auto sm:min-w-[11rem] sm:flex-1 sm:max-w-md">
          <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Cari produk..."}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand-400)] focus:ring-2 focus:ring-[var(--brand-100)]"
          />
        </label>
      )}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right leading-tight 2xl:block">
          <p className="text-[11px] font-medium capitalize text-[var(--text-secondary)]">{date}</p>
          <p className="font-tabular text-sm font-bold text-[var(--text)]">{time}</p>
        </div>
        <button
          type="button"
          disabled={!switchable}
          onClick={logoutKasir}
          title={switchable ? "Ganti kasir / kunci" : undefined}
          aria-label={switchable ? `Ganti kasir (saat ini ${displayName})` : displayName}
          className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-1.5 pr-3 text-left disabled:cursor-default"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-100)] text-xs font-extrabold text-[var(--brand-700)]">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="max-w-[9rem] truncate text-xs font-bold text-[var(--text)]">{displayName}</p>
            <p className="max-w-[9rem] truncate text-[10px] text-[var(--text-secondary)]">{displaySub}{switchable ? " · Ganti" : ""}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
