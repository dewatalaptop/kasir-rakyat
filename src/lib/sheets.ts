import { GoogleAuthProvider, signInWithCredential, signInWithPopup, type User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { firebaseAuth } from "../firebase";
import { nativeGoogleSignIn } from "./nativeGoogle";

// Non-sensitive scope: only files this app itself creates (or the user
// explicitly picks via the Google Picker, not wired here) — never the
// user's whole Drive. This is what keeps this whole approach viable
// without Google's app-verification review: the broader "spreadsheets" or
// "drive" scopes are sensitive/restricted and show an "unverified app"
// warning screen to every user until the app passes that review. See
// README.md in this same folder for the full rationale and the "when NOT
// to use this" checklist — read that before wiring this into a project.
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/drive.file";
const sheetsProvider = new GoogleAuthProvider();
sheetsProvider.addScope(SHEETS_SCOPE);

const TOKEN_STORAGE_KEY = "sheetsAccessToken";
const TOKEN_EXPIRES_KEY = "sheetsAccessTokenExpiresAt";

// Google issues these access tokens for 3600s. Treat one as expired a few
// minutes early so a request never starts with a token that dies mid-flight.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

// When the stored token should be considered dead. null = no token at all.
// A token stored by an older version of this app has no timestamp; its age
// is unknown and it is almost certainly stale, so it counts as already
// expired (worst case: one extra "Sambungkan Ulang" tap).
export function getStoredTokenExpiry(): number | null {
  try {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return null;
    const raw = Number(localStorage.getItem(TOKEN_EXPIRES_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return null;
  }
}

export function isStoredTokenExpired(): boolean {
  const expiry = getStoredTokenExpiry();
  return expiry === null || Date.now() >= expiry;
}

export function storeAccessToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRES_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
  } catch {
    /* storage blocked — the in-memory token still works for this session */
  }
  for (const listener of tokenListeners) listener(token);
}

export function clearStoredAccessToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  } catch {
    /* nothing to clear */
  }
}

// --- Session-health signals -------------------------------------------------
// Every Sheets/Drive call in this app funnels through sheetsFetch (or
// productPhotos' driveFetch), so a 401/404 is reported HERE, once, instead of
// each of the ~30 call sites having to remember to handle it. SettingsContext
// subscribes and turns these into the "Sambungkan Ulang" UI. The failing
// token is included so a late failure from a request that started BEFORE the
// user reconnected can't re-flag a session that was just repaired.
type TokenListener = (token: string) => void;
type ProblemListener = (problem: "auth-expired" | "sheet-missing", failedToken: string) => void;
const tokenListeners = new Set<TokenListener>();
const problemListeners = new Set<ProblemListener>();

export function onAccessTokenStored(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

export function onSheetsProblem(listener: ProblemListener): () => void {
  problemListeners.add(listener);
  return () => problemListeners.delete(listener);
}

export function reportSheetsProblem(problem: "auth-expired" | "sheet-missing", failedToken: string): void {
  for (const listener of problemListeners) listener(problem, failedToken);
}

// Popup sign-in, never signInWithRedirect — same requirement as this
// project's own firebase.ts (see the comment there): every project in
// this shared Firebase setup uses a `authDomain` that isn't the app's own
// live domain, and redirect silently drops the session under storage
// partitioning while popup works correctly.
export async function connectGoogleSheets(): Promise<string> {
  // Android app: native account picker instead of a WebView popup (see auth.ts).
  if (Capacitor.isNativePlatform()) {
    const { idToken, accessToken } = await nativeGoogleSignIn([SHEETS_SCOPE]);
    if (!accessToken) throw new Error("Gagal mendapatkan akses Google Sheets — coba lagi.");
    await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken, accessToken));
    storeAccessToken(accessToken);
    return accessToken;
  }
  const result = await signInWithPopup(firebaseAuth, sheetsProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error("Gagal mendapatkan akses Google Sheets — coba lagi.");
  }
  storeAccessToken(credential.accessToken);
  return credential.accessToken;
}

// Web sign-in that already carries the Drive/Sheets scope, so the very first
// login yields a usable Sheets token and there is no second consent popup.
export async function signInWithSheetsAccess(): Promise<User> {
  const result = await signInWithPopup(firebaseAuth, sheetsProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) storeAccessToken(credential.accessToken);
  return result.user;
}

// Thrown by every call below on a 401. The access token Firebase hands
// back for the Google provider expires after roughly an hour and this SDK
// does not auto-refresh it — a real, documented limitation, not a bug in
// this file. Catch this specifically in the UI and prompt the user to
// reconnect (re-run connectGoogleSheets()) instead of failing silently.
export class SheetsAuthExpiredError extends Error {
  constructor() {
    super("Akses Google Sheets sudah kedaluwarsa — sambungkan ulang.");
    this.name = "SheetsAuthExpiredError";
  }
}

// Thrown when the user's own Google Drive is full — a real, account-level
// limit that has nothing to do with this app's code (confirmed live: the
// same call that fails with this reason succeeds instantly once Drive has
// free space). Surface it as-is to the user ("Google Drive kamu penuh,
// hapus beberapa file dulu") rather than a generic error.
export class SheetsQuotaExceededError extends Error {
  constructor() {
    super("Google Drive akun ini sudah penuh — hapus beberapa file dulu, lalu coba lagi.");
    this.name = "SheetsQuotaExceededError";
  }
}

// Google's per-user rate limit (100 requests/100s/user is the default) —
// realistic for a busy single-operator session doing several quick
// appendRow/readRows calls in a row, not just a theoretical edge case.
// Distinguished from the generic Error below so the UI can show a
// "coba lagi sebentar" message instead of a raw API error string.
export class SheetsRateLimitError extends Error {
  constructor() {
    super("Google Sheets sedang membatasi permintaan (terlalu sering) — tunggu beberapa detik, lalu coba lagi.");
    this.name = "SheetsRateLimitError";
  }
}

// `fetch()` itself throws (rejects) on offline/DNS/CORS failures rather
// than resolving with a Response — a completely different failure mode
// from the API returning a 4xx/5xx below, and one every caller of this
// file needs to handle the same way (retry once connectivity is back).
export class SheetsNetworkError extends Error {
  constructor(cause: unknown) {
    super("Tidak bisa terhubung ke Google Sheets — periksa koneksi internet, lalu coba lagi.");
    this.name = "SheetsNetworkError";
    this.cause = cause;
  }
}

// The cached spreadsheetId can go stale if the user manually deletes the
// file in Google Drive outside this app — every subsequent read/write
// against that id 404s. Give the UI enough signal to drop the cached id
// and re-run ensureSpreadsheet() (which will create a fresh one) instead
// of surfacing a bare "404" to a non-technical user.
export class SheetsNotFoundError extends Error {
  constructor() {
    super("Spreadsheet tidak ditemukan — mungkin sudah dihapus di Google Drive. Menyambung ulang akan membuat yang baru.");
    this.name = "SheetsNotFoundError";
  }
}

async function sheetsFetch(url: string, accessToken: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    throw new SheetsNetworkError(err);
  }
  if (res.status === 401) {
    reportSheetsProblem("auth-expired", accessToken);
    throw new SheetsAuthExpiredError();
  }
  if (res.status === 404) {
    reportSheetsProblem("sheet-missing", accessToken);
    throw new SheetsNotFoundError();
  }
  if (res.status === 429) throw new SheetsRateLimitError();
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403 && text.includes("storageQuotaExceeded")) throw new SheetsQuotaExceededError();
    throw new Error(`Google Sheets API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Finds a spreadsheet this app already created — searched by exact name,
// scoped to files this app can see under drive.file (never the user's
// whole Drive) — or creates a new one if none exists yet. Cache the
// returned id (e.g. in localStorage) after the first call in a session;
// this does up to two real API round-trips otherwise.
//
// IMPORTANT — verified live against the real APIs: the new file MUST be
// created via the Drive API's files.create (below), NOT the Sheets API's
// own spreadsheets.create. Both are documented as accepting the
// drive.file scope, but only Drive's files.create actually registers the
// new file under this app's per-file grant at creation time — calling
// Sheets' spreadsheets.create under drive.file scope fails with a bare
// 403 "The caller does not have permission" every time, confirmed by
// testing both endpoints back to back with the same token. Once the file
// exists (created either way), the Sheets API's values.* endpoints work
// fine against its id — this only matters for the initial create.
export async function ensureSpreadsheet(accessToken: string, title: string): Promise<string> {
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name='${title}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  )}&fields=files(id,name)`;
  const found = await sheetsFetch(searchUrl, accessToken);
  if (found.files?.length > 0) return found.files[0].id;

  const created = await sheetsFetch("https://www.googleapis.com/drive/v3/files", accessToken, {
    method: "POST",
    body: JSON.stringify({ name: title, mimeType: "application/vnd.google-apps.spreadsheet" }),
  });
  return created.id;
}

// A freshly created spreadsheet (either path above) has exactly one
// default tab ("Sheet1") — any app with more than one logical "table"
// needs to add its own named tabs. Safe to call on every app start, not
// just first run: skips any title that already exists rather than
// erroring or duplicating, so it's idempotent.
export async function ensureSheetTabs(accessToken: string, spreadsheetId: string, titles: string[]): Promise<void> {
  const meta = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    accessToken
  );
  const existing = new Set<string>((meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title));
  const missing = titles.filter((t) => !existing.has(t));
  if (missing.length === 0) return;
  await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
    method: "POST",
    body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }),
  });
}

// Writes row 1 (the header) for one tab — call once right after
// ensureSheetTabs creates it, before any data rows are appended.
export async function writeHeaderRow(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[]
): Promise<void> {
  const lastCol = String.fromCharCode(65 + headers.length - 1);
  await updateRow(accessToken, spreadsheetId, `${tabName}!A1:${lastCol}1`, headers);
}

// One sheet tab == one "table". `range` is a normal A1 range, e.g.
// "Produk!A2:E" (row 1 is conventionally the header row — read it
// separately if you need column names, it's excluded here on purpose so
// every returned row is real data).
export async function readRows(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const data = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    accessToken
  );
  return data.values ?? [];
}

export async function appendRow(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  row: (string | number)[]
): Promise<void> {
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    accessToken,
    { method: "POST", body: JSON.stringify({ values: [row] }) }
  );
}

// `range` must point at the EXACT row to overwrite, e.g. "Produk!A5:E5" —
// Sheets has no row-id concept, so the caller is responsible for knowing
// which row (see README.md's "row number as the id" convention).
export async function updateRow(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  row: (string | number)[]
): Promise<void> {
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    accessToken,
    { method: "PUT", body: JSON.stringify({ values: [row] }) }
  );
}

// Sheets API has no "delete this row" primitive over `values` — clearing
// its contents (values.clear) is the standard workaround, since actually
// removing a row would shift every row below it up by one and silently
// invalidate any row-number-based id already used elsewhere in the app.
export async function clearRow(accessToken: string, spreadsheetId: string, range: string): Promise<void> {
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    accessToken,
    { method: "POST" }
  );
}
