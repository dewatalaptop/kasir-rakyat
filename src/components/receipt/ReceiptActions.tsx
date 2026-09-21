import { useState } from "react";
import { Link } from "react-router-dom";
import type { Pengaturan, Transaksi } from "../../types";
import { Button } from "../ui/Button";
import { PrinterIcon } from "../ui/icons";
import { copyReceiptToClipboard, printViaBrowser, printViaRawBT } from "../../lib/printing";
import { PAPER_WIDTHS } from "../../lib/escpos";
import { usePrinter } from "../../context/PrinterContext";
import { useAccess } from "../../context/AccessContext";
import { useToast } from "../ui/Toast";
import { canUseRawBT } from "../../lib/platform";

// Print buttons for a receipt. The method chosen in Pengaturan > Printer is the
// filled (primary) button; the others stay available underneath so a dead
// Bluetooth link never leaves the cashier without a way to print.
export function ReceiptActions({ t, p, watermark = false }: { t: Transaksi; p: Pengaturan; watermark?: boolean }) {
  const [showFallback, setShowFallback] = useState(false);
  const [btBusy, setBtBusy] = useState(false);
  const { show } = useToast();
  const printer = usePrinter();
  const { isOwner } = useAccess();
  const width = PAPER_WIDTHS[printer.paperWidth].chars;
  const rawbtUsable = canUseRawBT();
  // The chosen way is highlighted — unless it can't work on this device (RawBT on a PC,
  // Bluetooth in a plain browser): then the browser print is the working default.
  const pref = (p.printerPref === "rawbt" && !rawbtUsable) || (p.printerPref === "bluetooth" && !printer.isNative) ? "browser" : p.printerPref;

  function handleRawBT() {
    printViaRawBT(t, p, watermark, width);
    // RawBT either opens (leaving this page) or silently does nothing if
    // not installed — give the cashier a manual fallback after a short
    // wait rather than leaving them stuck with no feedback.
    setTimeout(() => setShowFallback(true), 1500);
  }

  async function handleBluetooth() {
    setBtBusy(true);
    try {
      await printer.printReceipt(t, p, watermark);
      show("Struk dikirim ke printer.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal mencetak.", "error");
    } finally {
      setBtBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await copyReceiptToClipboard(t, p, watermark, width);
      show("Teks struk disalin — tempel di RawBT secara manual.", "success");
    } catch {
      show("Gagal menyalin ke clipboard.", "error");
    }
  }

  const bluetoothButton = printer.isNative && (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleBluetooth}
        disabled={btBusy || !printer.isConnected}
        variant={pref === "bluetooth" ? "primary" : "ghost"}
        icon={<PrinterIcon size={18} />}
        fullWidth
      >
        {btBusy ? "Mencetak..." : printer.isConnected ? `Cetak Bluetooth (${printer.connectedName})` : "Cetak Bluetooth"}
      </Button>
      {!printer.isConnected && (
        <p className="text-center text-[11px] text-[var(--text-secondary)]">
          Printer belum terhubung.{" "}
          {isOwner ? (
            <Link to="/admin/pengaturan/printer" className="font-bold text-[var(--brand-600)] underline">
              Hubungkan
            </Link>
          ) : (
            "Minta pemilik menghubungkannya di Pengaturan > Printer."
          )}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {bluetoothButton}
      {rawbtUsable && (
        <Button onClick={handleRawBT} variant={pref === "rawbt" ? "primary" : "ghost"} icon={<PrinterIcon size={18} />} fullWidth>
          Cetak via RawBT
        </Button>
      )}
      <Button onClick={printViaBrowser} variant={pref === "browser" ? "primary" : "ghost"} fullWidth>
        Cetak dari Browser
      </Button>
      {showFallback && (
        <div className="shape-card border border-[var(--border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning-text)]">
          <p className="mb-2">RawBT tidak merespons? Salin teks struk lalu buka RawBT manual.</p>
          <Button onClick={handleCopy} variant="secondary" shape="pill" className="text-xs">
            Salin Teks Struk
          </Button>
        </div>
      )}
    </div>
  );
}
