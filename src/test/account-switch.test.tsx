// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { holder, mountApp, screen, unmountApp, waitFor, type Mounted } from "./harness";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));
// The Google popup: signs in and hands back a fresh access token.
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

describe("signing in with a different Google account", () => {
  it("a spreadsheet the account was never given (Google answers 403) is handled as 'not this account's file' — no raw API error", async () => {
    m = await mountApp({ biz: "warung", skipReady: true, seed: (s) => s.forbiddenIds.add("mock-sheet") });
    await screen.findByText("Spreadsheet tidak ditemukan");
    expect(document.body.textContent).not.toMatch(/Google Sheets API error/);
    expect(document.body.textContent).not.toMatch(/The caller does not have permission/);
    expect(screen.getByRole("button", { name: "Cari / Buat Spreadsheet" })).toBeTruthy();
  });

  it("…and one tap finds/creates this account's own spreadsheet and the app comes back", async () => {
    m = await mountApp({ biz: "warung", skipReady: true, seed: (s) => s.forbiddenIds.add("mock-sheet") });
    await m.user.click(await screen.findByRole("button", { name: "Cari / Buat Spreadsheet" }));
    await waitFor(() => expect(localStorage.getItem("kasirRakyat.spreadsheetId")).toBe("mock-sheet-2"));
    await waitFor(() => expect(screen.queryByText("Spreadsheet tidak ditemukan")).toBeNull());
  });

  it("an unknown 403 is explained in words with the short Google reason, not a JSON dump", async () => {
    m = await mountApp({
      biz: "warung",
      skipReady: true,
      seed: (s) => {
        s.forbidBody = JSON.stringify({ error: { code: 403, status: "FAILED_PRECONDITION", message: "Something unexpected", errors: [{ reason: "weird" }] } });
      },
    });
    await screen.findByText(/Google menolak akses \(403\)/);
    expect(document.body.textContent).not.toContain('{"error"');
    expect(document.body.textContent).toContain("Something unexpected");
  });

  it("another account's cached data is not used: spreadsheet, settings and queued offline sales are set aside", async () => {
    const queued = JSON.stringify([{ id: "old-sale", tanggal: new Date().toISOString(), total: 5000 }]);
    m = await mountApp({
      biz: "warung",
      skipReady: true,
      local: { "kasirRakyat.ownerUid": "previous-account-uid", "kasirRakyat.pendingTransaksi": queued },
    });
    // this account's queue starts empty and the previous account's sale is kept for THAT account
    await waitFor(() => expect(localStorage.getItem("kasirRakyat.pendingTransaksi.previous-account-uid")).toBe(queued));
    expect(localStorage.getItem("kasirRakyat.pendingTransaksi")).toBeNull();
    expect(localStorage.getItem("kasirRakyat.ownerUid")).toBe("owner-uid");
    // and nothing of it reached the new account's spreadsheet
    expect(m.sheets.tables.Transaksi).toEqual([]);
  });
});
