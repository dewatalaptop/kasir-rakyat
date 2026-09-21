// Scenario 7: tour after onboarding, table number end-to-end, upgrade flow, Android-only screens.
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
const body = () => p.text();

console.log("== A. welcome/tour appears for a brand-new account right after onboarding (phone)");
await p.setViewport(390, 780, true);
await p.goto(`${BASE}/sim?reset=1&biz=warung&onboard=1&tour=1`, 2500);
await p.click({ text: "Hubungkan Google Sheets", sel: "button" });
await sleep(2500);
await p.click({ text: "Lanjut", sel: "button" });
await sleep(700);
const inp = await p.locate({ sel: "input" });
await p.mouse(inp.x, inp.y);
await p.type("Warung Uji");
await p.click({ text: "Lanjut", sel: "button" });
await sleep(700);
await p.click({ text: "Ya, isi contoh produk", sel: "button" });
await sleep(3000);
check((await body()).includes("Selamat datang di Kasir Rakyat"), "welcome dialog shows after onboarding");
await p.shot(`${OUT}/misc-1-welcome-after-onboarding.png`);
await p.click({ text: "Nanti saja", sel: "button" });

console.log("== B. resto: table number reaches the receipt and history (desktop)");
await p.setViewport(1440, 900, false);
await p.goto(`${BASE}/sim?reset=1&biz=resto&nopw=1`, 2500);
await p.click({ text: "Nasi Goreng", sel: "button.shape-card" });
await p.fill('aside[data-tour=cart] input[placeholder="Meja"]', "12");
await p.click({ text: "Bayar", sel: "aside[data-tour=cart] button" });
await p.waitFor(`document.body.innerText.includes('Konfirmasi Diterima')`, 6000);
await p.click({ text: "Tunai", sel: "button" });
await p.fill('input[placeholder="0"]', "100000");
await p.click("Konfirmasi Diterima");
await p.waitFor(`document.body.innerText.includes('Struk Transaksi')`, 8000);
const rec = await body();
check(/Meja\s*\n?\s*12/.test(rec), "receipt shows Meja 12");
check(/Kembalian/.test(rec), "receipt shows Kembalian for cash");
const row = await p.eval(`JSON.stringify(window.__sim.sheets.tables.Transaksi.at(-1))`).then(JSON.parse);
check(row?.[4] === "12", `sheet row keeps meja (${row?.[4]})`);
console.log("   receipt text:", rec.split("\n").filter((l) => /Tunai|Bayar|Kembali|Diterima|Meja/.test(l)).join(" | "));
check(await p.eval(`(() => { const b = [...document.querySelectorAll('button')].find(b => /Cetak via RawBT/.test(b.innerText)); return b && b.className.includes('brand-500') })()`) === false || true, "(info) RawBT button style on desktop");
const primary = await p.eval(`[...document.querySelectorAll('button')].filter(b => /^Cetak/.test(b.innerText.trim())).map(b => b.innerText.trim() + ':' + (b.className.includes('bg-[var(--brand-500)]') ? 'PRIMARY' : 'secondary'))`);
console.log("   print buttons on desktop:", primary);

console.log("== C. upgrade flow (free plan) on phone");
await p.setViewport(390, 780, true);
await p.goto(`${BASE}/sim?reset=1&biz=warung&nopw=1`, 2500);
await p.goto(`${BASE}/admin/akun`, 2000);
await p.shot(`${OUT}/misc-2-akun-free.png`, { fullPage: true });
await p.click({ text: "Upgrade", sel: "button" });
await sleep(1500);
await p.shot(`${OUT}/misc-3-akun-pending.png`, { fullPage: true });
const pend = await body();
check(/Transfer TEPAT sejumlah/.test(pend) && /kode unik/.test(pend), "pending transfer instructions with unique code shown");
await p.eval(`window.__sim.server.approve()`);
await p.waitFor(`document.body.innerText.includes('Versi berbayar aktif')`, 20000, "page flips to paid by itself").then(
  () => check(true, "page flips to paid after approval, without manual refresh"),
  () => check(false, "page did NOT flip to paid within 20s after approval"),
);

console.log("== D. Android-only screens (dev android mode)");
await p.goto(`${BASE}/sim?reset=1&biz=warung&nopw=1&paid=1&android=1`, 2500);
await p.goto(`${BASE}/admin/pengaturan/printer`, 2000);
await p.shot(`${OUT}/misc-4-printer-android.png`, { fullPage: true });
console.log("   printer page:", (await body()).replace(/\n+/g, " | ").slice(0, 500));
await p.goto(`${BASE}/admin/produk/baru`, 2000);
await p.shot(`${OUT}/misc-5-produk-baru-android.png`, { fullPage: true });
console.log("   product form:", (await body()).replace(/\n+/g, " | ").slice(0, 500));

console.log("\nconsole errors:", p.errors.length ? [...new Set(p.errors)] : "none");
console.log("PROBLEMS:", problems.length);
problems.forEach((x) => console.log(" -", x));
await p.close();
process.exit(0);
