import {
  SheetsAuthExpiredError,
  SheetsNetworkError,
  SheetsNotFoundError,
  SheetsQuotaExceededError,
  SheetsRateLimitError,
} from "./sheets";

export type ErrorAction = "reauth" | "retry" | "reconnect-sheet" | "none";

export interface FriendlyError {
  message: string;
  action: ErrorAction;
}

// Every Sheets error class already carries a real Indonesian message (see
// sheets.ts) — this just decides what the UI should DO about it, so every
// call site doesn't repeat the same instanceof chain.
// Firebase Auth popup failures carry a `code`; their default messages are
// English boilerplate like "Firebase: Error (auth/popup-closed-by-user)."
const AUTH_CODE_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Jendela Google ditutup sebelum selesai. Ketuk tombolnya lagi dan selesaikan pemilihan akun.",
  "auth/cancelled-popup-request": "Jendela Google ditutup sebelum selesai. Ketuk tombolnya lagi dan selesaikan pemilihan akun.",
  "auth/popup-blocked": "Browser memblokir jendela Google. Izinkan popup untuk situs ini, lalu ketuk tombolnya lagi.",
  "auth/network-request-failed": "Tidak bisa terhubung ke Google — periksa koneksi internet, lalu coba lagi.",
  "auth/unauthorized-domain": "Alamat aplikasi ini belum diizinkan untuk masuk dengan Google. Hubungi admin aplikasi.",
};

export function describeError(err: unknown): FriendlyError {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
  if (AUTH_CODE_MESSAGES[code]) return { message: AUTH_CODE_MESSAGES[code], action: "retry" };
  if (err instanceof SheetsAuthExpiredError) return { message: err.message, action: "reauth" };
  if (err instanceof SheetsNotFoundError) return { message: err.message, action: "reconnect-sheet" };
  if (err instanceof SheetsRateLimitError) return { message: err.message, action: "retry" };
  if (err instanceof SheetsNetworkError) return { message: err.message, action: "retry" };
  if (err instanceof SheetsQuotaExceededError) return { message: err.message, action: "none" };
  if (err instanceof Error) return { message: err.message, action: "none" };
  return { message: "Terjadi kesalahan yang tidak diketahui.", action: "none" };
}
