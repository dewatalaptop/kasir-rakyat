import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { firebaseAuth, googleProvider } from "../firebase";
import { nativeGoogleSignIn, nativeGoogleSignOut } from "./nativeGoogle";
import { SHEETS_SCOPE, storeAccessToken } from "./sheets";

// Web: signInWithPopup only — never signInWithRedirect (see firebase.ts's own
// comment: this app's authDomain is the shared project's domain, not its own
// live domain, and redirect silently drops the session under storage
// partitioning in that setup).
//
// Android app: native Google Sign-In (a WebView can't show Google's consent
// screen). The Drive/Sheets scope is requested in the same prompt so the
// access token needed for the spreadsheet arrives together with the identity.
export async function signIn(): Promise<User> {
  if (Capacitor.isNativePlatform()) {
    const { idToken, accessToken } = await nativeGoogleSignIn([SHEETS_SCOPE]);
    const result = await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(idToken, accessToken));
    if (accessToken) storeAccessToken(accessToken);
    return result.user;
  }
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
  if (Capacitor.isNativePlatform()) await nativeGoogleSignOut();
}
