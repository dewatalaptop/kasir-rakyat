import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

export interface NativeGoogleResult {
  idToken: string;
  // Present when scopes were requested and granted (e.g. Drive/Sheets).
  accessToken: string | null;
}

// Google refuses to load its OAuth consent screen inside ANY embedded WebView
// (Capacitor's included), so a popup/redirect sign-in is dead on arrival in the
// Android app. The native plugin drives Android's own Google account picker
// entirely outside the WebView instead.
//
// Try the modern Credential Manager path first, then fall back to the legacy
// GoogleSignInClient: Credential Manager throws "[16] Account reauth failed"
// on a device's FIRST-EVER sign-in with an app (no saved credential to
// "reauth" yet) — which is every new store owner's first experience. The
// fallback is a runtime call option, not native config, so it needs no rebuild.
// (Found and confirmed on a real device in the sibling retail-pos app.)
export async function nativeGoogleSignIn(scopes: string[]): Promise<NativeGoogleResult> {
  let result;
  try {
    result = await FirebaseAuthentication.signInWithGoogle({ scopes, useCredentialManager: true });
  } catch {
    result = await FirebaseAuthentication.signInWithGoogle({ scopes, useCredentialManager: false });
  }
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("Google tidak mengembalikan token masuk — coba lagi.");
  return { idToken, accessToken: result.credential?.accessToken ?? null };
}

export async function nativeGoogleSignOut(): Promise<void> {
  try {
    await FirebaseAuthentication.signOut();
  } catch {
    /* nothing signed in natively (skipNativeAuth) — fine */
  }
}
