import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, type User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { firebaseAuth } from "../firebase";
import { nativeGoogleSignIn, nativeGoogleSignOut } from "./nativeGoogle";
import { SHEETS_SCOPE, clearStoredAccessToken, signInWithSheetsAccess, storeAccessToken } from "./sheets";
import { clearLocalSession, stashPendingFor } from "./session";

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
  // The popup also asks for the Drive/Sheets scope so one consent covers both.
  return signInWithSheetsAccess();
}

export async function signOutUser(): Promise<void> {
  // Forget this account's spreadsheet + token BEFORE the auth change, so the
  // next person to sign in on this device can never inherit them.
  stashPendingFor(firebaseAuth.currentUser?.uid);
  clearStoredAccessToken();
  clearLocalSession();
  await firebaseSignOut(firebaseAuth);
  if (Capacitor.isNativePlatform()) await nativeGoogleSignOut();
}
