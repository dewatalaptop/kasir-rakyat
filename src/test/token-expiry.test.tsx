// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkout, addToCart, goto, holder, mountApp, path, screen, unmountApp, waitFor, type Mounted } from "./harness";
import { NAMES } from "./mocks/fakeSheets";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));
// The Google popup: hands back a fresh access token.
vi.mock("firebase/auth", async () => {
  const actual = await vi.importActual<typeof import("firebase/auth")>("firebase/auth");
  class Provider extends actual.GoogleAuthProvider {
    static override credentialFromResult() {
      return { accessToken: "fresh-token" } as never;
    }
  }
  return { ...actual, GoogleAuthProvider: Provider, signInWithPopup: async () => ({ user: { uid: "owner-uid" } }) };
});

let m: Mounted | undefined;
afterEach(() => unmountApp(m));

// Regression: a returning owner whose Google access token had expired used to be
// thrown into the onboarding wizard, which said "sambungkan ulang" but had no button.
describe("expired Google Sheets access", () => {
  it("first open with an expired token and nothing cached: a reconnect screen with a working button — not onboarding", async () => {
    m = await mountApp({ biz: "warung", skipReady: true, tokenExpired: true });
    await screen.findByText("Sambungkan ulang Google Sheets");
    expect(path()).toBe("/kasir"); // not bounced to /onboarding
    await m.user.click(screen.getByRole("button", { name: "Sambungkan Ulang dengan Google" }));
    await screen.findAllByText(NAMES.warung, {}, { timeout: 15000 });
    expect(localStorage.getItem("sheetsAccessToken")).toBe("fresh-token");
    expect(screen.queryByText("Sambungkan ulang Google Sheets")).toBeNull();
  });

  it("the token dying mid-shift: the app stays open, shows a banner, keeps the sale, and syncs it exactly once after reconnecting", async () => {
    m = await mountApp({ biz: "warung" });
    m.sheets.staleToken = "mock-token"; // Google now rejects the token the app holds
    await addToCart(m, [["Kopi Hitam", 2]]);
    await checkout(m); // sale goes to the on-device queue, receipt still shown
    expect(m.sheets.tables.Transaksi).toEqual([]);
    expect(JSON.parse(localStorage.getItem("kasirRakyat.pendingTransaksi") ?? "[]")).toHaveLength(1);

    goto("/kasir/riwayat");
    const banner = await screen.findByRole("alert");
    expect(banner.textContent).toContain("Sambungkan ulang Google Sheets");
    await m.user.click(screen.getByRole("button", { name: "Sambungkan Ulang dengan Google" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    await waitFor(() => expect(m!.sheets.tables.Transaksi).toHaveLength(1));
    expect(JSON.parse(localStorage.getItem("kasirRakyat.pendingTransaksi") ?? "[]")).toHaveLength(0);
  });
});
