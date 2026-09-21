import { Capacitor } from "@capacitor/core";

const DEV_PLATFORM_KEY = "kasirRakyat.devPlatform";

// True only inside the native Android app (the Capacitor shell that wraps
// this web app). A plain browser — desktop or mobile Chrome — is NOT
// Android-app for this purpose: features that depend on native plugins
// (camera, private app storage) exist only in the APK.
//
// Dev-only escape hatch so the Android-only UI can be exercised in a desktop
// browser during development: set localStorage["kasirRakyat.devPlatform"] =
// "android". Compiled out of production builds (import.meta.env.DEV is false
// there), so a real user can never flip it.
export function isAndroidApp(): boolean {
  if (import.meta.env.DEV) {
    try {
      if (localStorage.getItem(DEV_PLATFORM_KEY) === "android") return true;
    } catch {
      /* storage unavailable */
    }
  }
  return Capacitor.getPlatform() === "android";
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform() || (import.meta.env.DEV && isAndroidApp());
}

// RawBT is an Android app: on a PC, iPhone or iPad its button would do nothing.
export function canUseRawBT(): boolean {
  if (isAndroidApp()) return true;
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}
