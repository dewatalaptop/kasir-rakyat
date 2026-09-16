import type { CartLine, PaymentMethod, Pengaturan, Transaksi } from "../types";
import { computeTotals } from "./cart";
import { appendTransaksi } from "./sheetsStore";
import { SheetsAuthExpiredError, SheetsNetworkError, SheetsRateLimitError } from "./sheets";
import { enqueuePending, loadPendingQueue, removePending } from "./pendingQueue";

export interface CheckoutInput {
  lines: CartLine[];
  meja: string;
  catatan: string;
  metodeBayar: PaymentMethod;
  uangDiterima: number | null;
  kasirEmail: string;
  kasirNama: string;
  settings: Pick<Pengaturan, "taxPercent" | "serviceChargePercent">;
  diskon?: number;
}

export function buildTransaksi(input: CheckoutInput): Transaksi {
  const totals = computeTotals(input.lines, input.settings.taxPercent, input.settings.serviceChargePercent, input.diskon ?? 0);
  const kembalian = input.metodeBayar === "tunai" && input.uangDiterima !== null ? input.uangDiterima - totals.total : null;
  return {
    id: crypto.randomUUID(),
    tanggalWaktu: new Date().toISOString(),
    kasirEmail: input.kasirEmail,
    kasirNama: input.kasirNama,
    meja: input.meja,
    items: input.lines,
    jumlahItem: input.lines.reduce((s, l) => s + l.qty, 0),
    subtotal: totals.subtotal,
    diskon: input.diskon ?? 0,
    pajak: totals.pajak,
    total: totals.total,
    metodeBayar: input.metodeBayar,
    uangDiterima: input.uangDiterima,
    kembalian,
    catatan: input.catatan,
    status: "selesai",
    idTransaksiAsal: null,
  };
}

const RETRY_DELAYS_MS = [500, 1500, 4000];

export type CheckoutResult = { status: "saved" } | { status: "queued-offline" } | { status: "auth-expired" };

// Never lets a confirmed sale silently vanish: retries transient failures
// with backoff, and if those exhaust, queues it in localStorage instead of
// throwing — the cashier still sees a receipt, marked as pending sync.
// Auth-expiry queues the sale too (so re-auth doesn't lose it) but reports
// a distinct status so the UI can prompt reconnection.
export async function submitTransaksi(accessToken: string, spreadsheetId: string, transaksi: Transaksi): Promise<CheckoutResult> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await appendTransaksi(accessToken, spreadsheetId, transaksi);
      return { status: "saved" };
    } catch (err) {
      if (err instanceof SheetsAuthExpiredError) {
        enqueuePending(transaksi);
        return { status: "auth-expired" };
      }
      const retryable = err instanceof SheetsRateLimitError || err instanceof SheetsNetworkError;
      if (!retryable || attempt === RETRY_DELAYS_MS.length) {
        enqueuePending(transaksi);
        return { status: "queued-offline" };
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  enqueuePending(transaksi);
  return { status: "queued-offline" };
}

// Called on the 'online' event and on an interval (see usePrinter/App
// wiring) — flushes whatever the pending queue holds. Stops at the first
// failure rather than hammering every remaining item, since a failure
// here usually means the same underlying problem (offline/expired auth)
// affects all of them.
export async function flushPendingQueue(accessToken: string, spreadsheetId: string): Promise<number> {
  const queue = loadPendingQueue();
  let flushed = 0;
  for (const t of queue) {
    try {
      await appendTransaksi(accessToken, spreadsheetId, t);
      removePending(t.id);
      flushed++;
    } catch {
      break;
    }
  }
  return flushed;
}
