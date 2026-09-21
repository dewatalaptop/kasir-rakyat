import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useAccess } from "../../context/AccessContext";
import { hasAnyAdminPermission } from "../../lib/permissions";
import { Button } from "../ui/Button";
import { FullPageSpinner } from "../ui/Spinner";
import { OwnerPasswordForm } from "./OwnerPasswordForm";
import { OwnerUnlockForm } from "./OwnerUnlockForm";

// Who gets into the admin area:
//  - the owner, when there is nothing to protect yet (no owner password AND no
//    cashier registered — see `ownerByDefault` in AccessContext), so a
//    first-time user is never asked for a password they never created;
//  - the owner, once the password (set in Pengaturan > Keamanan) was entered
//    this session;
//  - a registered kasir with at least one admin permission (supervisor/manajer,
//    signed in with their PIN) — each admin page then checks its OWN permission
//    (see RequirePermission). Owner-only pages never open for them.
// See src/lib/adminAuth.ts for why the unlock is sessionStorage-scoped, and its
// own comment for what this is and isn't meant to defend against.
export function AdminAuthGuard() {
  const { loading, issue, reconnect } = useSettings();
  const { isOwner, activeKasir, hasOwnerPassword, accessReady } = useAccess();

  if (loading) return <FullPageSpinner />;
  if (isOwner || hasAnyAdminPermission(activeKasir)) return <Outlet />;

  // Not enough data to tell "nothing to protect" from "protected" — never guess
  // open. Almost always a dead Google session; the fix is one tap.
  if (!accessReady) {
    return issue ? <ReconnectPrompt onReconnect={reconnect} /> : <FullPageSpinner />;
  }

  // Unlocking/creating the password flips isOwner (see adminAuth.ts pub/sub),
  // which re-renders this guard straight into the <Outlet />.
  return hasOwnerPassword ? <UnlockPrompt /> : <SetupPrompt />;
}

function Shell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5">
      <div className="shape-card w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-1 text-center font-display text-lg font-bold text-[var(--text)]">{title}</h1>
        <p className="mb-4 text-center text-xs leading-relaxed text-[var(--text-secondary)]">{hint}</p>
        {children}
      </div>
    </div>
  );
}

function ReconnectPrompt({ onReconnect }: { onReconnect: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Sambungkan Google dulu" hint="Sesi Google Sheets-mu berakhir, jadi aplikasi belum bisa memeriksa pengaturan keamanan. Sambungkan ulang untuk lanjut.">
      <Button
        fullWidth
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onReconnect();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Menyambungkan..." : "Sambungkan Google"}
      </Button>
    </Shell>
  );
}

function UnlockPrompt() {
  return (
    <Shell
      title="Masuk sebagai Pemilik"
      hint="Menu ini khusus pemilik usaha. Masukkan password pemilik yang kamu buat di Pengaturan > Keamanan. Tidak ada username — hanya password."
    >
      <OwnerUnlockForm submitLabel="Masuk" />
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-faint)]">
        Lupa password? Buka file Google Sheets usahamu (akun Google yang sama), tab <b>Pengaturan</b>, lalu kosongkan baris <code>admin_password_hash</code>. Setelah itu kamu bisa membuat password baru.
      </p>
    </Shell>
  );
}

// Reached only when cashiers are registered but no owner password exists (e.g.
// cashiers were added from another device). The Kasir page normally makes the
// owner create the password before the first cashier, so this is the fallback.
function SetupPrompt() {
  return (
    <Shell
      title="Buat Password Pemilik"
      hint="Sudah ada kasir terdaftar, jadi menu pemilik perlu dikunci supaya kasir tidak ikut masuk. Buat password — hanya kamu yang perlu tahu."
    >
      <OwnerPasswordForm submitLabel="Simpan & Masuk" />
    </Shell>
  );
}
