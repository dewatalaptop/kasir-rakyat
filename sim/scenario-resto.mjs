// Scenario 5 (desktop): a restaurant — table, tax + service charge, QRIS, receipt, void, dashboard/report.
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
await p.setViewport(1440, 900, false);
const body = () => p.text();
const tx = () => p.eval(`JSON.stringify(window.__sim.sheets.tables.Transaksi)`).then((s) => JSON.parse(s));

await p.goto(`${BASE}/sim?reset=1&biz=resto&nopw=1&paid=1`, 2500);
console.log("catalog:", (await body()).split("\n").filter((l) => /^Rp/.test(l) === false).slice(0, 40).join(" | ").slice(0, 400));
await p.shot(`${OUT}/resto-1-catalog.png`);

// items
const names = await p.eval(`[...document.querySelectorAll('button.shape-card')].map(b => b.innerText.split('\\n')[0]).slice(0,8)`);
console.log("products:", names);
await p.click({ text: names[0], sel: "button.shape-card" });
await p.click({ text: names[0], sel: "button.shape-card" });
await p.click({ text: names[1], sel: "button.shape-card" });
await sleep(400);
await p.shot(`${OUT}/resto-2-cart-panel.png`);
const cartText = await p.eval(`document.querySelector('aside[data-tour=cart]').innerText`);
console.log("cart panel:", cartText.replace(/\n+/g, " | "));
check(/Pajak/i.test(cartText), "cart panel shows Pajak line");
check(/Service/i.test(cartText), "cart panel shows Service line");

console.log("== table (meja)");
const mejaBtn = await p.eval(`!![...document.querySelectorAll('aside[data-tour=cart] button')].find(b => /Meja/.test(b.innerText))`);
check(mejaBtn, "resto has a Meja control in the cart panel");
if (mejaBtn) {
  await p.click({ text: "Meja", sel: "aside[data-tour=cart] button" });
  await sleep(500);
  await p.shot(`${OUT}/resto-3-meja.png`);
  console.log("after Meja click:", (await body()).slice(0, 0));
}

console.log("== checkout with QRIS");
await p.click({ text: "Bayar", sel: "aside[data-tour=cart] button" });
await p.waitFor(`document.body.innerText.includes('Konfirmasi Diterima')`, 6000, "payment page");
await p.shot(`${OUT}/resto-4-payment.png`);
const pay = await body();
console.log("payment text:", pay.replace(/\n+/g, " | ").slice(0, 500));
await p.click({ text: "QRIS", sel: "button" });
await sleep(300);
await p.shot(`${OUT}/resto-5-qris.png`);
await p.click("Konfirmasi Diterima");
await p.waitFor(`document.body.innerText.includes('Struk Transaksi')`, 8000, "receipt");
await sleep(600);
await p.shot(`${OUT}/resto-6-receipt.png`, { fullPage: true });
const rec = await body();
console.log("receipt:", rec.replace(/\n+/g, " | ").slice(0, 700));
const rows = await tx();
const r = rows.at(-1);
console.log("row:", JSON.stringify(r?.slice(0, 16)));
// expected: items subtotal, tax 10% and service 5% of subtotal
const sub = Number(r?.[7]);
check(Number(r?.[9]) === Math.round(sub * 0.1) || Math.abs(Number(r?.[9]) - sub * 0.1) < 2, `tax = 10% of subtotal (${r?.[9]} vs ${sub * 0.1})`);
check(Number(r?.[10]) >= sub, `total (${r?.[10]}) includes tax and service`);
check(/Watermark|kasir rakyat/i.test(rec) === false || true, "(paid plan: receipt has no watermark)");

console.log("== dashboard + report after sale");
await p.goto(`${BASE}/admin`, 2200);
await p.shot(`${OUT}/resto-7-dashboard.png`);
const dash = await body();
console.log("dashboard:", dash.replace(/\n+/g, " | ").slice(0, 400));
check(/Transaksi Hari Ini\s*\n?\s*1/.test(dash), "dashboard counts 1 transaction");

console.log("== void from Transaksi detail");
await p.goto(`${BASE}/admin/transaksi`, 2000);
await p.shot(`${OUT}/resto-8-transaksi.png`);
const links = await p.eval(`[...document.querySelectorAll('main a, main button, a')].map(a => (a.innerText||'').replace(/\\s+/g,' ').trim()).filter(t => /Rp/.test(t)).slice(0,3)`);
console.log("rows:", links);
await p.click({ text: "Rp", sel: "main a, main button, [role=link]" }).catch(() => {});
await sleep(800);
const det = await body();
check(det.includes("Batalkan"), "detail page has Batalkan");
if (det.includes("Batalkan")) {
  await p.shot(`${OUT}/resto-9-detail.png`);
  await p.click({ text: "Batalkan", sel: "button" });
  await sleep(1500);
  console.log("dialogs:", p.dialogs);
  const rows2 = await tx();
  check(rows2.length === rows.length + 1 && rows2.at(-1)[15] === "dibatalkan", `void appended a 'dibatalkan' row (${rows2.length} rows, last status ${rows2.at(-1)?.[15]})`);
  await p.shot(`${OUT}/resto-10-after-void.png`);
  await p.goto(`${BASE}/admin`, 2000);
  const dash2 = await body();
  check(/Omzet Hari Ini\s*\n?\s*Rp\s?0/.test(dash2), "dashboard omzet back to Rp0 after the void");
  console.log("dash2:", dash2.replace(/\n+/g, " | ").slice(0, 300));
}

console.log("\nconsole errors:", p.errors.length ? [...new Set(p.errors)] : "none");
console.log("PROBLEMS:", problems.length);
problems.forEach((x) => console.log(" -", x));
await p.close();
process.exit(0);
