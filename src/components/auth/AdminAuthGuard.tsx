import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { hashPassword, isAdminUnlocked, setAdminUnlocked } from "../../lib/adminAuth";
import { Button } from "../ui/Button";
import { FullPageSpinner } from "../ui/Spinner";

// Three states: no password set yet (first-time setup), password set but
// this session hasn't unlocked it yet (prompt), or already unlocked
// (pass through). See src/lib/adminAuth.ts for why this is
// sessionStorage-scoped, and its own comment for what this is and isn't
// meant to defend against.
export function AdminAuthGuard() {
  const { settings, updateSettings, loading } = useSettings();
  const [unlocked, setUnlocked] = useState(isAdminUnlocked());

  if (loading) return <FullPageSpinner />;
  if (unlocked) return <Outlet />;

  return settings.adminPasswordHash ? (
    <UnlockPrompt onUnlock={() => setUnlocked(true)} />
  ) : (
    <SetupPrompt onDone={() => setUnlocked(true)} updateSettings={updateSettings} />
  );
}

function UnlockPrompt({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useSettings();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const hash = await hashPassword(password);
      if (hash === settings.adminPasswordHash) {
        setAdminUnlocked();
        onUnlock();
      } else {
        setError("Password salah.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5">
      <form onSubmit={handleSubmit} className="shape-card w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-1 text-center font-display text-lg font-bold text-[var(--text)]">Masuk Mode Admin</h1>
        <p className="mb-4 text-center text-xs text-[var(--text-secondary)]">Masukkan password admin untuk melanjutkan.</p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password admin"
          className="shape-card w-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm"
        />
        {error && <p className="mt-2 text-xs text-[var(--error-text)]">{error}</p>}
        <Button type="submit" disabled={busy || !password} fullWidth className="mt-4">
          {busy ? "Memeriksa..." : "Masuk"}
        </Button>
      </form>
    </div>
  );
}

function SetupPrompt({
  onDone,
  updateSettings,
}: {
  onDone: () => void;
  updateSettings: (patch: Partial<Record<string, string>>) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 4) {
      setError("Password minimal 4 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const hash = await hashPassword(password);
      await updateSettings({ admin_password_hash: hash });
      setAdminUnlocked();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5">
      <form onSubmit={handleSubmit} className="shape-card w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="mb-1 text-center font-display text-lg font-bold text-[var(--text)]">Buat Password Admin</h1>
        <p className="mb-4 text-center text-xs text-[var(--text-secondary)]">
          Password ini memisahkan menu Admin dari mode Kasir sehari-hari — hanya kamu yang perlu tahu. Bisa diganti
          kapan saja lewat Pengaturan &gt; Keamanan.
        </p>
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password baru"
            className="shape-card border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ulangi password"
            className="shape-card border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm"
          />
        </div>
        {error && <p className="mt-2 text-xs text-[var(--error-text)]">{error}</p>}
        <Button type="submit" disabled={busy || !password || !confirm} fullWidth className="mt-4">
          {busy ? "Menyimpan..." : "Simpan & Masuk"}
        </Button>
      </form>
    </div>
  );
}
