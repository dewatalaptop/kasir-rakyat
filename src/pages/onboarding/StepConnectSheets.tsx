import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../context/SettingsContext";

export function StepConnectSheets({ onNext }: { onNext: () => void }) {
  const { connect, connected } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setBusy(true);
    setError("");
    try {
      await connect();
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghubungkan Google Sheets.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <h2 className="font-display text-xl font-bold text-[var(--text)]">Hubungkan Google Sheets</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Semua data produk dan transaksi tersimpan di spreadsheet Google Sheets milikmu sendiri — gratis, tidak
        membebani server kami. Aplikasi ini hanya bisa mengakses file yang dibuatnya sendiri (izin "drive.file"),
        tidak bisa membaca file lain di Drive-mu.
      </p>
      {connected ? (
        <p className="rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-sm font-medium text-[var(--success-text)]">
          Sudah terhubung.
        </p>
      ) : (
        <Button onClick={handleConnect} disabled={busy} fullWidth>
          {busy ? "Menghubungkan..." : "Hubungkan Google Sheets"}
        </Button>
      )}
      {error && <p className="text-xs text-[var(--error-text)]">{error}</p>}
      {connected && (
        <Button onClick={onNext} variant="secondary" fullWidth>
          Lanjut
        </Button>
      )}
    </div>
  );
}
