import { signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { firebaseAuth, googleProvider } from "../firebase";

// signInWithPopup only — never signInWithRedirect (see firebase.ts's own
// comment: this app's authDomain is the shared project's domain, not its
// own live domain, and redirect silently drops the session under storage
// partitioning in that setup).
export async function signIn(): Promise<User> {
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
}
