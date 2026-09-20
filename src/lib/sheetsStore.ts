import {
  appendRow,
  clearRow as sheetsClearRow,
  ensureSheetTabs,
  ensureSpreadsheet,
  readRows,
  updateRow,
  writeHeaderRow,
} from "./sheets";
import { HEADERS, SHEET_TABS, kategoriToRow, produkToRow, rowToKategori, rowToProduk, rowToTransaksi, settingsRowsToObject, transaksiToRow } from "./sheetsSchema";
import type { Kategori, Pengaturan, Produk, Transaksi } from "../types";

const SPREADSHEET_TITLE_PREFIX = "Kasir Rakyat";

export async function ensureAppSpreadsheet(accessToken: string, businessName: string): Promise<string> {
  const title = businessName ? `${SPREADSHEET_TITLE_PREFIX} - ${businessName}` : SPREADSHEET_TITLE_PREFIX;
  const spreadsheetId = await ensureSpreadsheet(accessToken, title);
  const tabs = Object.values(SHEET_TABS);
  await ensureSheetTabs(accessToken, spreadsheetId, tabs);
  // Idempotent: re-writing row 1 with the same headers every startup is
  // harmless (data lives in row 2+), and means a partially-created
  // spreadsheet from an interrupted first run self-heals on next login.
  await Promise.all([
    writeHeaderRow(accessToken, spreadsheetId, SHEET_TABS.pengaturan, [...HEADERS.pengaturan]),
    writeHeaderRow(accessToken, spreadsheetId, SHEET_TABS.produk, [...HEADERS.produk]),
    writeHeaderRow(accessToken, spreadsheetId, SHEET_TABS.kategori, [...HEADERS.kategori]),
    writeHeaderRow(accessToken, spreadsheetId, SHEET_TABS.transaksi, [...HEADERS.transaksi]),
  ]);
  return spreadsheetId;
}

function colLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

async function findRowNumberById(accessToken: string, spreadsheetId: string, tab: string, id: string): Promise<{ rowNumber: number; rows: string[][] } | null> {
  const lastCol = colLetter((HEADERS as Record<string, readonly string[]>)[tabKey(tab)].length - 1);
  const rows = await readRows(accessToken, spreadsheetId, `${tab}!A2:${lastCol}`);
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx === -1) return null;
  return { rowNumber: idx + 2, rows };
}

function tabKey(tab: string): keyof typeof HEADERS {
  const entry = Object.entries(SHEET_TABS).find(([, v]) => v === tab);
  if (!entry) throw new Error(`Unknown tab: ${tab}`);
  return entry[0] as keyof typeof HEADERS;
}

// --- Pengaturan (settings) — update-in-place, key/value rows -------------

export async function getSettings(accessToken: string, spreadsheetId: string): Promise<Partial<Pengaturan>> {
  const rows = await readRows(accessToken, spreadsheetId, `${SHEET_TABS.pengaturan}!A2:C`);
  return settingsRowsToObject(rows.filter((r) => r[0]));
}

export async function setSetting(accessToken: string, spreadsheetId: string, key: string, value: string): Promise<void> {
  const rows = await readRows(accessToken, spreadsheetId, `${SHEET_TABS.pengaturan}!A2:C`);
  const idx = rows.findIndex((r) => r[0] === key);
  const now = new Date().toISOString();
  if (idx === -1) {
    await appendRow(accessToken, spreadsheetId, `${SHEET_TABS.pengaturan}!A2:C`, [key, value, now]);
  } else {
    await updateRow(accessToken, spreadsheetId, `${SHEET_TABS.pengaturan}!A${idx + 2}:C${idx + 2}`, [key, value, now]);
  }
}

export async function setSettings(accessToken: string, spreadsheetId: string, patch: Record<string, string>): Promise<void> {
  // Sequential on purpose: these are rare, low-frequency admin writes
  // (onboarding, settings screen) — not the collision-risk path, so the
  // simplicity of one-at-a-time beats the complexity of batching here.
  for (const [key, value] of Object.entries(patch)) {
    await setSetting(accessToken, spreadsheetId, key, value);
  }
}

// --- Produk / Kategori — update-in-place, single-owner admin CRUD --------

export async function getProduk(accessToken: string, spreadsheetId: string): Promise<Produk[]> {
  const rows = await readRows(accessToken, spreadsheetId, `${SHEET_TABS.produk}!A2:${colLetter(HEADERS.produk.length - 1)}`);
  return rows.filter((r) => r[0]).map(rowToProduk).sort((a, b) => a.urutan - b.urutan);
}

export async function saveProduk(accessToken: string, spreadsheetId: string, produk: Produk): Promise<void> {
  const found = await findRowNumberById(accessToken, spreadsheetId, SHEET_TABS.produk, produk.id);
  const row = produkToRow(produk);
  const lastCol = colLetter(HEADERS.produk.length - 1);
  if (found) {
    await updateRow(accessToken, spreadsheetId, `${SHEET_TABS.produk}!A${found.rowNumber}:${lastCol}${found.rowNumber}`, row);
  } else {
    await appendRow(accessToken, spreadsheetId, `${SHEET_TABS.produk}!A2:${lastCol}`, row);
  }
}

export async function getKategori(accessToken: string, spreadsheetId: string): Promise<Kategori[]> {
  const rows = await readRows(accessToken, spreadsheetId, `${SHEET_TABS.kategori}!A2:E`);
  return rows.filter((r) => r[0]).map(rowToKategori).sort((a, b) => a.urutan - b.urutan);
}

export async function saveKategori(accessToken: string, spreadsheetId: string, kategori: Kategori): Promise<void> {
  const found = await findRowNumberById(accessToken, spreadsheetId, SHEET_TABS.kategori, kategori.id);
  const row = kategoriToRow(kategori);
  const lastCol = colLetter(HEADERS.kategori.length - 1);
  if (found) {
    await updateRow(accessToken, spreadsheetId, `${SHEET_TABS.kategori}!A${found.rowNumber}:${lastCol}${found.rowNumber}`, row);
  } else {
    await appendRow(accessToken, spreadsheetId, `${SHEET_TABS.kategori}!A2:${lastCol}`, row);
  }
}

// --- Transaksi — APPEND-ONLY, no exceptions -------------------------------
// Checkout's hot path only ever calls appendTransaksi. Never look up or
// update an existing row here — that's the one rule that keeps concurrent
// cashiers from clobbering each other (see plan: Sheets has no locking).

export async function appendTransaksi(accessToken: string, spreadsheetId: string, transaksi: Transaksi): Promise<void> {
  const lastCol = colLetter(HEADERS.transaksi.length - 1);
  await appendRow(accessToken, spreadsheetId, `${SHEET_TABS.transaksi}!A2:${lastCol}`, transaksiToRow(transaksi));
}

export async function getTransaksi(accessToken: string, spreadsheetId: string): Promise<Transaksi[]> {
  const lastCol = colLetter(HEADERS.transaksi.length - 1);
  const rows = await readRows(accessToken, spreadsheetId, `${SHEET_TABS.transaksi}!A2:${lastCol}`);
  return rows
    .filter((r) => r[0])
    .map(rowToTransaksi)
    .sort((a, b) => (a.tanggalWaktu < b.tanggalWaktu ? 1 : -1));
}

export async function clearRow(accessToken: string, spreadsheetId: string, range: string): Promise<void> {
  await sheetsClearRow(accessToken, spreadsheetId, range);
}
