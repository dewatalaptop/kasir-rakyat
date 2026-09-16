import type { Pengaturan, Transaksi } from "../types";
import { buildReceiptText } from "./receipt";

// Default path: RawBT (already common among Indonesian UMKM for thermal
// printers) handles the physical printing via its own URL scheme — no
// Bluetooth-LE/ESC-POS byte-encoding needed in this web app. Full native
// BLE pairing is a later Android (Capacitor) milestone, not v1 — this is
// the deliberate extension point for it (see plan: "Explicitly out of
// scope for v1").
export function printViaRawBT(t: Transaksi, p: Pengaturan, watermark = false): void {
  const text = buildReceiptText(t, p, watermark);
  const url = `rawbt://print?text=${encodeURIComponent(text)}`;
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyReceiptToClipboard(t: Transaksi, p: Pengaturan, watermark = false): Promise<void> {
  const text = buildReceiptText(t, p, watermark);
  await navigator.clipboard.writeText(text);
}

// Universal fallback needing no app at all — scoped via @media print to
// only the #receipt element (see ReceiptView.tsx), so the rest of the
// page's chrome never ends up on paper.
export function printViaBrowser(): void {
  window.print();
}
