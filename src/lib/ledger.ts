import type { Transaksi } from "../types";

// The Transaksi sheet is APPEND-ONLY (see sheetsStore): a sale is one row with
// status "selesai"; voiding it appends a SECOND row with status "dibatalkan"
// and idTransaksiAsal = the original's id. The original row is never edited.
//
// So "what actually sold" is not just `status === "selesai"` — an original sale
// that has a reversal row must be excluded too. Reports, the dashboard, KPI
// tiles and today's history all read through effectiveTransaksi() so a voided
// sale can never inflate omzet (it used to: only the reversal row was ignored).

// Duplicate ids can appear when an append succeeded server-side but the
// response was lost, so the client retried. Keep the first row per id.
export function dedupeById(all: Transaksi[]): Transaksi[] {
  const seen = new Set<string>();
  const out: Transaksi[] = [];
  for (const t of all) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

// Ids of original sales that have been voided.
export function voidedIds(all: Transaksi[]): Set<string> {
  const ids = new Set<string>();
  for (const t of all) {
    if (t.status === "dibatalkan" && t.idTransaksiAsal) ids.add(t.idTransaksiAsal);
  }
  return ids;
}

// Completed, non-voided sales — the only rows that count as revenue.
export function effectiveTransaksi(all: Transaksi[]): Transaksi[] {
  const rows = dedupeById(all);
  const voided = voidedIds(rows);
  return rows.filter((t) => t.status === "selesai" && !voided.has(t.id));
}

// A sale can be voided once. A second reversal row would be harmless for the
// totals (the set above dedupes it) but is confusing in the list, so block it.
export function isVoided(t: Transaksi, all: Transaksi[]): boolean {
  return voidedIds(all).has(t.id);
}
