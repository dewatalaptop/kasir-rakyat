// Simulation entry. URL params (remembered for the tab, so reloads keep them):
//   biz=warung|resto|toko|lainnya   paid=1   nopw=1 (owner never set a password)
//   onboard=1 (brand-new Google account: no spreadsheet/settings yet)  signedout=1 (not logged in)
//   forbid=1 (the cached spreadsheet belongs to another account => Google answers 403)
//   android=1 (act as the Android app)  tour=1 (first-run tour on)  reset=1 (wipe fake data, once)
import { createFakeSheets, type Biz } from "../src/test/mocks/fakeSheets";
import { createFakeServer } from "../src/test/mocks/fakeServer";
import { storeAccessToken } from "../src/lib/sheets";

const PARAMS_KEY = "sim.params";
const TABLES_KEY = "sim.tables";

const fromUrl = new URLSearchParams(location.search);
const isFresh = fromUrl.get("reset") === "1";
if (isFresh) {
  localStorage.clear();
  sessionStorage.clear();
}
if ([...fromUrl.keys()].length > 0) sessionStorage.setItem(PARAMS_KEY, location.search);
const q = new URLSearchParams(sessionStorage.getItem(PARAMS_KEY) ?? "");
const biz = (q.get("biz") ?? "warung") as Biz;
// keep the address bar clean (and free of one-shot params) so reloads don't re-reset
history.replaceState(null, "", location.pathname === "/sim.html" || location.pathname === "/sim" ? "/kasir" : location.pathname);

async function boot() {
  const sheets = await createFakeSheets(biz);
  const saved = localStorage.getItem(TABLES_KEY);
  if (saved) Object.assign(sheets.tables, JSON.parse(saved));
  else if (q.get("nopw") === "1") sheets.tables.Pengaturan.find((r) => r[0] === "admin_password_hash")![1] = "";
  if (q.get("onboard") === "1" && !saved) {
    sheets.tables.Pengaturan.length = 0;
    sheets.tables.Produk.length = 0;
    sheets.tables.Kategori.length = 0;
  }
  if (q.get("forbid") === "1") sheets.forbiddenIds.add("sim-sheet");
  sheets.install();
  // persist fake data so reloads behave like a real spreadsheet
  setInterval(() => localStorage.setItem(TABLES_KEY, JSON.stringify(sheets.tables)), 400);

  const server = createFakeServer({ paid: q.get("paid") === "1" });
  (window as unknown as { __sim: unknown }).__sim = { sheets, server };

  if (q.get("android") === "1") localStorage.setItem("kasirRakyat.devPlatform", "android");
  if (q.get("tour") !== "1" && !localStorage.getItem("kasirRakyat.guide")) {
    localStorage.setItem("kasirRakyat.guide", JSON.stringify({ marked: [], checklistHidden: false, tourSeen: true, tipsClosed: [] }));
  }
  storeAccessToken("sim-token");
  if (q.get("onboard") !== "1") localStorage.setItem("kasirRakyat.spreadsheetId", "sim-sheet");
  localStorage.setItem("kasirRakyat.ownerUid", "owner-uid");
  if (q.get("signedout") === "1") localStorage.setItem("sim.signedOut", "1");

  await import("../src/main");
}
void boot();
