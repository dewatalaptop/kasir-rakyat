// Scenario 6 (phone): signed-out landing + login, brand-new account onboarding, broken-connection screen.
import { launch, sleep } from "./cdp.mjs";
const OUT = process.env.OUT ?? "C:/Users/DELL/AppData/Local/Temp/claude/C--Users-DELL/b42132a1-f727-4e0e-bc07-5c40e649f329/scratchpad/shots";
const BASE = "http://localhost:5199";
const p = await launch();
await p.init();
await p.setViewport(390, 780, true);
const body = () => p.text();
const dump = async (label) => console.log(`[${label}]`, (await body()).replace(/\n+/g, " | ").slice(0, 420));

console.log("== signed out: landing");
await p.goto(`${BASE}/sim?reset=1&biz=warung&signedout=1&onboard=1`, 2500);
await p.goto(`${BASE}/`, 1500);
await p.shot(`${OUT}/first-1-landing.png`, { fullPage: true });
await dump("landing");
console.log("== login page");
await p.goto(`${BASE}/login`, 1500);
await p.shot(`${OUT}/first-2-login.png`);
await dump("login");
await p.click({ text: "Masuk dengan Google", sel: "button" });
await sleep(2500);
console.log("after login path:", await p.eval("location.pathname"));
await p.shot(`${OUT}/first-3-after-login.png`);
await dump("after login");

console.log("== onboarding steps");
for (let i = 0; i < 6; i++) {
  const path = await p.eval("location.pathname");
  if (!path.includes("onboarding")) break;
  const t = await body();
  console.log(`-- step ${i + 1}:`, t.replace(/\n+/g, " | ").slice(0, 300));
  await p.shot(`${OUT}/first-4-onboarding-${i + 1}.png`);
  const btns = await p.eval(`[...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => b.innerText.trim()).filter(Boolean)`);
  console.log("   buttons:", btns);
  // fill visible text inputs
  const inputs = await p.eval(`[...document.querySelectorAll('input')].filter(i => i.offsetWidth && i.type !== 'hidden').map(i => i.placeholder || i.name || i.type)`);
  console.log("   inputs:", inputs);
  if (inputs.length) {
    const first = await p.locate({ sel: "input" });
    await p.mouse(first.x, first.y);
    await p.type("Warung Uji Coba");
  }
  const next = btns.find((b) => /Lanjut|Berikutnya|Mulai|Simpan|Ya, isi|Hubungkan|Sambungkan|Selesai/.test(b));
  if (!next) break;
  await p.click({ text: next, sel: "button" });
  await sleep(2500);
}
console.log("final path:", await p.eval("location.pathname"));
await p.shot(`${OUT}/first-5-after-onboarding.png`);
await dump("after onboarding");

console.log("== broken connection: cached spreadsheet belongs to another account (403)");
await p.goto(`${BASE}/sim?reset=1&biz=warung&forbid=1`, 2500);
await p.goto(`${BASE}/kasir`, 2000);
await p.shot(`${OUT}/first-6-forbidden.png`);
await dump("403 screen");

console.log("\nconsole errors:", p.errors.length ? [...new Set(p.errors)] : "none");
await p.close();
process.exit(0);
