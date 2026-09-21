import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { hashPassword, setAdminUnlocked } from "../../lib/adminAuth";
import { Button } from "../ui/Button";

// Owner mode = the admin password. Used by the admin gate, the PIN screen
// ("Masuk sebagai pemilik") and the "access denied" screen.
export function OwnerUnlockForm({ onDone, submitLabel = "Masuk sebagai Pemilik" }: { onDone?: () => void; submitLabel?: string }) {
  const { settings } = useSettings();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if ((await hashPassword(password)) === settings.adminPasswordHash) {
        setAdminUnlocked();
        onDone?.();
      } else {
        setError("Password salah.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password admin"
        className="min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--brand-400)]"
      />
      {error && <p className="text-xs text-[var(--error-text)]">{error}</p>}
      <Button type="submit" disabled={busy || !password} fullWidth>
        {busy ? "Memeriksa..." : submitLabel}
      </Button>
    </form>
  );
}
