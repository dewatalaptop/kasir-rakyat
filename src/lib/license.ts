import { httpsCallable } from "firebase/functions";
import { firebaseAuth, functions } from "../firebase";

// This app's own Studio product id in the shared ai-app-builder project —
// constant, not configurable per-install (there's only one "kasir rakyat"
// product record).
export const STUDIO_PRODUCT_ID = "aHqfxM275OooEWmg6J3W";

const checkStudioLicenseFn = httpsCallable<{ productId: string }, { active: boolean; expiresAt: string | null }>(
  functions,
  "checkStudioLicense"
);

export type PlanStatus = "gratis" | "berbayar";

export interface LicenseResult {
  plan: PlanStatus;
  expiresAt: string | null;
  // True when the server could not be reached and a recent confirmed answer
  // was used instead (see decideFallback).
  stale?: boolean;
  // True when the check itself failed (callers that must not downgrade on a
  // transient error, e.g. a refresh, look at this).
  failed?: boolean;
}

const CACHE_KEY = "kasirRakyat.licenseCache";
// How long a server-confirmed "berbayar" answer keeps counting while the server
// is unreachable. Long enough for a shop to trade through a weekend outage,
// short enough that a lapsed subscription can't ride the cache for long.
export const LICENSE_GRACE_MS = 72 * 3600 * 1000;

interface LicenseCache {
  uid: string;
  expiresAt: string | null;
  checkedAt: number;
}

// Pure decision for "the server is unreachable — what plan are we on?".
//   - only a PAID answer is ever cached, for THIS account, and never past its
//     own expiry or the grace window;
//   - anything else is "gratis": never fail open into paid features beyond that.
export function decideFallback(cache: LicenseCache | null, uid: string | null, now: number): LicenseResult {
  if (cache && uid && cache.uid === uid) {
    const fresh = now - cache.checkedAt <= LICENSE_GRACE_MS;
    const notExpired = !cache.expiresAt || new Date(cache.expiresAt).getTime() > now;
    if (fresh && notExpired) return { plan: "berbayar", expiresAt: cache.expiresAt, stale: true };
  }
  return { plan: "gratis", expiresAt: null };
}

function readCache(): LicenseCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as LicenseCache) : null;
  } catch {
    return null;
  }
}

function writeCache(value: LicenseCache | null): void {
  try {
    if (value) localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage blocked — no offline grace, still correct */
  }
}

// Real server-side check against Studio's own payment records — the
// server reads the caller's email from their verified Firebase ID token,
// never from anything this function sends, so a client can't spoof
// someone else's paid status.
export async function checkLicense(): Promise<LicenseResult> {
  const uid = firebaseAuth.currentUser?.uid ?? null;
  try {
    const res = await checkStudioLicenseFn({ productId: STUDIO_PRODUCT_ID });
    const plan: PlanStatus = res.data.active ? "berbayar" : "gratis";
    if (plan === "berbayar" && uid) writeCache({ uid, expiresAt: res.data.expiresAt, checkedAt: Date.now() });
    else writeCache(null); // a confirmed "gratis" must not be resurrected by a stale cache
    return { plan, expiresAt: res.data.expiresAt };
  } catch {
    return { ...decideFallback(readCache(), uid, Date.now()), failed: true };
  }
}
