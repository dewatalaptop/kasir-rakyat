// Only used on the native Android app; never called in the browser simulation.
export const FirebaseAuthentication = {
  signInWithGoogle: async () => ({ credential: { idToken: "sim", accessToken: "sim-token" } }),
  signOut: async () => {},
};
