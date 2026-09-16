import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { pendingCount } from "../../lib/pendingQueue";
import { flushPendingQueue } from "../../lib/checkout";

export function SheetsSettingsPage() {
  const { connected, spreadsheetId, accessToken, reconnect } = useSettings();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const pending = pendingCount();

  async function handleReconnect() {
    setBusy(true);
    try {
      await reconnect();
      show("Google Sheets tersambung ulang.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menyambung ulang.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleFlush() {
    if (!accessToken || !spreadsheetId) return;
    setBusy(true);
    try {
      const flushed = await flushPendingQueue(accessToken, spreadsheetId);
      show(flushed > 0 ? `${flushed} transaksi tertunda berhasil disinkron.` : "Belum ada yang bisa disinkron, coba lagi nanti.", flushed > 0 ? "success" : "info");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Koneksi Google Sheets</h1>
      <Card>
        <p className="text-sm text-[var(--text)]">Status: {connected ? "Tersambung" : "Belum tersambung"}</p>
        {spreadsheetId && (
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-xs text-[var(--brand-600)] underline"
          >
            Buka spreadsheet di Google Sheets
          </a>
        )}
      </Card>
      <Button onClick={handleReconnect} disabled={busy} fullWidth>
        {busy ? "Menghubungkan..." : "Sambungkan Ulang"}
      </Button>
      {pending > 0 && (
        <Card className="border-[var(--warning-text)]">
          <p className="text-sm font-semibold text-[var(--warning-text)]">{pending} transaksi belum tersinkron</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Terjadi saat koneksi sempat gagal — transaksi tetap tersimpan di perangkat ini.</p>
          <Button onClick={handleFlush} disabled={busy} variant="secondary" shape="pill" className="mt-2">
            Sinkron Sekarang
          </Button>
        </Card>
      )}
    </div>
  );
}
