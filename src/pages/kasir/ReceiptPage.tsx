import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ReceiptView } from "../../components/receipt/ReceiptView";
import { ReceiptActions } from "../../components/receipt/ReceiptActions";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/Button";
import { PlusIcon } from "../../components/ui/icons";
import { useSettings } from "../../context/SettingsContext";
import { usePrinter } from "../../context/PrinterContext";
import { useToast } from "../../components/ui/Toast";
import type { Transaksi } from "../../types";

const AUTO_KEY = "kasirRakyat.autoPrinted";
function alreadyAutoPrinted(id: string): boolean {
  try {
    return (JSON.parse(sessionStorage.getItem(AUTO_KEY) ?? "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}
function markAutoPrinted(id: string): void {
  try {
    const list = JSON.parse(sessionStorage.getItem(AUTO_KEY) ?? "[]") as string[];
    sessionStorage.setItem(AUTO_KEY, JSON.stringify([...list.slice(-50), id]));
  } catch {
    /* session-only guard */
  }
}

export function ReceiptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, plan } = useSettings();
  const printer = usePrinter();
  const { show } = useToast();
  const state = location.state as { transaksi?: Transaksi; fresh?: boolean } | null;
  const transaksi = state?.transaksi;
  const watermark = plan === "gratis";

  // Auto-print exactly once, and only for a sale that was JUST completed
  // (`fresh`) — reopening an old receipt from history must never reprint it.
  // The ref also guards React StrictMode's double effect run.
  const autoPrinted = useRef(false);
  useEffect(() => {
    if (!transaksi || !state?.fresh || autoPrinted.current) return;
    if (settings.printerPref !== "bluetooth" || !printer.autoPrint || !printer.isConnected) return;
    // Remember which sales were already auto-printed: the router keeps `fresh`
    // in history state, so going Back to this page must not print a second copy.
    if (alreadyAutoPrinted(transaksi.id)) return;
    markAutoPrinted(transaksi.id);
    autoPrinted.current = true;
    printer.printReceipt(transaksi, settings, watermark).catch((err) => show(err instanceof Error ? err.message : "Gagal mencetak otomatis.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaksi, state?.fresh, printer.isConnected, printer.autoPrint, settings.printerPref]);

  if (!transaksi) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Struk tidak ditemukan. Lihat riwayat transaksi untuk detail.</p>
        <Button onClick={() => navigate("/kasir/riwayat")}>Ke Riwayat</Button>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Struk Transaksi" subtitle="Cetak atau simpan bukti pembayaran" />
      <div className="mx-auto grid max-w-3xl gap-5 px-4 pb-8 pt-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-start lg:px-6">
        <ReceiptView t={transaksi} p={settings} watermark={watermark} />
        <div className="flex flex-col gap-3">
          <ReceiptActions t={transaksi} p={settings} watermark={watermark} />
          <Button onClick={() => navigate("/kasir")} variant="soft" fullWidth icon={<PlusIcon size={18} />}>
            Transaksi Baru
          </Button>
        </div>
      </div>
    </div>
  );
}
