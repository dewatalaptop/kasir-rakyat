import { render, screen, within, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "../App";
import { storeAccessToken } from "../lib/sheets";
import { createFakeSheets, NAMES, OWNER_PASSWORD, type Biz, type FakeSheets } from "./mocks/fakeSheets";
import { createFakeServer, type FakeServer } from "./mocks/fakeServer";
import { printer } from "./mocks/fakeBle";
import { GUIDE_KEY, tourStore } from "../lib/guide";

// Hoisted holder so the vi.mock factories in each test file can reach the
// current fake server (factories run before imports).
export const holder: { srv: FakeServer | null } = { srv: null };

export interface Mounted {
  sheets: FakeSheets;
  server: FakeServer;
  user: ReturnType<typeof userEvent.setup>;
  biz: Biz;
}

export async function mountApp(opts: {
  biz: Biz;
  paid?: boolean;
  android?: boolean;
  path?: string;
  // localStorage entries to seed AFTER the reset (e.g. a saved printer, a license cache)
  local?: Record<string, string>;
  // extra rows to seed into a sheet tab before the app boots
  seed?: (sheets: FakeSheets) => void;
  serverOffline?: boolean;
  // Leave the first-run tour/welcome enabled (off by default so unrelated tests
  // are not interrupted by the welcome dialog).
  tour?: boolean;
}): Promise<Mounted> {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  printer.reset();
  tourStore.set(false);
  if (opts.android) localStorage.setItem("kasirRakyat.devPlatform", "android");
  if (!opts.tour) localStorage.setItem(GUIDE_KEY, JSON.stringify({ marked: [], checklistHidden: false, tourSeen: true, tipsClosed: [] }));

  const sheets = await createFakeSheets(opts.biz);
  sheets.install();
  opts.seed?.(sheets);
  const server = createFakeServer({ paid: !!opts.paid });
  server.offline = !!opts.serverOffline;
  holder.srv = server;
  for (const [k, v] of Object.entries(opts.local ?? {})) localStorage.setItem(k, v);

  storeAccessToken("mock-token");
  localStorage.setItem("kasirRakyat.spreadsheetId", "mock-sheet");
  window.history.pushState({}, "", opts.path ?? "/kasir");
  window.confirm = vi.fn(() => true);

  const user = userEvent.setup({ delay: null });
  render(<App />);
  await screen.findAllByText(NAMES[opts.biz], {}, { timeout: 15000 });
  return { sheets, server, user, biz: opts.biz };
}

export function unmountApp(m?: Mounted) {
  cleanup();
  m?.sheets.uninstall();
  holder.srv = null;
}

export const path = () => window.location.pathname;

export function goto(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// The desktop "Transaksi" cart panel (always in the DOM under jsdom: no CSS).
export function cartPanel(): HTMLElement {
  return screen.getByRole("heading", { name: "Transaksi", level: 2 }).closest("section") as HTMLElement;
}

export async function addToCart(m: Mounted, items: [string, number][]) {
  await waitFor(() => screen.getByRole("button", { name: new RegExp(items[0][0]) }));
  for (const [name, qty] of items) {
    const btn = screen.getAllByRole("button", { name: new RegExp(name) }).find((b) => b.className.includes("shape-card")) ?? screen.getByRole("button", { name: new RegExp(name) });
    for (let i = 0; i < qty; i++) await m.user.click(btn);
  }
}

export type PayMethod = "Tunai" | "QRIS (manual)" | "Transfer (manual)" | "Lainnya";

// Cart -> pay -> receipt, through the real screens. Returns the receipt element.
export async function checkout(m: Mounted, opts: { method?: PayMethod; cash?: number | "pas"; meja?: string } = {}): Promise<HTMLElement> {
  const panel = cartPanel();
  if (opts.meja) await m.user.type(within(panel).getByLabelText(/Meja/), opts.meja);
  await m.user.click(within(panel).getByRole("button", { name: "Bayar" }));
  await screen.findByText("Pembayaran");
  const method = opts.method ?? "Tunai";
  await m.user.click(screen.getByRole("button", { name: method }));
  if (method === "Tunai") {
    if (opts.cash === "pas" || opts.cash === undefined) await m.user.click(screen.getByRole("button", { name: "Uang Pas" }));
    else {
      const input = screen.getByPlaceholderText("0") as HTMLInputElement;
      await m.user.clear(input);
      await m.user.type(input, String(opts.cash));
    }
  }
  await m.user.click(screen.getByRole("button", { name: "Konfirmasi Diterima" }));
  await screen.findByText("Struk Transaksi", {}, { timeout: 20000 });
  return document.getElementById("receipt") as HTMLElement;
}

export const ownerPassword = OWNER_PASSWORD;

// Owner mode = admin password (through the real "Mode Pemilik" entry).
export async function unlockOwner(m: Mounted, to = "/admin/kasir") {
  goto(to);
  const field = await screen.findByPlaceholderText("Password pemilik");
  await m.user.type(field, OWNER_PASSWORD);
  await m.user.click(screen.getByRole("button", { name: /^Masuk/ }));
}

export { screen, within, waitFor };
