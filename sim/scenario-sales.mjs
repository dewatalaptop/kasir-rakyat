// Scenario 3 (phone): the everyday sale flow, including things that go wrong.
import { launch, sleep } from "./cdp.mjs";

const OUT = process.env.OUT ?? "C:/Users/DELL/AppData/Local/Temp/claude/C--Users-DELL/b42132a1-f727-4e0e-bc07-5c40e649f329/scratchpad/shots";
const BASE = "http://localhost:5199";
const problems = [];
const check = (ok, msg) => {
  console.log(ok ? "  ok  " : "  FAIL", msg);
  if (!ok) problems.push(msg);
};
const p = await launch();
await p.init();
await p.setViewport(390, 780, true);
const body = () => p.text();
const rows = () => p.eval(`window.__sim.sheets.tables.Transaksi.length`);
const lastTx = () => p.eval(`JSON.stringify(window.__sim.sheets.tables.Transaksi.at(-1))`).then((s) => JSON.parse(s ?? "null"));

console.log("== A. tunai sale, exact + change");
await p.goto(`${BASE}/sim?reset=1&biz=warung&nopw=1`, 2500);
await p.click({ text: "Kopi Hitam", sel: "button" });
await p.click({ text: "Kopi Hitam", sel: "button" });
await p.click({ text: "Gorengan", sel: "button" });
await p.shot(`${OUT}/sales-1-catalog-with-bar.png`);
check((await body()).includes("Lihat keranjang"), "floating cart bar appears after adding items");
check(/Rp.?9.000/.test(await body()), "cart bar total = 2×4.000 + 1.000 = 9.000");
await p.click("Lihat keranjang");
await p.waitFor(`document.body.innerText.includes('Lanjut Bayar')`, 5000, "Lanjut Bayar");
await p.shot(`${OUT}/sales-2-cart.png`);
await p.click("Lanjut Bayar");
await p.waitFor(`document.body.innerText.includes('Konfirmasi Diterima')`, 5000, "payment page");
await p.shot(`${OUT}/sales-3-payment.png`);
const t0 = await body();
check(/Tunai/.test(t0), "payment page offers Tunai");
// insufficient cash first
await p.click({ text: "Tunai", sel: "button" });
const cashSel = 'input[placeholder="0"]';
await p.fill(cashSel, "5000");
await sleep(300);
const disabled = await p.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('Konfirmasi Diterima')).disabled`);
check(disabled === true, "confirm is disabled while cash (5.000) < total (9.000)");
await p.shot(`${OUT}/sales-4-cash-short.png`);
await p.fill(cashSel, "20000");
await sleep(300);
const t1 = await body();
check(/Kembalian/i.test(t1) && /11\.000/.test(t1), "change of 11.000 is shown for cash 20.000");
await p.click("Konfirmasi Diterima");
await p.waitFor(`document.body.innerText.includes('Struk Transaksi')`, 8000, "receipt");
await sleep(500);
await p.shot(`${OUT}/sales-5-receipt.png`, { fullPage: true });
const tx = await lastTx();
check(!!tx && tx[10] === "9000" && tx[12] === "20000" && tx[13] === "11000", `sheet row saved with total/cash/change = ${tx && [tx[10], tx[12], tx[13]]}`);
check((await p.eval(`JSON.parse(localStorage.getItem('kasirRakyat.guide')||'{}').marked?.includes('jual')`)) === true, "Panduan Awal step 'jual' ticked");

console.log("== B. history shows the sale; back to catalog has empty cart");
await p.goto(`${BASE}/kasir/riwayat`, 1500);
const h = await body();
check(/1 transaksi/.test(h), "history says 1 transaksi");
await p.shot(`${OUT}/sales-6-history.png`);
await p.goto(`${BASE}/kasir`, 1500);
check(!(await body()).includes("Lihat keranjang"), "cart is empty after the sale (no floating bar)");

console.log("== C. search with no results, then clear");
await p.fill('input[type=search]', "zzzz");
await sleep(400);
check((await body()).includes("Produk tidak ditemukan"), "empty search result explained");
await p.shot(`${OUT}/sales-7-search-empty.png`);
await p.fill('input[type=search]', "");
await p.eval(`(() => { const i = document.querySelector('input[type=search]'); i.value=''; })()`);

console.log("== D. sold-out product (stock 0)");
await p.eval(`(() => { const t = window.__sim.sheets.tables.Produk; const r = t.find(x => x[1] === 'Rokok Filter'); r[6] = '0'; })()`);
await sleep(700); // let the sim persist the edit before reloading
await p.goto(`${BASE}/kasir`, 1800);
await p.shot(`${OUT}/sales-8-soldout.png`);
const before = await body();
check(/Habis/.test(before), "sold-out product is labelled Habis");
try {
  await p.click({ text: "Rokok Filter", sel: "button" });
  await sleep(300);
  const after = await body();
  check(!after.includes("Lihat keranjang"), "a sold-out product cannot be added to the cart");
} catch (e) {
  console.log("  (could not click Rokok Filter:", e.message + ")");
}

console.log("== E. offline: sale is queued, then syncs when back online");
await p.goto(`${BASE}/kasir`, 1500);
await p.click({ text: "Es Teh", sel: "button" });
await p.eval(`window.__sim.sheets.offline = true`);
await p.click("Lihat keranjang");
await p.click("Lanjut Bayar");
await p.waitFor(`document.body.innerText.includes('Konfirmasi Diterima')`, 5000);
await p.click({ text: "Tunai", sel: "button" });
await p.fill(cashSel, "3000");
await p.click("Konfirmasi Diterima");
await p.waitFor(`document.body.innerText.includes('Struk Transaksi')`, 12000, "receipt while offline");
const qLen = await p.eval(`JSON.parse(localStorage.getItem('kasirRakyat.pendingTransaksi') || '[]').length`);
check(qLen === 1, `offline sale queued locally (queue length ${qLen})`);
await p.shot(`${OUT}/sales-9-offline-receipt.png`);
const rowsBefore = await rows();
await p.eval(`window.__sim.sheets.offline = false; window.dispatchEvent(new Event('online'))`);
await sleep(2500);
const qAfter = await p.eval(`JSON.parse(localStorage.getItem('kasirRakyat.pendingTransaksi') || '[]').length`);
check(qAfter === 0 && (await rows()) === rowsBefore + 1, `queue flushed to the sheet after reconnect (queue ${qAfter}, rows ${rowsBefore}→${await rows()})`);

console.log("== F. reload keeps everything");
const n = await rows();
await p.goto(`${BASE}/kasir/riwayat`, 2500);
check(/2 transaksi/.test(await body()), "after reload history still lists both sales");

console.log("== G. void a sale as owner (Transaksi > detail > Batalkan)");
await p.goto(`${BASE}/admin/transaksi`, 2000);
await p.shot(`${OUT}/sales-10-admin-transaksi.png`);
try {
  await p.click({ sel: "a, button, [role=button], tr, li, div[class*=shape-card]", text: "Rp" });
} catch {
  /* fall through to the check below */
}
await sleep(800);
const d = await body();
console.log("  detail page text has Batalkan:", d.includes("Batalkan"));
if (d.includes("Batalkan")) {
  await p.click("Batalkan");
  await sleep(1200);
  console.log("  native dialogs:", p.dialogs);
  await p.shot(`${OUT}/sales-11-void-confirm.png`);
  console.log("  after Batalkan click:", (await body()).slice(0, 200).replace(/\n/g, " | "));
}

console.log("\nconsole errors:", p.errors.length ? [...new Set(p.errors)] : "none");
console.log("PROBLEMS:", problems.length);
problems.forEach((x) => console.log(" -", x));
await p.close();
process.exit(0);
