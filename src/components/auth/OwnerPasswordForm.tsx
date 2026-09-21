import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { clearAdminUnlocked, hashPassword, isAdminUnlocked, setAdminUnlocked } from "../../lib/adminAuth";
import { Button } from "../ui/Button";

export const OWNER_PASSWORD_MIN = 4;

// Creates the owner password for the first time. One component so the three
// places that can need it (locked admin area with cashiers registered,
// Pengaturan > Keamanan, "Tambah Kasir Pertama") behave and read the same.
// Saving also unlocks this session — the owner who just made the password
// shouldn't be asked for it a second later.
export function OwnerPasswordForm({ onDone, submitLabel = "Simpan Password" }: { onDone?: () => void; submitLabel?: string }) {
  const { updateSettings } = useSettings();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < OWNER_PASSWORD_MIN) {
      setError(`Password minimal ${OWNER_PASSWORD_MIN} karakter.`);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setBusy(true);
    setError("");
    // Unlock BEFORE the password lands: the moment the hash is saved, "no password
    // yet" stops granting owner rights, and without the unlock already in place the
    // page under the owner would flash to a lock screen and lose what they were doing.
    const wasUnlocked = isAdminUnlocked();
    setAdminUnlocked();
    try {
      await updateSettings({ admin_password_hash: await hashPassword(password) });
      onDone?.();
    } catch (err) {
      if (!wasUnlocked) clearAdminUnlocked();
      setError(err instanceof Error ? err.message : "Gagal menyimpan password.");
    } finally {
      setBusy(false);
    }
  }

  const input = "shape-card border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm";
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password pemilik (baru)"
        autoComplete="new-password"
        aria-label="Password pemilik baru"
        className={input}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Ulangi password"
        autoComplete="new-password"
        aria-label="Ulangi password pemilik"
        className={input}
      />
      {error && (
        <p role="alert" className="text-xs text-[var(--error-text)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !password || !confirm} fullWidth className="mt-1">
        {busy ? "Menyimpan..." : submitLabel}
      </Button>
      <p className="text-[11px] leading-relaxed text-[var(--text-faint)]">
        Tidak ada username — cukup password ini. Lupa? Buka file Google Sheets usahamu, tab <b>Pengaturan</b>, lalu kosongkan baris <code>admin_password_hash</code>.
      </p>
    </form>
  );
}
