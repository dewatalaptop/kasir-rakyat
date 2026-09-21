// Client-side password gate for the admin area — this app has no backend
// of its own (see README), so this can't be tamper-proof against a
// technically sophisticated attacker inspecting the JS or the Sheet
// directly. It's a real, deliberate deterrent for the actual threat model
// here: a kasir (staff) using the same Google-signed-in device as the
// owner, who shouldn't casually wander into Produk/Transaksi/Pengaturan.
// Never store the password itself — only its SHA-256 hash, via Web
// Crypto (no dependency needed).
export async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const UNLOCK_KEY = "kasirRakyat.adminUnlocked";

// Tiny pub/sub so React can re-render the moment the lock state changes
// (useSyncExternalStore in AccessContext) — sessionStorage alone emits nothing
// for same-tab writes.
const listeners = new Set<() => void>();
function emit(): void {
  listeners.forEach((l) => l());
}
export function subscribeAdminLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// sessionStorage, not localStorage — closing the tab/app re-locks admin.
// A shared device left logged into Google should not also stay
// permanently unlocked into the admin area.
export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* storage blocked — unlock lasts only until reload */
  }
  emit();
}

export function clearAdminUnlocked(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* nothing to clear */
  }
  emit();
}
