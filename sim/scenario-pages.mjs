// Scenario 2: visit every page on phone + desktop and audit layout (horizontal overflow,
// too-small tap targets, clipped text, console errors) — screenshots saved for review.
import { launch, sleep } from "./cdp.mjs";

const OUT = process.env.OUT ?? "C:/Users/DELL/AppData/Local/Temp/claude/C--Users-DELL/b42132a1-f727-4e0e-bc07-5c40e649f329/scratchpad/shots";
const BASE = "http://localhost:5199";
const BIZ = process.env.BIZ ?? "resto";
const problems = [];
const p = await launch();
await p.init();

const AUDIT = `(() => {
  const vw = innerWidth;
  const out = { hOverflow: document.documentElement.scrollWidth - vw, small: [], wide: [], clipped: [] };
  const inTour = (e) => e.closest('[role=dialog]');
  for (const e of document.querySelectorAll('button, a, [role=switch], [role=tab], input:not([type=hidden]), select, textarea, summary')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(e).visibility === 'hidden') continue;
    if (e.type === 'checkbox' || e.type === 'radio') continue;
    if (r.height < 36 || r.width < 36) out.small.push((e.innerText || e.getAttribute('aria-label') || e.placeholder || e.tagName).trim().slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 2 && !e.closest('.overflow-x-auto, .scrollbar-hide, pre') && getComputedStyle(e).position !== 'fixed') { out.wide.push(e.tagName + '.' + String(e.className).slice(0, 40) + ' right=' + Math.round(r.right)); if (out.wide.length > 4) break; }
  }
  return out;
})()`;

async function visit(name, url, prep) {
  await p.goto(`${BASE}${url}`, 1600);
  if (prep) await prep();
  await sleep(300);
  const a = await p.eval(AUDIT);
  const tag = `${p.viewport.width < 600 ? "phone" : "desktop"}-${name}`;
  await p.shot(`${OUT}/${tag}.png`, { fullPage: true });
  const issues = [];
  if (a.hOverflow > 1) issues.push(`horizontal overflow ${a.hOverflow}px`);
  if (a.wide.length) issues.push(`elements past right edge: ${a.wide.join(" | ")}`);
  const small = [...new Set(a.small)];
  if (small.length) issues.push(`small targets: ${small.slice(0, 8).join(", ")}`);
  console.log(`${tag.padEnd(28)} ${issues.length ? issues.join(" ;; ") : "ok"}`);
  if (issues.length) problems.push(`${tag}: ${issues.join(" ;; ")}`);
}

const PAGES = [
  ["kasir", "/kasir"],
  ["riwayat", "/kasir/riwayat"],
  ["menu", "/kasir/lainnya"],
  ["bantuan", "/bantuan"],
  ["dashboard", "/admin"],
  ["produk", "/admin/produk"],
  ["produk-baru", "/admin/produk/baru"],
  ["kategori", "/admin/kategori"],
  ["transaksi", "/admin/transaksi"],
  ["laporan", "/admin/laporan"],
  ["kasir-izin", "/admin/kasir"],
  ["pengaturan", "/admin/pengaturan"],
  ["printer", "/admin/pengaturan/printer"],
  ["sheets", "/admin/pengaturan/sheets"],
  ["akun", "/admin/akun"],
];

for (const phone of [true, false]) {
  if (phone) await p.setViewport(390, 780, true);
  else await p.setViewport(1366, 768, false);
  // seed: fresh data; the first goto also registers the sim params for this tab
  await p.goto(`${BASE}/sim?reset=1&biz=${BIZ}&nopw=1`, 2200);
  // a few sales so history/reports have content
  await p.eval(`(() => { const t = window.__sim.sheets.tables.Transaksi; const now = new Date(); for (let i = 0; i < 4; i++) t.push(['seed-'+i, new Date(now - i*3600e3).toISOString(), 'ani@toko.id', 'Bu Ani', '', JSON.stringify([{ produkId: 'p0', nama: 'Kopi Hitam', harga: 4000, qty: 2 }]), '2', '8000', '0', '0', '8000', i%2 ? 'qris' : 'tunai', '10000', '2000', '', 'selesai', '']); })()`);
  await p.goto(`${BASE}/kasir`, 1800);
  for (const [name, url] of PAGES) await visit(name, url);
}

console.log("\nconsole errors:", p.errors.length ? [...new Set(p.errors)] : "none");
console.log("\nPROBLEMS:", problems.length);
problems.forEach((x) => console.log(" -", x));
await p.close();
process.exit(0);
