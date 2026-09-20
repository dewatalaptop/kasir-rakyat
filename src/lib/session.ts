// Everything cached in localStorage that belongs to ONE Google account's
// Kasir Rakyat data. Kept in one place so sign-out (and an account switch)
// wipes it all together — a leftover spreadsheet id or settings snapshot from
// a previous account would 404/403 for the next one, or worse, show the
// previous owner's business name.
export const SPREADSHEET_ID_KEY = "kasirRakyat.spreadsheetId";
export const SETTINGS_CACHE_KEY = "kasirRakyat.settingsCache";
export const OWNER_UID_KEY = "kasirRakyat.ownerUid";
const DRIVE_FOLDER_ID_KEY = "kasirRakyat.fotoFolderId";

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked/full — the app still works for this session */
  }
}

export function clearLocalSession(): void {
  for (const key of [SPREADSHEET_ID_KEY, SETTINGS_CACHE_KEY, OWNER_UID_KEY, DRIVE_FOLDER_ID_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  }
}
