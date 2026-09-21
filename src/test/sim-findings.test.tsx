// @vitest-environment jsdom
// Regression tests for problems found by driving the real app in a real browser (sim/).
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { BarChart } from "../components/ui/BarChart";
import { addToCart, checkout, holder, mountApp, screen, unmountApp, within, cartPanel, type Mounted } from "./harness";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid", displayName: "Bu Ani", email: "ani@toko.id", photoURL: null }, loading: false }),
}));
vi.mock("../firebase", () => ({ firebaseAuth: { currentUser: { uid: "owner-uid", email: "ani@toko.id" } }, googleProvider: {}, functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: (_f: unknown, name: string) => (d: unknown) => holder.srv!.callable(name)(d) }));
vi.mock("@capacitor-community/bluetooth-le", async () => await import("./mocks/fakeBle"));

let m: Mounted | undefined;
afterEach(() => unmountApp(m));

const isPrimary = (b: HTMLElement) => b.className.includes("bg-[var(--brand-500)]");

describe("receipt print buttons only offer what works on this device", () => {
  it("plain web browser: RawBT (an Android app) is not offered and browser print is the highlighted way", async () => {
    m = await mountApp({ biz: "warung" }); // default printer preference is RawBT
    await addToCart(m, [["Gorengan", 1]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    expect(screen.queryByRole("button", { name: /Cetak via RawBT/ })).toBeNull();
    expect(isPrimary(screen.getByRole("button", { name: "Cetak dari Browser" }))).toBe(true);
  });

  it("Android app: RawBT stays available and is the highlighted way when chosen", async () => {
    m = await mountApp({ biz: "warung", android: true });
    await addToCart(m, [["Gorengan", 1]]);
    await checkout(m, { method: "Tunai", cash: "pas" });
    expect(isPrimary(screen.getByRole("button", { name: /Cetak via RawBT/ }))).toBe(true);
  });
});

describe("payment screen", () => {
  it("cash is preselected (by far the most common way to pay): the cash box is already there", async () => {
    m = await mountApp({ biz: "warung" });
    await addToCart(m, [["Gorengan", 1]]);
    await m.user.click(within(cartPanel()).getByRole("button", { name: "Bayar" }));
    await screen.findByText("Pembayaran");
    expect(screen.getByPlaceholderText("0")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tunai" }).className).toContain("border-[var(--brand-500)]");
  });
});

describe("sales chart axis", () => {
  // axis labels only (numbers like "0", "250rb", "1,5jt") — not the day labels or the empty-state message
  const ticks = (c: HTMLElement) => [...c.querySelectorAll("text")].map((t) => t.textContent ?? "").filter((t) => /^[0-9,.]+(rb|jt)?$/.test(t));
  it("with no sales it shows just the baseline, not '1 1 1 0 0'", () => {
    const { container } = render(<BarChart data={[{ label: "Sen", value: 0 }, { label: "Sel", value: 0 }]} />);
    const axis = ticks(container);
    expect(axis).toEqual(["0"]);
  });
  it("never repeats a label on the axis, and real values keep their scale", () => {
    const { container } = render(<BarChart data={[{ label: "Sen", value: 2 }]} />);
    const axis = ticks(container);
    expect(new Set(axis).size).toBe(axis.length);
    const big = render(<BarChart data={[{ label: "Sen", value: 1_200_000 }]} />);
    expect(ticks(big.container)).toEqual(expect.arrayContaining(["0", "1,5jt"]));
  });
});
