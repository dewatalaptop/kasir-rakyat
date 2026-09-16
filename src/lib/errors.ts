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
export function describeError(err: unknown): FriendlyError {
  if (err instanceof SheetsAuthExpiredError) return { message: err.message, action: "reauth" };
  if (err instanceof SheetsNotFoundError) return { message: err.message, action: "reconnect-sheet" };
  if (err instanceof SheetsRateLimitError) return { message: err.message, action: "retry" };
  if (err instanceof SheetsNetworkError) return { message: err.message, action: "retry" };
  if (err instanceof SheetsQuotaExceededError) return { message: err.message, action: "none" };
  if (err instanceof Error) return { message: err.message, action: "none" };
  return { message: "Terjadi kesalahan yang tidak diketahui.", action: "none" };
}
