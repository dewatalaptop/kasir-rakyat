import type { PlanStatus } from "./license";
import { limitsFor } from "./limits";
import { isAndroidApp } from "./platform";

export type FeatureBlockReason = "not-paid" | "not-android";

export interface FeatureAccess {
  allowed: boolean;
  // Why the feature is locked — null when allowed. "not-paid" wins over
  // "not-android" so the upsell message is the one that matters first.
  reason: FeatureBlockReason | null;
}

// Product photos: paid (prepaid/"berbayar") plan AND the native Android app.
// Both conditions are required — the plan check is the server-verified
// license (see license.ts), the platform check is whether the native camera
// and private-storage plugins actually exist here.
export function productPhotoAccess(plan: PlanStatus): FeatureAccess {
  if (!limitsFor(plan).productPhotos) return { allowed: false, reason: "not-paid" };
  if (!isAndroidApp()) return { allowed: false, reason: "not-android" };
  return { allowed: true, reason: null };
}

export function blockReasonText(reason: FeatureBlockReason): string {
  return reason === "not-paid"
    ? "Foto produk hanya tersedia di versi berbayar (prabayar) aplikasi Android."
    : "Foto produk hanya bisa dipakai lewat aplikasi Android. Buka Kasir Rakyat dari aplikasi Android untuk memakai fitur ini.";
}
