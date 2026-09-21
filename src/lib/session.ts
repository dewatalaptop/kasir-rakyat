// Everything cached in localStorage that belongs to ONE Google account's
// Kasir Rakyat data. Kept in one place so sign-out (and an account switch)
// wipes it all together — a leftover spreadsheet id or settings snapshot from
// a previous account would 404/403 for the next one, or worse, show the
// previous owner's business name.
export const SPREADSHEET_ID_KEY = "kasirRakyat.spreadsheetId";
export const SETTINGS_CACHE_KEY = "kasirRakyat.settingsCache";
export const OWNER_UID_KEY = "kasirRakyat.ownerUid";
const DRIVE_FOLDER_ID_KEY = "kasirRakyat.fotoFolderId";
const KASIR_CACHE_KEY = "kasirRakyat.kasirCache";
const PENDING_KEY = "kasirRakyat.pendingTransaksi";

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
  for (const key of [SPREADSHEET_ID_KEY, SETTINGS_CACHE_KEY, OWNER_UID_KEY, DRIVE_FOLDER_ID_KEY, KASIR_CACHE_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  }
}

// Sales queued while offline belong to the account that made them. Left in the
// shared queue they would be flushed into the NEXT account's spreadsheet after a
// sign-out / account switch. So: set them aside under the old account's uid when
// it leaves, and put them back when that account signs in again — nothing is lost
// and nothing crosses over.
const stashKey = (uid: string) => `${PENDING_KEY}.${uid}`;

export function stashPendingFor(uid: string | null | undefined): void {
  if (!uid) return;
  const raw = readStored(PENDING_KEY);
  if (!raw || raw === "[]") return;
  try {
    const mine = JSON.parse(readStored(stashKey(uid)) ?? "[]") as { id: string }[];
    const incoming = JSON.parse(raw) as { id: string }[];
    const known = new Set(mine.map((t) => t.id));
    writeStored(stashKey(uid), JSON.stringify([...mine, ...incoming.filter((t) => !known.has(t.id))]));
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* unreadable queue: leave it alone rather than drop it */
  }
}

export function restorePendingFor(uid: string | null | undefined): void {
  if (!uid) return;
  const raw = readStored(stashKey(uid));
  if (!raw) return;
  try {
    const back = JSON.parse(raw) as { id: string }[];
    const now = JSON.parse(readStored(PENDING_KEY) ?? "[]") as { id: string }[];
    const known = new Set(now.map((t) => t.id));
    writeStored(PENDING_KEY, JSON.stringify([...now, ...back.filter((t) => !known.has(t.id))]));
    localStorage.removeItem(stashKey(uid));
  } catch {
    /* keep the stash */
  }
}
