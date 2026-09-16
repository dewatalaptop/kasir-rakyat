import { useState } from "react";
import type { Pengaturan, Transaksi } from "../../types";
import { Button } from "../ui/Button";
import { PrinterIcon } from "../ui/icons";
import { copyReceiptToClipboard, printViaBrowser, printViaRawBT } from "../../lib/printing";
import { useToast } from "../ui/Toast";

export function ReceiptActions({ t, p }: { t: Transaksi; p: Pengaturan }) {
  const [showFallback, setShowFallback] = useState(false);
  const { show } = useToast();

  function handleRawBT() {
    printViaRawBT(t, p);
    // RawBT either opens (leaving this page) or silently does nothing if
    // not installed — give the cashier a manual fallback after a short
    // wait rather than leaving them stuck with no feedback.
    setTimeout(() => setShowFallback(true), 1500);
  }

  async function handleCopy() {
    try {
      await copyReceiptToClipboard(t, p);
      show("Teks struk disalin — tempel di RawBT secara manual.", "success");
    } catch {
      show("Gagal menyalin ke clipboard.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleRawBT} icon={<PrinterIcon size={18} />} fullWidth>
        Cetak via RawBT
      </Button>
      <Button onClick={printViaBrowser} variant="ghost" fullWidth>
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
