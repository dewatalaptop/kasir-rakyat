import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// This app's own Studio product id in the shared ai-app-builder project —
// constant, not configurable per-install (there's only one "kasir rakyat"
// product record).
const STUDIO_PRODUCT_ID = "aHqfxM275OooEWmg6J3W";

const checkStudioLicenseFn = httpsCallable<{ productId: string }, { active: boolean; expiresAt: string | null }>(
  functions,
  "checkStudioLicense"
);

export type PlanStatus = "gratis" | "berbayar";

export interface LicenseResult {
  plan: PlanStatus;
  expiresAt: string | null;
}

// Real server-side check against Studio's own payment records — the
// server reads the caller's email from their verified Firebase ID token,
// never from anything this function sends, so a client can't spoof
// someone else's paid status. Any failure (offline, etc.) defaults to
// "gratis" — never fail open into paid features.
export async function checkLicense(): Promise<LicenseResult> {
  try {
    const res = await checkStudioLicenseFn({ productId: STUDIO_PRODUCT_ID });
    return { plan: res.data.active ? "berbayar" : "gratis", expiresAt: res.data.expiresAt };
  } catch {
    return { plan: "gratis", expiresAt: null };
  }
}
