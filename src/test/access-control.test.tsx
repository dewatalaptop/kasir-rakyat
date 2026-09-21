// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { addToCart, checkout, goto, holder, mountApp, path, screen, unmountApp, unlockOwner, waitFor, within, ownerPassword, type Mounted } from "./harness";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));

let m: Mounted | undefined;
afterEach(() => unmountApp(m));

type Spec = [name: string, role: "Kasir" | "Supervisor" | "Manajer", pin: string];
const DEWI: Spec = ["Dewi", "Kasir", "1234"];
const BUDI: Spec = ["Budi", "Supervisor", "5678"];
const SARI: Spec = ["Sari", "Manajer", "9999"];

async function addKasir(mm: Mounted, [name, role, pin]: Spec) {
  await mm.user.click(screen.getAllByRole("button", { name: /^(\+ )?Tambah/ })[0]);
  await screen.findByText("Tambah Kasir", { selector: "h2" });
  await mm.user.type(screen.getByPlaceholderText("Contoh: Dewi"), name);
  await mm.user.click(screen.getByRole("button", { name: role }));
  await mm.user.type(screen.getByPlaceholderText("••••"), pin);
  await mm.user.click(screen.getByRole("button", { name: "Simpan" }));
  await screen.findByText(`${name} disimpan.`);
}

// Owner registers cashiers through the real Kasir & Izin screen.
async function registerCashiers(mm: Mounted, specs: Spec[]) {
  await unlockOwner(mm, "/admin/kasir");
  await screen.findByText("Kasir & Izin", { selector: "h1" });
  for (const s of specs) {
    await addKasir(mm, s);
    await waitFor(() => expect(within(document.body).getAllByText(s[0]).length).toBeGreaterThan(0));
  }
}

async function lockRegister(mm: Mounted) {
  await mm.user.click(screen.getAllByRole("button", { name: /Ganti Kasir/ })[0]);
  await screen.findByText("Siapa yang bertugas?");
}

async function pinLogin(mm: Mounted, name: string, pin: string) {
  if (!screen.queryByText(/Siapa yang bertugas/) && !screen.queryByText(/masukkan PIN/)) await lockRegister(mm);
  if (screen.queryByText("Siapa yang bertugas?")) await mm.user.click(screen.getByRole("button", { name: new RegExp(name) }));
  await screen.findByText(new RegExp(`Halo, ${name}`));
  for (const d of pin) await mm.user.click(screen.getByRole("button", { name: d }));
  await mm.user.click(screen.getByRole("button", { name: "Masuk" }));
}

const navLabels = () =>
  [...document.querySelectorAll("aside a")].map((a) => a.textContent?.trim()).filter(Boolean) as string[];

describe("legacy shop (no cashiers registered yet)", () => {
  it("works as before: no PIN gate; admin hidden behind the owner password", async () => {
    m = await mountApp({ biz: "warung" });
    expect(screen.queryByText("Siapa yang bertugas?")).toBeNull();
    expect(navLabels()).toEqual(["Kasir", "Riwayat Hari Ini", "Bantuan", "Mode Pemilik"]);
    // the sheet had no "Kasir" tab: the app created it lazily instead of erroring
    await waitFor(() => expect(m!.sheets.tables.Kasir).toBeDefined());
  });

  it("wrong owner password is refused, right one opens everything", async () => {
    m = await mountApp({ biz: "warung" });
    goto("/admin");
    const field = await screen.findByPlaceholderText("Password pemilik");
    await m.user.type(field, "salah");
    await m.user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByText("Password salah.");
    await m.user.clear(field);
    await m.user.type(field, ownerPassword);
    await m.user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByText(/Halo, /);
    await waitFor(() => expect(navLabels()).toEqual(expect.arrayContaining(["Dashboard", "Produk", "Kategori", "Transaksi", "Laporan", "Kasir & Izin", "Pengaturan", "Akun & Langganan"])));
  });
});

// A brand-new shop: the owner never created a password. Asking for one (worse:
// "username and password") on the first visit to the admin menu was the most
// confusing moment of the app — so a shop with nobody to keep out simply runs
// as owner, and the password becomes a deliberate step taken before cashiers.
const noOwnerPassword = (sheets: { tables: Record<string, string[][]> }) => {
  const row = sheets.tables.Pengaturan.find((r) => r[0] === "admin_password_hash")!;
  row[1] = "";
};
const hashInSheet = (mm: Mounted) => mm.sheets.tables.Pengaturan.find((r) => r[0] === "admin_password_hash")?.[1] ?? "";

describe("first-time owner (no password created yet)", () => {
  it("opens the admin menus directly — no password prompt, no owner-mode detour", async () => {
    m = await mountApp({ biz: "warung", seed: noOwnerPassword });
    await waitFor(() => expect(navLabels()).toEqual(expect.arrayContaining(["Dashboard", "Produk", "Pengaturan", "Kasir & Izin", "Akun & Langganan"])));
    expect(navLabels()).not.toContain("Mode Pemilik");
    goto("/admin/pengaturan");
    await screen.findByText("Pengaturan", { selector: "h1" });
    expect(screen.queryByPlaceholderText("Password pemilik")).toBeNull();
  });

  it("Pengaturan > Keamanan explains there is no password and can create one (no 'current password' needed)", async () => {
    m = await mountApp({ biz: "warung", seed: noOwnerPassword, path: "/admin/pengaturan" });
    await screen.findByText(/belum ada password/);
    expect(screen.queryByLabelText("Password saat ini")).toBeNull();
    await m.user.type(screen.getByLabelText("Password pemilik baru"), "rahasia1");
    await m.user.type(screen.getByLabelText("Ulangi password pemilik"), "rahasia2");
    await m.user.click(screen.getByRole("button", { name: "Simpan Password" }));
    await screen.findByText("Konfirmasi password tidak cocok.");
    expect(hashInSheet(m)).toBe("");
    await m.user.clear(screen.getByLabelText("Ulangi password pemilik"));
    await m.user.type(screen.getByLabelText("Ulangi password pemilik"), "rahasia1");
    await m.user.click(screen.getByRole("button", { name: "Simpan Password" }));
    await waitFor(() => expect(hashInSheet(m!)).toMatch(/^[0-9a-f]{64}$/));
    // the section flips to change/lock mode, and the owner is not asked again this session
    await screen.findByRole("button", { name: "Kunci sekarang" });
    expect(screen.queryByPlaceholderText("Password pemilik")).toBeNull();
  });

  it("'Kunci sekarang' locks the owner menus until the new password is entered", async () => {
    m = await mountApp({ biz: "warung", seed: noOwnerPassword, path: "/admin/pengaturan" });
    await screen.findByText(/belum ada password/);
    await m.user.type(screen.getByLabelText("Password pemilik baru"), "rahasia1");
    await m.user.type(screen.getByLabelText("Ulangi password pemilik"), "rahasia1");
    await m.user.click(screen.getByRole("button", { name: "Simpan Password" }));
    await m.user.click(await screen.findByRole("button", { name: "Kunci sekarang" }));
    await screen.findByRole("heading", { name: "Masuk sebagai Pemilik" });
    expect(screen.getByText(/Tidak ada username/)).toBeTruthy();
    await m.user.type(screen.getByPlaceholderText("Password pemilik"), "rahasia1");
    await m.user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByText("Pengaturan", { selector: "h1" });
  });

  it("the first cashier cannot be registered until an owner password exists", async () => {
    m = await mountApp({ biz: "warung", paid: true, seed: noOwnerPassword, path: "/admin/kasir" });
    await screen.findByText("Kasir & Izin", { selector: "h1" });
    await m.user.click(screen.getAllByRole("button", { name: /^(\+ )?Tambah/ })[0]);
    await screen.findByText("Buat password pemilik dulu");
    expect(screen.queryByText("Tambah Kasir", { selector: "h2" })).toBeNull();
    await m.user.type(screen.getByLabelText("Password pemilik baru"), "pemilik9");
    await m.user.type(screen.getByLabelText("Ulangi password pemilik"), "pemilik9");
    await m.user.click(screen.getByRole("button", { name: /Simpan & Lanjut Tambah Kasir/ }));
    await screen.findByText("Tambah Kasir", { selector: "h2" }); // straight on to the cashier form
    expect(hashInSheet(m)).toMatch(/^[0-9a-f]{64}$/);
    await m.user.type(screen.getByPlaceholderText("Contoh: Dewi"), "Dewi");
    await m.user.type(screen.getByPlaceholderText("••••"), "1234");
    await m.user.click(screen.getByRole("button", { name: "Simpan" }));
    await screen.findByText("Dewi disimpan.");
    // now that a cashier exists the owner menus are locked for whoever is at the register
    await m.user.click(screen.getAllByRole("button", { name: /Ganti Kasir/ })[0]);
    await screen.findByText("Siapa yang bertugas?");
    goto("/admin/pengaturan");
    await screen.findByRole("heading", { name: "Masuk sebagai Pemilik" });
  });

  it("with a password and a cashier, the password can be changed but not removed", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI]);
    goto("/admin/pengaturan");
    await screen.findByLabelText("Password saat ini");
    expect(screen.getByText(/tidak bisa dihapus selama masih ada kasir aktif/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Hapus password/ })).toBeNull();
  });

  it("without cashiers the password can be removed again (needs the current password)", async () => {
    m = await mountApp({ biz: "warung" });
    await unlockOwner(m, "/admin/pengaturan");
    await screen.findByRole("button", { name: /Hapus password/ });
    await m.user.type(screen.getByLabelText("Password saat ini"), "salah-salah");
    await m.user.click(screen.getByRole("button", { name: /Hapus password/ }));
    await screen.findByText("Password saat ini salah.");
    expect(hashInSheet(m)).not.toBe("");
    await m.user.clear(screen.getByLabelText("Password saat ini"));
    await m.user.type(screen.getByLabelText("Password saat ini"), ownerPassword);
    await m.user.click(screen.getByRole("button", { name: /Hapus password/ }));
    await waitFor(() => expect(hashInSheet(m!)).toBe(""));
    await screen.findByText(/belum ada password/);
  });
});

describe("registering cashiers", () => {
  it("owner registers three roles on a paid plan; PINs are stored hashed", async () => {
    m = await mountApp({ biz: "resto", paid: true });
    await registerCashiers(m, [DEWI, BUDI, SARI]);
    const rows = m.sheets.tables.Kasir;
    expect(rows.map((r) => [r[1], r[3], r[4]])).toEqual([
      ["Dewi", "kasir", ""],
      ["Budi", "supervisor", "riwayat,batalkan"],
      ["Sari", "manajer", "riwayat,batalkan,laporan,produk"],
    ]);
    for (const r of rows) expect(r[2]).toMatch(/^[0-9a-f]{64}$/);
    const dump = JSON.stringify(rows);
    for (const pin of ["1234", "5678", "9999"]) expect(dump).not.toContain(`"${pin}"`);
  });

  it("free plan: the 3rd cashier is refused with an upgrade hint; deactivating one frees a slot", async () => {
    m = await mountApp({ biz: "warung" });
    await registerCashiers(m, [DEWI, BUDI]);
    await m.user.click(screen.getAllByRole("button", { name: /^(\+ )?Tambah/ })[0]);
    await screen.findByText(/Batas 2 kasir aktif/);
    expect(screen.queryByText("Tambah Kasir", { selector: "h2" })).toBeNull(); // form did not open
    expect(m.sheets.tables.Kasir.length).toBe(2);
    // free a slot
    await m.user.click(screen.getByRole("switch", { name: /Nonaktifkan Budi/ }));
    await screen.findByText("Budi dinonaktifkan.");
    await m.user.click(screen.getAllByRole("button", { name: /^(\+ )?Tambah/ })[0]);
    await screen.findByText("Tambah Kasir", { selector: "h2" });
  });

  it("duplicate names (case-insensitive) and bad PINs are rejected", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI]);
    await m.user.click(screen.getAllByRole("button", { name: /^(\+ )?Tambah/ })[0]);
    await screen.findByText("Tambah Kasir", { selector: "h2" });
    await m.user.type(screen.getByPlaceholderText("Contoh: Dewi"), "dewi");
    await m.user.type(screen.getByPlaceholderText("••••"), "4321");
    await m.user.click(screen.getByRole("button", { name: "Simpan" }));
    await screen.findByText(/sudah dipakai kasir lain/);
    await m.user.clear(screen.getByPlaceholderText("Contoh: Dewi"));
    await m.user.type(screen.getByPlaceholderText("Contoh: Dewi"), "Rina");
    await m.user.clear(screen.getByPlaceholderText("••••"));
    await m.user.type(screen.getByPlaceholderText("••••"), "12");
    await m.user.click(screen.getByRole("button", { name: "Simpan" }));
    await screen.findByText(/PIN harus 4-6 angka/);
    expect(m.sheets.tables.Kasir.length).toBe(1);
  });
});

describe("PIN gate", () => {
  it("locking the register shows the gate; owner can still get in with the admin password", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI]);
    await lockRegister(m);
    expect(path()).toBe("/kasir"); // not stranded on an admin page
    await m.user.click(screen.getByRole("button", { name: "Masuk sebagai pemilik" }));
    await m.user.type(screen.getByPlaceholderText("Password pemilik"), ownerPassword);
    await m.user.click(screen.getByRole("button", { name: /Masuk sebagai Pemilik/ }));
    await waitFor(() => expect(screen.queryByText("Siapa yang bertugas?")).toBeNull());
  });

  it("5 wrong PINs lock that cashier out — even the right PIN is refused during the lock", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI, BUDI]);
    await lockRegister(m);
    await m.user.click(screen.getByRole("button", { name: /Dewi/ }));
    await screen.findByText(/Halo, Dewi/);
    const enter = async (pin: string) => {
      for (const d of pin) await m!.user.click(screen.getByRole("button", { name: d }));
      await m!.user.click(screen.getByRole("button", { name: "Masuk" }));
    };
    await enter("0000");
    await screen.findByText(/Sisa percobaan: 4/);
    for (let i = 0; i < 4; i++) await enter("0000");
    await screen.findByText(/Terlalu banyak percobaan salah/);
    await enter("1234"); // correct, but locked
    expect(screen.getByText(/Halo, Dewi/)).toBeTruthy();
    expect(screen.getByText(/Coba lagi dalam/)).toBeTruthy();
    // the lock is per cashier: Budi is unaffected
    await m.user.click(screen.getByRole("button", { name: "Ganti kasir" }));
    await pinLogin(m, "Budi", "5678");
    await waitFor(() => expect(screen.queryByText(/Halo, Budi/)).toBeNull());
    expect(screen.getAllByText("Budi").length).toBeGreaterThan(0);
  });
});

describe("what each role can do", () => {
  it("KASIR (Dewi): sells under her own name, sees only her own sales, no admin menus", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI, BUDI]);
    // a sale by Budi earlier today, straight into the sheet
    const t = new Date().toISOString();
    m.sheets.tables.Transaksi.push(["budi-sale", t, "ani@toko.id", "Budi", "", JSON.stringify([{ produkId: "p0", nama: "Kopi Hitam", harga: 4000, qty: 1 }]), "1", "4000", "0", "0", "4000", "tunai", "4000", "0", "", "selesai", ""]);

    await pinLogin(m, "Dewi", "1234");
    await waitFor(() => expect(screen.queryByText("Siapa yang bertugas?")).toBeNull());
    expect(navLabels()).toEqual(["Kasir", "Riwayat Hari Ini", "Bantuan", "Mode Pemilik"]);

    await addToCart(m, [["Gorengan", 3]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    expect(m.sheets.tables.Transaksi.at(-1)![3]).toBe("Dewi");

    goto("/kasir/riwayat");
    await screen.findByText("Riwayat Hari Ini", { selector: "h1" });
    await waitFor(() => expect(screen.getByText(/1 transaksi/)).toBeTruthy()); // hers only, not Budi's
    expect(screen.queryByText(/4\.000/)).toBeNull();

    // admin URLs ask for the OWNER password, not the cashier's PIN
    goto("/admin/laporan");
    await screen.findByRole("heading", { name: "Masuk sebagai Pemilik" });
  });

  it("SUPERVISOR (Budi): history + void only — reports, products, settings and Kasir & Izin are closed", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI, BUDI]);
    await pinLogin(m, "Budi", "5678");
    await waitFor(() => expect(screen.queryByText("Siapa yang bertugas?")).toBeNull());
    await waitFor(() => expect(navLabels()).toContain("Transaksi"));
    expect(navLabels()).not.toEqual(expect.arrayContaining(["Laporan"]));
    expect(navLabels()).not.toEqual(expect.arrayContaining(["Pengaturan"]));
    expect(navLabels()).not.toEqual(expect.arrayContaining(["Kasir & Izin"]));
    expect(navLabels()).not.toEqual(expect.arrayContaining(["Produk"]));

    for (const denied of ["/admin/laporan", "/admin/produk", "/admin/pengaturan", "/admin/kasir", "/admin/akun"]) {
      goto(denied);
      await screen.findByText("Akses dibatasi");
    }
    goto("/admin/transaksi");
    await screen.findByText("Transaksi", { selector: "h1" });
  });

  it("MANAJER (Sari): reports and products yes; settings, Kasir & Izin and subscription stay owner-only", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [SARI]);
    await pinLogin(m, "Sari", "9999");
    await waitFor(() => expect(navLabels()).toContain("Laporan"));
    for (const ok of ["Dashboard", "Produk", "Kategori", "Transaksi", "Laporan"]) expect(navLabels()).toContain(ok);
    for (const no of ["Pengaturan", "Kasir & Izin", "Akun & Langganan"]) expect(navLabels()).not.toContain(no);
    goto("/admin/laporan");
    await screen.findByText("Laporan Penjualan");
    goto("/admin/produk");
    await screen.findByText("Produk", { selector: "h1" });
    for (const denied of ["/admin/pengaturan", "/admin/kasir", "/admin/akun", "/admin/pengaturan/printer"]) {
      goto(denied);
      await screen.findByText("Akses dibatasi");
    }
  });

  it("changing a cashier's permissions takes effect on the next sign-in", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI]);
    // give Dewi 'laporan'
    await m.user.click(screen.getByRole("button", { name: /Ubah Dewi/ }));
    await screen.findByText("Ubah Kasir", { selector: "h2" });
    await m.user.click(screen.getByRole("checkbox", { name: /Lihat laporan/ }));
    await m.user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(m!.sheets.tables.Kasir[0][4]).toBe("laporan"));
    await lockRegister(m);
    await pinLogin(m, "Dewi", "1234");
    await waitFor(() => expect(navLabels()).toContain("Laporan"));
    expect(navLabels()).not.toContain("Produk");
  });
});

describe("voiding a sale", () => {
  async function sellAs(mm: Mounted, who: Spec, item: [string, number]) {
    await pinLogin(mm, who[0], who[2]);
    await waitFor(() => expect(screen.queryByText("Siapa yang bertugas?")).toBeNull());
    await addToCart(mm, [item]);
    await checkout(mm, { method: "Tunai", cash: "pas" });
  }

  it("a supervisor voids a sale; it leaves revenue everywhere; it cannot be voided twice", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI, BUDI]);
    await lockRegister(m);
    await sellAs(m, DEWI, ["Kopi Hitam", 2]); // 8.000 by Dewi
    await lockRegister(m);
    await pinLogin(m, "Budi", "5678");
    await waitFor(() => expect(screen.queryByText("Siapa yang bertugas?")).toBeNull());

    goto("/admin/transaksi");
    await screen.findByText(/Dewi · 2 item/);
    await m.user.click(screen.getByRole("button", { name: /Dewi · 2 item/ }));
    await screen.findByText("Detail Transaksi");
    await m.user.click(await screen.findByRole("button", { name: "Batalkan Transaksi" }));
    await waitFor(() => expect(m!.sheets.tables.Transaksi.length).toBe(2));
    const [orig, rev] = m.sheets.tables.Transaksi;
    expect(orig[15]).toBe("selesai");
    expect(rev[15]).toBe("dibatalkan");
    expect(rev[16]).toBe(orig[0]); // points at the sale it reverses
    expect(rev[3]).toBe("Budi"); // who voided it (the original keeps who sold it)
    expect(orig[3]).toBe("Dewi");

    // second attempt: the button is gone
    goto("/admin/transaksi");
    await screen.findByText(/Dibatalkan/);
    await m.user.click(screen.getAllByRole("button", { name: /Dewi · 2 item/ })[0]);
    await screen.findByText("Detail Transaksi");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Batalkan Transaksi" })).toBeNull());
  });

  it("owner's dashboard and reports no longer count the voided sale", async () => {
    m = await mountApp({ biz: "warung", paid: true });
    await registerCashiers(m, [DEWI]);
    await lockRegister(m);
    await sellAs(m, DEWI, ["Kopi Hitam", 1]);
    // owner voids it
    await lockRegister(m);
    await unlockOwner(m, "/admin/transaksi");
    await screen.findByRole("button", { name: /Dewi · 1 item/ });
    await m.user.click(screen.getByRole("button", { name: /Dewi · 1 item/ }));
    await m.user.click(await screen.findByRole("button", { name: "Batalkan Transaksi" }));
    await waitFor(() => expect(m!.sheets.tables.Transaksi.length).toBe(2));

    goto("/admin");
    await screen.findByText("Transaksi Hari Ini");
    await waitFor(() => {
      const tile = screen.getByText("Transaksi Hari Ini").parentElement!;
      expect(within(tile).getByText("0")).toBeTruthy();
    });
    goto("/admin/laporan");
    await screen.findByText("Total Penjualan");
    await waitFor(() => {
      const tile = screen.getByText("Total Penjualan").parentElement!;
      expect(tile.textContent).toMatch(/Rp\s?0/);
    });
  });
});
