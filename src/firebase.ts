import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// New projects built via this AI App Builder default to the SAME shared
// Firebase project (ai-app-builder-7bf8e) rather than provisioning a fresh
// one per project — see memory ai-app-builder-default-deploy for why. The
// apiKey below is Firebase's public client key (identifies the project,
// not a secret — Firebase access control happens via security rules / the
// backend's own auth, never by hiding this key).
//
// CRITICAL — read before touching authDomain or signInWithRedirect:
// authDomain MUST stay "ai-app-builder-7bf8e.firebaseapp.com" (the SHARED
// project's own domain), never this app's own live domain — and web
// Google Sign-In MUST use signInWithPopup, never signInWithRedirect.
// Both were tried and both failed in confirmed, reproduced ways (redirect
// silently drops the session via storage partitioning; pointing authDomain
// at this app's own domain instead breaks louder with
// redirect_uri_mismatch, because the OAuth client's redirect URIs are a
// separate, Console-only-editable resource with no public API). See
// memory ai-app-builder-android-generation for the full native-Android
// equivalent if this project also ships an APK.
const firebaseApp = initializeApp({
  apiKey: "AIzaSyCiBe6t2_26DflR3W7TbDf4HwDI5Hh0TI4",
  authDomain: "ai-app-builder-7bf8e.firebaseapp.com",
  projectId: "ai-app-builder-7bf8e",
});

export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
// Same shared project as everything above — calling a Cloud Function here
// (e.g. checkStudioLicense) needs no separate config, just the signed-in
// user's existing ID token from firebaseAuth.
export const functions = getFunctions(firebaseApp);
