// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { addToCart, cartPanel, checkout, goto, holder, mountApp, screen, unmountApp, waitFor, within, type Mounted } from "./harness";
import { CATALOG } from "./mocks/fakeSheets";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));

// Column indexes in the Transaksi sheet (see HEADERS.transaksi)
const C = { id: 0, kasirNama: 3, meja: 4, jumlah: 6, subtotal: 7, diskon: 8, pajak: 9, total: 10, metode: 11, diterima: 12, kembali: 13, status: 15 };

let m: Mounted | undefined;
afterEach(() => unmountApp(m));

const rp = (n: number) => n.toLocaleString("id-ID");

describe("simulated day at four kinds of business (real screens, in-memory Sheets)", () => {
  it("RESTO: table number, 10% tax + 5% service, cash paid exactly", async () => {
    m = await mountApp({ biz: "resto" });
    await addToCart(m, [["Nasi Goreng", 2], ["Ayam Bakar", 1]]);
    // live cart panel: 30.000 + 18.000 = 48.000; pajak 4.800; service 2.400; total 55.200
    const panel = within(cartPanel());
    expect(panel.getByText(/Rp\s?48\.000/)).toBeTruthy();
    expect(panel.getByText(/Pajak \(10%\)/)).toBeTruthy();
    expect(panel.getByText(/Service \(5%\)/)).toBeTruthy();
    expect(panel.getAllByText(/Rp\s?55\.200/).length).toBeGreaterThan(0);

    const receipt = await checkout(m, { method: "Tunai", cash: "pas", meja: "7" });
    const r = within(receipt);
    expect(r.getByText("Meja")).toBeTruthy();
    expect(r.getByText("Service")).toBeTruthy(); // the row that used to be missing
    expect(r.getAllByText(/55\.200/).length).toBeGreaterThan(0);
    expect(r.getByText(/Dibuat dengan Kasir Rakyat/)).toBeTruthy(); // free plan watermark

    const row = m.sheets.tables.Transaksi[0];
    expect(row[C.meja]).toBe("7");
    expect(Number(row[C.subtotal])).toBe(48000);
    expect(Number(row[C.pajak])).toBe(4800);
    expect(Number(row[C.total])).toBe(55200);
    expect(row[C.metode]).toBe("tunai");
    expect(Number(row[C.kembali])).toBe(0);
    expect(row[C.kasirNama]).toBe("Bu Ani");
  });

  it("WARUNG: no tax, cash with change", async () => {
    m = await mountApp({ biz: "warung" });
    await addToCart(m, [["Kopi Hitam", 2], ["Gorengan", 5]]); // 8.000 + 5.000
    expect(within(cartPanel()).queryByText(/Pajak/)).toBeNull();
    const receipt = await checkout(m, { method: "Tunai", cash: 20000 });
    expect(within(receipt).getAllByText(/13\.000/).length).toBeGreaterThan(0);
    expect(within(receipt).getByText("Kembali")).toBeTruthy();
    expect(within(receipt).getAllByText(/7\.000/).length).toBeGreaterThan(0);
    expect(within(receipt).queryByText("Service")).toBeNull();
    const row = m.sheets.tables.Transaksi[0];
    expect(Number(row[C.total])).toBe(13000);
    expect(Number(row[C.kembali])).toBe(7000);
    expect(Number(row[C.jumlah])).toBe(7);
  });

  it("TOKO: 11% tax rounds to the nearest rupiah, QRIS (no change)", async () => {
    m = await mountApp({ biz: "toko" });
    await addToCart(m, [["Sabun Mandi", 3], ["Beras 5kg", 1]]); // 9.999 + 68.500 = 78.499
    const receipt = await checkout(m, { method: "QRIS (manual)" });
    const row = m.sheets.tables.Transaksi[0];
    expect(Number(row[C.subtotal])).toBe(78499);
    expect(Number(row[C.pajak])).toBe(8635); // 8634.89
    expect(Number(row[C.total])).toBe(87134);
    expect(row[C.metode]).toBe("qris-manual");
    expect(row[C.kembali]).toBe("");
    expect(within(receipt).queryByText("Kembali")).toBeNull();
  });

  it("LAINNYA (jasa): a single big-ticket item, bank transfer", async () => {
    m = await mountApp({ biz: "lainnya" });
    await addToCart(m, [["Cuci Motor", 1], ["Poles Body", 1]]);
    await checkout(m, { method: "Transfer (manual)" });
    const row = m.sheets.tables.Transaksi[0];
    expect(Number(row[C.total])).toBe(165000);
    expect(row[C.metode]).toBe("transfer-manual");
  });

  it("the sale shows up in today's history and on the desktop KPI strip", async () => {
    m = await mountApp({ biz: "warung" });
    await addToCart(m, [["Indomie Telur", 2]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    goto("/kasir/riwayat");
    await screen.findByText("Riwayat Hari Ini", { selector: "h1" });
    await waitFor(() => expect(screen.getByText(/1 transaksi/)).toBeTruthy());
    expect(screen.getAllByText(/18\.000/).length).toBeGreaterThan(0);
  });

  it("a paid account's receipt has no watermark", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await addToCart(m, [["Kopi Hitam", 1]]);
    const receipt = await checkout(m, { method: "Tunai", cash: "pas" });
    expect(within(receipt).queryByText(/Dibuat dengan Kasir Rakyat/)).toBeNull();
  });

  it("low-stock products are flagged on their card", async () => {
    m = await mountApp({ biz: "resto" });
    await waitFor(() => screen.getByRole("button", { name: /Jus Alpukat/ }));
    expect(screen.getByText("Sisa 3")).toBeTruthy();
  });

  it("every catalog product can be tapped into the cart (no dead cards) for all four businesses", async () => {
    for (const biz of ["resto", "warung", "toko", "lainnya"] as const) {
      m = await mountApp({ biz });
      const names = CATALOG[biz].map((p) => p.name);
      await addToCart(m, names.map((n) => [n, 1] as [string, number]));
      const panel = within(cartPanel());
      for (const n of names) expect(panel.getAllByText(n).length).toBeGreaterThan(0);
      unmountApp(m);
      m = undefined;
    }
  });
});

describe("offline sale queue", () => {
  it("a sale made while Sheets is unreachable is queued, then synced exactly once", async () => {
    m = await mountApp({ biz: "warung" });
    await addToCart(m, [["Kopi Hitam", 1]]);
    m.sheets.offline = true;
    const receipt = await checkout(m, { method: "Tunai", cash: "pas" });
    expect(receipt).toBeTruthy(); // the cashier still gets a receipt
    expect(m.sheets.tables.Transaksi.length).toBe(0);
    expect(JSON.parse(localStorage.getItem("kasirRakyat.pendingTransaksi") ?? "[]").length).toBe(1);

    m.sheets.offline = false;
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(m!.sheets.tables.Transaksi.length).toBe(1), { timeout: 15000 });
    // let any competing flush finish, then confirm no duplicate was appended
    await new Promise((r) => setTimeout(r, 600));
    expect(m.sheets.tables.Transaksi.length).toBe(1);
    expect(JSON.parse(localStorage.getItem("kasirRakyat.pendingTransaksi") ?? "[]").length).toBe(0);
  });
});
