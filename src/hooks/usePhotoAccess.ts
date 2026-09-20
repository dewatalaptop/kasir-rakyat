import { useMemo } from "react";
import { useSettings } from "../context/SettingsContext";
import { productPhotoAccess, type FeatureAccess } from "../lib/features";

// Whether product photos are usable right now: paid plan + native Android.
// Re-evaluates when the license check resolves (plan starts as "gratis").
export function usePhotoAccess(): FeatureAccess {
  const { plan } = useSettings();
  return useMemo(() => productPhotoAccess(plan), [plan]);
}
