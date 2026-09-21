import type { Produk, Transaksi } from "../types";
import { effectiveTransaksi } from "./ledger";

export const LOW_STOCK_THRESHOLD = 5;

export interface DayStats {
  count: number;
  omzet: number;
  itemsSold: number;
}

export interface TodayStats {
  today: DayStats;
  yesterday: DayStats;
  // Percent change vs yesterday, null when yesterday had no sales (a % of
  // zero is meaningless — the UI hides the delta instead of showing "∞%").
  countDelta: number | null;
  omzetDelta: number | null;
  itemsDelta: number | null;
}

function dayStats(list: Transaksi[]): DayStats {
  return {
    count: list.length,
    omzet: list.reduce((s, t) => s + t.total, 0),
    itemsSold: list.reduce((s, t) => s + t.jumlahItem, 0),
  };
}

function pctChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

function sameDay(iso: string, ref: Date): boolean {
  return new Date(iso).toDateString() === ref.toDateString();
}

// Completed, non-voided sales only (see ledger.ts: voiding appends a reversal
// row, so the ORIGINAL sale must be excluded as well as the reversal).
export function computeTodayStats(transaksi: Transaksi[], now = new Date()): TodayStats {
  const done = effectiveTransaksi(transaksi);
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const today = dayStats(done.filter((t) => sameDay(t.tanggalWaktu, now)));
  const yesterday = dayStats(done.filter((t) => sameDay(t.tanggalWaktu, yest)));
  return {
    today,
    yesterday,
    countDelta: pctChange(today.count, yesterday.count),
    omzetDelta: pctChange(today.omzet, yesterday.omzet),
    itemsDelta: pctChange(today.itemsSold, yesterday.itemsSold),
  };
}

// "Stok" is display-only in this app (see README) — a product counts as low
// when its manual stock badge is at or below the threshold.
export function lowStockProducts(produk: Produk[]): Produk[] {
  return produk.filter((p) => p.status === "aktif" && p.stokTampilan !== null && p.stokTampilan <= LOW_STOCK_THRESHOLD);
}

// short=true drops the "vs kemarin" suffix for narrow tiles.
export function formatDelta(pct: number | null, short = false): { text: string; tone: "up" | "down" | "neutral" } | null {
  if (pct === null) return null;
  if (pct === 0) return { text: short ? "= kemarin" : "sama dgn kemarin", tone: "neutral" };
  const arrow = `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`;
  return { text: short ? arrow : `${arrow} vs kemarin`, tone: pct > 0 ? "up" : "down" };
}

export interface DailyPoint {
  date: Date;
  omzet: number;
  count: number;
}

// One point per calendar day for the last `days` days (oldest first), zero-filled.
export function dailySeries(transaksi: Transaksi[], days: number, now = new Date()): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    points.push({ date: d, omzet: 0, count: 0 });
  }
  for (const t of effectiveTransaksi(transaksi)) {
    const p = points.find((pt) => sameDay(t.tanggalWaktu, pt.date));
    if (p) {
      p.omzet += t.total;
      p.count += 1;
    }
  }
  return points;
}
