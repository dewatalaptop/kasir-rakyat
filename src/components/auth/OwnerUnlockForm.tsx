import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useAccess } from "../../context/AccessContext";
import { hashPassword, setAdminUnlocked } from "../../lib/adminAuth";
import { Button } from "../ui/Button";
import { OwnerPasswordForm } from "./OwnerPasswordForm";

// Owner mode = the owner password. Used by the admin gate, the PIN screen
// ("Masuk sebagai pemilik") and the "access denied" screen. If no password
// exists yet (cashiers were registered without one) it lets the owner create it
// instead of asking for something that was never set.
export function OwnerUnlockForm(props: { onDone?: () => void; submitLabel?: string }) {
  const { hasOwnerPassword } = useAccess();
  return hasOwnerPassword ? <UnlockForm {...props} /> : <OwnerPasswordForm onDone={props.onDone} submitLabel="Buat Password & Masuk" />;
}

function UnlockForm({ onDone, submitLabel = "Masuk sebagai Pemilik" }: { onDone?: () => void; submitLabel?: string }) {
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
        placeholder="Password pemilik"
        aria-label="Password pemilik"
        className="min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--brand-400)]"
      />
      {error && (
        <p role="alert" className="text-xs text-[var(--error-text)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !password} fullWidth>
        {busy ? "Memeriksa..." : submitLabel}
      </Button>
    </form>
  );
}
