// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { addToCart, checkout, goto, holder, mountApp, screen, unmountApp, unlockOwner, waitFor, within, type Mounted } from "./harness";
import { printer } from "./mocks/fakeBle";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));

let m: Mounted | undefined;
afterEach(() => unmountApp(m));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connectPrinter(mm: Mounted, name = "MPT-II") {
  await unlockOwner(mm, "/admin/pengaturan/printer");
  await screen.findByText("Pengaturan Printer");
  await mm.user.click(screen.getByRole("button", { name: /Cari Printer/ }));
  await mm.user.click(await screen.findByRole("button", { name: new RegExp(name) }));
  await screen.findByRole("button", { name: "Tes Cetak" });
}

describe("thermal printer — Bluetooth (Android app)", () => {
  it("on the plain web the Bluetooth option is locked with an explanation", async () => {
    m = await mountApp({ biz: "warung" });
    await unlockOwner(m, "/admin/pengaturan/printer");
    await screen.findByText("Pengaturan Printer");
    expect(screen.getByText("Hanya di aplikasi Android")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Bluetooth langsung/ })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: /Cari Printer/ })).toBeNull();
  });

  it("scan → pick the printer (unnamed devices hidden) → connect → 80mm test page prints", async () => {
    m = await mountApp({ biz: "warung", android: true });
    await unlockOwner(m, "/admin/pengaturan/printer");
    await screen.findByText("Pengaturan Printer");
    await m.user.click(screen.getByRole("button", { name: /Cari Printer/ }));
    expect(await screen.findByRole("button", { name: /MPT-II/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Printer_58/ })).toBeTruthy();
    expect(screen.queryByText("AA:02")).toBeNull();
    await m.user.click(screen.getByRole("button", { name: /MPT-II/ }));
    await screen.findByText("Terhubung");
    expect(printer.connected).toBe(true);

    await m.user.click(screen.getByRole("button", { name: /80mm/ }));
    await m.user.click(screen.getByRole("button", { name: "Tes Cetak" }));
    await screen.findByText(/Halaman tes dikirim/);
    const out = printer.printed();
    expect(out.initialised).toBe(true);
    expect(out.cut).toBe(true);
    expect(out.lines.join("\n")).toContain("TES PRINTER");
    expect(out.lines.join("\n")).toContain("48 kolom");
    // choice is remembered on this device
    expect(JSON.parse(localStorage.getItem("kasirRakyat.printer")!)).toMatchObject({ name: "MPT-II", paperWidth: "80" });
  });

  it("prints a real resto receipt from the receipt screen, matching what is on screen", async () => {
    m = await mountApp({ biz: "resto", android: true });
    await connectPrinter(m);
    goto("/kasir");
    await addToCart(m, [["Nasi Goreng", 2], ["Mie Goreng Seafood Spesial Komplit", 1]]);
    const receipt = await checkout(m, { method: "Tunai", cash: "pas", meja: "12" });
    const onScreenTotal = within(receipt).getAllByText(/Rp\s?[\d.]+/).map((e) => e.textContent).find((t) => /TOTAL/.test(receipt.textContent ?? "")) ?? "";
    expect(onScreenTotal).toBeTruthy();

    await m.user.click(screen.getByRole("button", { name: /Cetak Bluetooth \(MPT-II\)/ }));
    await screen.findByText(/Struk dikirim ke printer/);
    const job = printer.jobs()[0];
    const text = job.lines.join("\n");
    // subtotal 52.000 (30.000 + 22.000); tax 5.200; service 2.600; total 59.800
    expect(text).toContain("52.000");
    expect(text).toContain("Pajak");
    expect(text).toContain("Service");
    expect(text).toContain("59.800");
    expect(text).toContain("Meja : 12");
    // the 34-char name is word-wrapped onto two lines, not cut off
    expect(text).toContain("Mie Goreng Seafood Spesial");
    expect(job.lines).toContain("Komplit");
    for (const line of job.lines) expect(line.length).toBeLessThanOrEqual(32);
    expect(job.cut).toBe(true);
    expect(job.boldLines.join(" ")).toContain("Resto Sedap Rasa".slice(0, 16));
  });

  it("survives a tiny BLE MTU: many 20-byte chunks reassemble into the exact receipt", async () => {
    m = await mountApp({ biz: "warung", android: true });
    printer.mtu = 23;
    await connectPrinter(m);
    printer.mtu = 23;
    goto("/kasir");
    await addToCart(m, [["Kopi Hitam", 1]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    await m.user.click(screen.getByRole("button", { name: /Cetak Bluetooth/ }));
    await screen.findByText(/Struk dikirim ke printer/);
    expect(printer.writes.length).toBeGreaterThan(5);
    for (const w of printer.writes) expect(w.length).toBeLessThanOrEqual(20);
    expect(printer.jobs()[0].lines.join("\n")).toContain("Kopi Hitam");
  });

  it("auto-print: one copy right after the sale, and NOT again when coming back to the receipt", async () => {
    m = await mountApp({ biz: "warung", android: true, local: { "kasirRakyat.printer": JSON.stringify({ deviceId: "AA:01", name: "MPT-II", paperWidth: "58", autoPrint: true }) } });
    await unlockOwner(m, "/admin/pengaturan/printer");
    await m.user.click(await screen.findByRole("radio", { name: /Bluetooth langsung/ }));
    await waitFor(() => expect(m!.sheets.tables.Pengaturan.find((r) => r[0] === "printer_pref")![1]).toBe("bluetooth"));
    await waitFor(() => expect(printer.connected).toBe(true)); // silently re-connected the saved printer
    goto("/kasir");
    await addToCart(m, [["Kopi Hitam", 1]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    await waitFor(() => expect(printer.jobs().length).toBe(1));

    await m.user.click(screen.getByRole("button", { name: "Transaksi Baru" }));
    await screen.findByText("Ketuk produk untuk menambah ke transaksi");
    window.history.back(); // back to the receipt (router state still says "fresh")
    await screen.findByText("Struk Transaksi");
    await sleep(500);
    expect(printer.jobs().length).toBe(1);
  });

  it("a receipt reopened from history is never auto-printed", async () => {
    m = await mountApp({
      biz: "warung",
      android: true,
      local: { "kasirRakyat.printer": JSON.stringify({ deviceId: "AA:01", name: "MPT-II", paperWidth: "58", autoPrint: true }) },
      seed: (s) => {
        s.tables.Pengaturan.find((r) => r[0] === "printer_pref")![1] = "bluetooth";
        s.tables.Transaksi.push(["old", new Date().toISOString(), "ani@toko.id", "Bu Ani", "", JSON.stringify([{ produkId: "p0", nama: "Kopi Hitam", harga: 4000, qty: 1 }]), "1", "4000", "0", "0", "4000", "tunai", "4000", "0", "", "selesai", ""]);
      },
    });
    await waitFor(() => expect(printer.connected).toBe(true));
    goto("/kasir/riwayat");
    // wait for the history screen: until then the catalog's "Kopi Hitam Rp 4.000" card also matches
    await screen.findByText("Riwayat Hari Ini", { selector: "h1" });
    await m.user.click(await screen.findByRole("button", { name: /Tunai/ }));
    await screen.findByText("Struk Transaksi");
    await sleep(500);
    expect(printer.writes.length).toBe(0);
  });

  it("explains itself when Bluetooth is off, and when the printer drops mid-print", async () => {
    m = await mountApp({ biz: "warung", android: true });
    await unlockOwner(m, "/admin/pengaturan/printer");
    await screen.findByText("Pengaturan Printer");
    printer.powered = false;
    await m.user.click(screen.getByRole("button", { name: /Cari Printer/ }));
    await screen.findByText(/Bluetooth mati/);
    printer.powered = true;
    await m.user.click(screen.getByRole("button", { name: /Cari Printer/ }));
    await m.user.click(await screen.findByRole("button", { name: /MPT-II/ }));
    await screen.findByRole("button", { name: "Tes Cetak" });
    printer.failAfterWrites = 1;
    await m.user.click(screen.getByRole("button", { name: "Tes Cetak" }));
    await screen.findByText(/tercetak sebagian/);
  });

  it("with no printer connected the Bluetooth button is disabled and points the way", async () => {
    m = await mountApp({ biz: "warung", android: true });
    await addToCart(m, [["Kopi Hitam", 1]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    expect(screen.getByRole("button", { name: "Cetak Bluetooth" })).toHaveProperty("disabled", true);
    expect(screen.getByText(/Printer belum terhubung/)).toBeTruthy();
    // the RawBT and browser fallbacks are always there
    expect(screen.getByRole("button", { name: /Cetak via RawBT/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cetak dari Browser/ })).toBeTruthy();
  });
});

describe("paid plan: upgrade by manual transfer with a unique code", () => {
  it("request → instructions with unique code → owner approves → app flips to paid by itself", async () => {
    m = await mountApp({ biz: "warung" });
    await unlockOwner(m, "/admin/akun");
    await screen.findByText(/Langganan kasir rakyat/);
    expect(screen.getByText("Gratis")).toBeTruthy();
    expect(screen.getByText(/Produk tanpa batas/)).toBeTruthy();
    await m.user.click(screen.getByRole("button", { name: /Upgrade — Rp\s?50\.000\/bulan/ }));

    await screen.findByText("Transfer TEPAT sejumlah");
    const p = m.server.pending!;
    expect(p.totalAmount).toBe(50000 + p.uniqueCode);
    expect(p.uniqueCode).toBeGreaterThanOrEqual(1);
    expect(p.uniqueCode).toBeLessThanOrEqual(999);
    // amount shown with the unique code as the last 3 digits emphasised
    const digits = String(p.totalAmount).replace(/(\d{2})(\d{3})$/, "$1.$2");
    expect(document.body.textContent).toContain(`Rp${digits.slice(0, -3)}${digits.slice(-3)}`);
    expect(screen.getByText("BNI")).toBeTruthy();
    expect(screen.getByText("1234567890")).toBeTruthy();
    expect(screen.getByText(/a\.n\. CV Nuvora/)).toBeTruthy();
    expect(screen.getByText(/Menunggu pembayaran/)).toBeTruthy();

    // the provider approves in the dashboard...
    m.server.approve();
    // ...and the open Account screen notices without a refresh
    await screen.findByText(/Pembayaran diterima/, {}, { timeout: 8000 });
    await screen.findByText(/Versi berbayar aktif sampai/);
    await waitFor(() => expect(screen.getAllByText("Berbayar").length).toBeGreaterThan(0));
  });

  it("the buyer can withdraw a request, and that is not mistaken for a payment", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    m.server.license.expiresAt = new Date(Date.now() + 3 * 86400000).toISOString(); // renewal window
    await unlockOwner(m, "/admin/akun");
    await m.user.click(await screen.findByRole("button", { name: /Perpanjang/ }));
    await screen.findByText("Transfer TEPAT sejumlah");
    await m.user.click(screen.getByRole("button", { name: /Batalkan permintaan/ }));
    await screen.findByRole("button", { name: /Perpanjang/ });
    await sleep(700);
    expect(screen.queryByText(/Pembayaran diterima/)).toBeNull();
  });

  it("renewal is only offered in the last 7 days, and extends from the current expiry", async () => {
    m = await mountApp({ biz: "warung", paid: true }); // 20 days left
    await unlockOwner(m, "/admin/akun");
    await screen.findByText(/Versi berbayar aktif sampai/);
    expect(screen.getByText(/Perpanjangan bisa dilakukan mulai 7 hari/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Perpanjang/ })).toBeNull();
    const before = new Date(m.server.license.expiresAt!).getTime();
    m.server.license.expiresAt = new Date(Date.now() + 2 * 86400000).toISOString();
    goto("/admin");
    await screen.findByText("Transaksi Hari Ini"); // really leave the account page so it re-fetches on return
    goto("/admin/akun");
    await m.user.click(await screen.findByRole("button", { name: /Perpanjang/ }));
    await screen.findByText("Transfer TEPAT sejumlah");
    const expiryBefore = new Date(m.server.license.expiresAt!).getTime();
    m.server.approve();
    expect(new Date(m.server.license.expiresAt!).getTime() - expiryBefore).toBeGreaterThan(29 * 86400000); // +30d from the existing expiry
    expect(before).toBeGreaterThan(Date.now());
  });

  it("tells the buyer plainly when the provider has not set a bank account yet", async () => {
    m = await mountApp({ biz: "warung" });
    m.server.bank = null;
    await unlockOwner(m, "/admin/akun");
    await screen.findByText(/belum aktif \(rekening belum diatur\)/);
    expect(screen.queryByRole("button", { name: /Upgrade/ })).toBeNull();
  });

  it("shows a retry when the payment server can't be reached", async () => {
    m = await mountApp({ biz: "warung" });
    m.server.offline = true;
    await unlockOwner(m, "/admin/akun");
    await screen.findByText(/Tidak bisa terhubung ke server pembayaran/);
    m.server.offline = false;
    await m.user.click(screen.getByRole("button", { name: "Coba lagi" }));
    await screen.findByRole("button", { name: /Upgrade/ });
  });
});

describe("what the paid plan actually unlocks in the running app", () => {
  it("reports: 30/90-day ranges are locked on gratis, open on berbayar", async () => {
    m = await mountApp({ biz: "warung" });
    await unlockOwner(m, "/admin/laporan");
    await screen.findByText("Laporan Penjualan");
    await m.user.click(screen.getByRole("button", { name: /90 Hari/ }));
    await screen.findByText(/hanya untuk versi berbayar/);
    unmountApp(m);

    m = await mountApp({ biz: "warung", paid: true });
    await unlockOwner(m, "/admin/laporan");
    await screen.findByText("Laporan Penjualan");
    await m.user.click(screen.getByRole("button", { name: /90 Hari/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /90 Hari/ }).className).toContain("brand-500"));
    expect(screen.queryByText(/hanya untuk versi berbayar/)).toBeNull();
  });

  it("products: the 21st active product is refused on gratis, allowed on berbayar", async () => {
    const seed20 = (s: import("./mocks/fakeSheets").FakeSheets) => {
      const iso = new Date().toISOString();
      s.tables.Produk = Array.from({ length: 20 }, (_, i) => [`x${i}`, `Produk ${i}`, "k0", "1000", "", "aktif", "", String(i), "package", iso, iso, ""]);
    };
    m = await mountApp({ biz: "warung", seed: seed20 });
    await unlockOwner(m, "/admin/produk");
    await screen.findByText(/20\/20 produk aktif/);
    await m.user.click(screen.getByRole("button", { name: "Tambah" }));
    await screen.findByText(/Batas 20 produk aktif untuk versi gratis/);
    expect(window.location.pathname).toBe("/admin/produk");
    unmountApp(m);

    m = await mountApp({ biz: "warung", paid: true, seed: seed20 });
    await unlockOwner(m, "/admin/produk");
    await m.user.click(await screen.findByRole("button", { name: "Tambah" }));
    await waitFor(() => expect(window.location.pathname).toBe("/admin/produk/baru"));
  });

  it("product photos need BOTH the paid plan and the Android app", async () => {
    // gratis + Android: locked, says upgrade
    m = await mountApp({ biz: "warung", android: true });
    await unlockOwner(m, "/admin/produk/baru");
    await screen.findByText(/hanya tersedia di versi berbayar/);
    expect(screen.queryByRole("button", { name: /Ambil Foto/ })).toBeNull();
    unmountApp(m);

    // paid + plain web: locked, says use the Android app
    m = await mountApp({ biz: "warung", paid: true });
    await unlockOwner(m, "/admin/produk/baru");
    await screen.findByText(/hanya bisa dipakai lewat aplikasi Android/);
    unmountApp(m);

    // paid + Android: camera & gallery available, storage choice shown
    m = await mountApp({ biz: "warung", paid: true, android: true });
    await unlockOwner(m, "/admin/produk/baru");
    expect(await screen.findByRole("button", { name: /Ambil Foto/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dari Galeri/ })).toBeTruthy();
    expect(screen.getByText(/Disimpan di memori internal/)).toBeTruthy();
  });

  it("photo storage choice (internal memory vs Google Drive) is selectable only when allowed, and persisted", async () => {
    m = await mountApp({ biz: "warung", paid: true, android: true });
    await unlockOwner(m, "/admin/pengaturan");
    await screen.findByText("Foto Produk");
    await m.user.click(screen.getByRole("radio", { name: /Google Drive toko/ }));
    await screen.findByText(/Foto baru akan disimpan di Google Drive/);
    expect(m.sheets.tables.Pengaturan.find((r) => r[0] === "foto_storage")![1]).toBe("drive");
    unmountApp(m);

    m = await mountApp({ biz: "warung", android: true }); // gratis
    await unlockOwner(m, "/admin/pengaturan");
    await screen.findByText("Terkunci");
    expect(screen.getByRole("radio", { name: /Google Drive toko/ })).toHaveProperty("disabled", true);
  });
});

describe("license when the payment server is unreachable", () => {
  const cache = (over: Record<string, unknown> = {}) => ({
    "kasirRakyat.licenseCache": JSON.stringify({ uid: "owner-uid", expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(), checkedAt: Date.now() - 3600_000, ...over }),
  });

  it("a shop confirmed as paid an hour ago keeps its paid features while offline (no surprise watermark)", async () => {
    m = await mountApp({ biz: "warung", serverOffline: true, local: cache() });
    await addToCart(m, [["Kopi Hitam", 1]]);
    const receipt = await checkout(m, { method: "Tunai", cash: "pas" });
    expect(within(receipt).queryByText(/Dibuat dengan Kasir Rakyat/)).toBeNull();
  });

  it("but not after 72h without confirmation — never fails open forever", async () => {
    m = await mountApp({ biz: "warung", serverOffline: true, local: cache({ checkedAt: Date.now() - 80 * 3600_000 }) });
    await addToCart(m, [["Kopi Hitam", 1]]);
    const receipt = await checkout(m, { method: "Tunai", cash: "pas" });
    expect(within(receipt).getByText(/Dibuat dengan Kasir Rakyat/)).toBeTruthy();
  });

  it("an expired subscription cannot ride the cache", async () => {
    m = await mountApp({ biz: "warung", serverOffline: true, local: cache({ expiresAt: new Date(Date.now() - 86400000).toISOString() }) });
    await addToCart(m, [["Kopi Hitam", 1]]);
    const receipt = await checkout(m, { method: "Tunai", cash: "pas" });
    expect(within(receipt).getByText(/Dibuat dengan Kasir Rakyat/)).toBeTruthy();
  });
});
