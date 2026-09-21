// Stand-in for firebase/auth: one fake Google user, signed in unless sim.signedOut is set.
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
const listeners = new Set<(u: User | null) => void>();
const USER: User = { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null };
const auth: { currentUser: User | null } = { currentUser: localStorage.getItem("sim.signedOut") === "1" ? null : USER };
const emit = () => listeners.forEach((l) => l(auth.currentUser));

export const getAuth = () => auth;
export class GoogleAuthProvider {
  addScope() {}
  setCustomParameters() {}
  static credentialFromResult() {
    return { accessToken: "sim-token" };
  }
  static credential() {
    return {};
  }
}
export function onAuthStateChanged(_a: unknown, cb: (u: User | null) => void) {
  listeners.add(cb);
  setTimeout(() => cb(auth.currentUser), 0);
  return () => listeners.delete(cb);
}
export async function signInWithPopup() {
  localStorage.removeItem("sim.signedOut");
  auth.currentUser = USER;
  emit();
  return { user: USER };
}
export async function signInWithCredential() {
  return signInWithPopup();
}
export async function signOut() {
  localStorage.setItem("sim.signedOut", "1");
  auth.currentUser = null;
  emit();
}
