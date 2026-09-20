import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { signOutUser } from "../../lib/auth";
import { describeError } from "../../lib/errors";
import { pendingCount } from "../../lib/pendingQueue";
import { Button } from "../ui/Button";
import { GoogleIcon } from "../ui/icons";

// Shared by the full-page screen and the floating banner: runs reconnect()
// from a click (the Google popup needs that user gesture) and turns any
// failure into a readable message instead of leaving the user stuck.
function useReconnectAction() {
  const { reconnect } = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage("");
    try {
      await reconnect();
    } catch (err) {
      setMessage(describeError(err).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, run };
}

const COPY = {
  reauth: {
    title: "Sambungkan ulang Google Sheets",
    body: "Izin akses ke Google Sheets-mu sudah berakhir (Google membatasinya sekitar 1 jam demi keamanan). Data dan transaksimu aman — ketuk tombol di bawah, pilih akun Google yang sama, lalu lanjutkan.",
    button: "Sambungkan Ulang dengan Google",
  },
  "sheet-missing": {
    title: "Spreadsheet tidak ditemukan",
    body: "Spreadsheet Kasir Rakyat di Google Drive-mu tidak bisa dibuka — mungkin terhapus atau kamu memilih akun Google yang berbeda. Kami akan mencari yang ada, atau membuat yang baru kalau tidak ada.",
    button: "Cari / Buat Spreadsheet",
  },
} as const;

// Full-page version: shown INSTEAD of the app when the connection is broken
// and there is nothing usable to show yet (e.g. a first open after the token
// expired). It always offers a working button — never a dead-end spinner or
// a message with no action.
export function ConnectionProblemScreen() {
  const { issue, error, retryLoad } = useSettings();
  const action = useReconnectAction();
  const [retrying, setRetrying] = useState(false);
  const copy = issue ? COPY[issue] : null;
  const queued = pendingCount();

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryLoad();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-10">
      <div className="shape-card w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h1 className="font-display text-xl font-bold text-[var(--text)]">{copy ? copy.title : "Data belum bisa dimuat"}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {copy ? copy.body : (error ?? "Terjadi masalah saat memuat data toko.")}
        </p>
        {queued > 0 && (
          <p className="mt-3 rounded-2xl bg-[var(--warning-bg)] px-4 py-2 text-xs font-medium text-[var(--warning-text)]">
            {queued} transaksi tersimpan di perangkat ini dan akan otomatis terkirim setelah tersambung.
          </p>
        )}
        {copy ? (
          <Button onClick={action.run} disabled={action.busy} fullWidth className="mt-5" icon={<GoogleIcon size={18} />}>
            {action.busy ? "Menghubungkan..." : copy.button}
          </Button>
        ) : (
          <Button onClick={handleRetry} disabled={retrying} fullWidth className="mt-5">
            {retrying ? "Memuat..." : "Coba Lagi"}
          </Button>
        )}
        {action.message && <p className="mt-3 text-xs text-[var(--error-text)]">{action.message}</p>}
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="mt-4 text-xs font-medium text-[var(--text-secondary)] underline"
        >
          Keluar dan masuk dengan akun lain
        </button>
      </div>
    </div>
  );
}

// Floating banner for a connection that breaks while the app is already
// open (token ran out mid-shift). The app stays usable — sales keep being
// saved on the device and sync after reconnecting.
export function ConnectionBanner() {
  const { issue } = useSettings();
  const action = useReconnectAction();
  if (!issue) return null;
  const copy = COPY[issue];
  const queued = pendingCount();

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 mx-auto max-w-md" role="alert">
      <div className="shape-card pointer-events-auto border border-[var(--warning-text)] bg-[var(--warning-bg)] p-3 shadow-lg">
        <p className="text-sm font-semibold text-[var(--warning-text)]">{copy.title}</p>
        <p className="mt-0.5 text-xs text-[var(--warning-text)]">
          {issue === "reauth"
            ? `Sesi Google-mu berakhir.${queued > 0 ? ` ${queued} transaksi menunggu dikirim.` : ""} Transaksi baru tetap tersimpan di perangkat ini.`
            : "Spreadsheet-mu tidak bisa dibuka."}
        </p>
        <Button onClick={action.run} disabled={action.busy} shape="pill" className="mt-2" icon={<GoogleIcon size={16} />}>
          {action.busy ? "Menghubungkan..." : copy.button}
        </Button>
        {action.message && <p className="mt-2 text-xs text-[var(--error-text)]">{action.message}</p>}
      </div>
    </div>
  );
}
