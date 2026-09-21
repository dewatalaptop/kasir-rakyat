// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { GUIDE_KEY } from "../lib/guide";
import { TOUR_STEPS } from "../components/help/Tour";
import { addToCart, checkout, goto, holder, mountApp, path, screen, unmountApp, unlockOwner, waitFor, type Mounted } from "./harness";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));

let m: Mounted | undefined;
afterEach(() => unmountApp(m));

const guide = () => JSON.parse(localStorage.getItem(GUIDE_KEY) ?? "{}");
const noOwnerPassword = (sheets: { tables: Record<string, string[][]> }) => {
  sheets.tables.Pengaturan.find((r) => r[0] === "admin_password_hash")![1] = "";
};

describe("first-run tour", () => {
  it("offers a welcome on the first visit; 'Nanti saja' closes it for good on this device", async () => {
    m = await mountApp({ biz: "warung", tour: true });
    await screen.findByRole("heading", { name: "Selamat datang di Kasir Rakyat!" });
    await m.user.click(screen.getByRole("button", { name: "Nanti saja" }));
    expect(screen.queryByRole("heading", { name: "Selamat datang di Kasir Rakyat!" })).toBeNull();
    expect(guide().tourSeen).toBe(true);
    // navigating around does not bring it back
    goto("/kasir/riwayat");
    await screen.findByText("Riwayat Hari Ini", { selector: "h1" });
    goto("/kasir");
    await screen.findByText("Kopi Hitam");
    expect(screen.queryByRole("heading", { name: "Selamat datang di Kasir Rakyat!" })).toBeNull();
  });

  it("walks every step in order (Kembali / Lanjut), and finishing marks it seen", async () => {
    m = await mountApp({ biz: "warung", tour: true });
    await m.user.click(await screen.findByRole("button", { name: "Mulai Tur" }));
    for (let i = 0; i < TOUR_STEPS.length; i++) {
      const step = TOUR_STEPS[i];
      await screen.findByText(`Langkah ${i + 1} dari ${TOUR_STEPS.length}`);
      expect(screen.getByRole("heading", { name: step.title })).toBeTruthy();
      if (i === 1) {
        await m.user.click(screen.getByRole("button", { name: "Kembali" }));
        await screen.findByText(`Langkah 1 dari ${TOUR_STEPS.length}`);
        await m.user.click(screen.getByRole("button", { name: "Lanjut" }));
        await screen.findByText(`Langkah 2 dari ${TOUR_STEPS.length}`);
      }
      if (i < TOUR_STEPS.length - 1) await m.user.click(screen.getByRole("button", { name: "Lanjut" }));
    }
    expect(screen.queryByRole("button", { name: "Lewati" })).toBeNull(); // no skip on the last step
    await m.user.click(screen.getByRole("button", { name: "Selesai" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(guide().tourSeen).toBe(true);
  });

  it("'Lewati' and Escape both leave the tour and mark it seen", async () => {
    m = await mountApp({ biz: "warung", tour: true });
    await m.user.click(await screen.findByRole("button", { name: "Mulai Tur" }));
    await screen.findByText(/Langkah 1 dari/);
    await m.user.click(screen.getByRole("button", { name: "Lewati" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(guide().tourSeen).toBe(true);
  });

  it("Bantuan > 'Mulai / Ulangi Tur' restarts it from the Kasir screen, even after it was seen", async () => {
    m = await mountApp({ biz: "warung" });
    goto("/bantuan");
    await screen.findByRole("heading", { name: "Bantuan & Tutorial" });
    await m.user.click(screen.getByRole("button", { name: "Mulai / Ulangi Tur" }));
    await screen.findByText(/Langkah 1 dari/);
    expect(path()).toBe("/kasir");
  });

  it("is not shown over the PIN gate: nothing to tour before someone has signed in", async () => {
    m = await mountApp({ biz: "warung", tour: true, paid: true, seed: (s) => {
      s.tables.Kasir = [["k1", "Dewi", "x".repeat(64), "kasir", "", "TRUE", new Date().toISOString(), new Date().toISOString()]];
    } });
    await screen.findByText("Siapa yang bertugas?");
    expect(screen.queryByRole("heading", { name: "Selamat datang di Kasir Rakyat!" })).toBeNull();
  });
});

describe("Panduan Awal checklist", () => {
  it("shows on the owner's dashboard with real progress that follows what the owner does", async () => {
    m = await mountApp({ biz: "warung", path: "/admin", seed: noOwnerPassword });
    const card = await screen.findByRole("region", { name: "Panduan Awal" });
    expect(card.textContent).toMatch(/0 dari 4 langkah selesai/);
    expect(screen.getByRole("progressbar", { name: "Kemajuan panduan awal" }).getAttribute("aria-valuenow")).toBe("0");

    // do a sale through the real screens
    goto("/kasir");
    await addToCart(m, [["Gorengan", 1]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    expect(guide().marked).toContain("jual");

    goto("/admin");
    await waitFor(() => expect(screen.getByRole("region", { name: "Panduan Awal" }).textContent).toMatch(/1 dari 4 langkah selesai/));
  });

  it("creating the owner password ticks the security step by itself", async () => {
    m = await mountApp({ biz: "warung", path: "/admin/pengaturan", seed: noOwnerPassword });
    await screen.findByText(/belum ada password/);
    await m.user.type(screen.getByLabelText("Password pemilik baru"), "rahasia1");
    await m.user.type(screen.getByLabelText("Ulangi password pemilik"), "rahasia1");
    await m.user.click(screen.getByRole("button", { name: "Simpan Password" }));
    await screen.findByRole("button", { name: "Kunci sekarang" });
    goto("/admin");
    await waitFor(() => expect(screen.getByRole("region", { name: "Panduan Awal" }).textContent).toMatch(/1 dari 4 langkah selesai/));
  });

  it("can be hidden, and stays reachable from Bantuan", async () => {
    m = await mountApp({ biz: "warung", path: "/admin", seed: noOwnerPassword });
    await screen.findByRole("region", { name: "Panduan Awal" });
    await m.user.click(screen.getByRole("button", { name: "Sembunyikan" }));
    expect(screen.queryByRole("region", { name: "Panduan Awal" })).toBeNull();
    goto("/bantuan");
    await screen.findByRole("region", { name: "Panduan Awal" }); // always shown there
  });

  it("is never shown to a cashier who is not the owner", async () => {
    m = await mountApp({ biz: "warung" });
    goto("/bantuan"); // shop with a password, nobody unlocked
    await screen.findByRole("heading", { name: "Bantuan & Tutorial" });
    expect(screen.queryByRole("region", { name: "Panduan Awal" })).toBeNull();
    // and the owner-only topics are not listed for them
    expect(screen.queryByText("Langganan & kode unik")).toBeNull();
    expect(screen.getByText("Cara menjual")).toBeTruthy();
    // once the owner signs in, the same page shows the checklist and the owner topics
    await unlockOwner(m, "/admin/kasir");
    await screen.findByText("Kasir & Izin", { selector: "h1" });
    goto("/bantuan");
    await screen.findByRole("region", { name: "Panduan Awal" });
    expect(screen.getByText("Langganan & kode unik")).toBeTruthy();
  });
});

describe("Bantuan", () => {
  it("lists topics, expands one with its steps, and searches", async () => {
    m = await mountApp({ biz: "warung", seed: noOwnerPassword });
    goto("/bantuan");
    await screen.findByRole("heading", { name: "Bantuan & Tutorial" });
    await m.user.click(screen.getByRole("button", { name: /Password pemilik \(tanpa username\)/ }));
    expect(screen.getByText(/admin_password_hash/)).toBeTruthy();
    await m.user.type(screen.getByRole("searchbox", { name: "Cari bantuan" }), "printer");
    await waitFor(() => expect(screen.queryByText("Cara menjual")).toBeNull());
    expect(screen.getByRole("button", { name: /Mencetak struk/ })).toBeTruthy();
    await m.user.clear(screen.getByRole("searchbox", { name: "Cari bantuan" }));
    await m.user.type(screen.getByRole("searchbox", { name: "Cari bantuan" }), "zzzz-tidak-ada");
    await screen.findByText(/Tidak ada topik yang cocok/);
  });

  it("every topic action points at a page that exists", async () => {
    const { HELP_TOPICS } = await import("../components/help/helpContent");
    for (const t of HELP_TOPICS) if (t.action) expect(t.action.to).toMatch(/^\/(admin|kasir|bantuan)/);
    expect(new Set(HELP_TOPICS.map((t) => t.key)).size).toBe(HELP_TOPICS.length);
  });
});

describe("page tips", () => {
  it("explain a screen once; closing one keeps it closed", async () => {
    m = await mountApp({ biz: "warung", path: "/admin/produk", seed: noOwnerPassword });
    await screen.findByRole("note", { name: /Nonaktifkan, jangan hapus/ });
    await m.user.click(screen.getByRole("button", { name: /Tutup tips: Nonaktifkan, jangan hapus/ }));
    expect(screen.queryByRole("note", { name: /Nonaktifkan, jangan hapus/ })).toBeNull();
    expect(guide().tipsClosed).toContain("produk-nonaktif");
    goto("/admin/kategori");
    await screen.findByText(/Kategori/, { selector: "h1" });
    goto("/admin/produk");
    await screen.findByText("Produk", { selector: "h1" });
    expect(screen.queryByRole("note", { name: /Nonaktifkan, jangan hapus/ })).toBeNull();
  });
});
