// Scenario 1: first-time owner (no password) — welcome, tour on desktop and phone, geometry checks.
import { launch, sleep } from "./cdp.mjs";

const OUT = process.env.OUT ?? "C:/Users/DELL/AppData/Local/Temp/claude/C--Users-DELL/b42132a1-f727-4e0e-bc07-5c40e649f329/scratchpad/shots";
const BASE = "http://localhost:5199";
const problems = [];
const note = (m) => {
  problems.push(m);
  console.log("PROBLEM:", m);
};

const p = await launch();
await p.init();

async function tourGeometry(label) {
  return p.eval(`(() => {
    const vw = innerWidth, vh = innerHeight;
    const card = document.querySelector('[role=dialog] .absolute.rounded-2xl.bg-\\\\[var\\\\(--surface\\\\)\\\\]');
    const spot = document.querySelector('[role=dialog] [aria-hidden].rounded-2xl');
    const r = card?.getBoundingClientRect();
    const s = spot?.getBoundingClientRect();
    return { vw, vh, card: r && { x: r.x, y: r.y, w: r.width, h: r.height }, spot: s && s.width < vw - 5 ? { x: s.x, y: s.y, w: s.width, h: s.height } : null,
      title: document.querySelector('[role=dialog] h2')?.innerText, step: [...document.querySelectorAll('[role=dialog] p')].find(e => /^Langkah/.test(e.innerText))?.innerText };
  })()`);
}

async function runTour(name) {
  await p.click("Mulai Tur");
  for (let i = 0; i < 6; i++) {
    await sleep(500);
    const g = await tourGeometry(name);
    await p.shot(`${OUT}/${name}-tour-${i + 1}.png`);
    console.log(name, g.step, "|", g.title, "| card", JSON.stringify(g.card), "| spot", JSON.stringify(g.spot));
    if (!g.card) {
      note(`${name} step ${i + 1}: tour card not found`);
    } else {
      if (g.card.x < 0 || g.card.y < 0 || g.card.x + g.card.w > g.vw + 1 || g.card.y + g.card.h > g.vh + 1) note(`${name} step ${i + 1} (${g.title}): card outside viewport ${JSON.stringify(g.card)} in ${g.vw}x${g.vh}`);
      if (g.spot) {
        const overlap = !(g.card.x + g.card.w <= g.spot.x || g.spot.x + g.spot.w <= g.card.x || g.card.y + g.card.h <= g.spot.y || g.spot.y + g.spot.h <= g.card.y);
        if (overlap) note(`${name} step ${i + 1} (${g.title}): tour card covers the highlighted element`);
      } else if (i < 5) console.log(`  (no spotlight on step ${i + 1}: target not visible => centered card)`);
    }
    if (i < 5) await p.click("Lanjut");
    else await p.click("Selesai");
  }
}

// ---- desktop
await p.goto(`${BASE}/sim?reset=1&biz=warung&nopw=1&tour=1`, 2500);
await p.waitFor(`document.body.innerText.includes('Selamat datang di Kasir Rakyat')`, 10000, "welcome");
await p.shot(`${OUT}/desktop-welcome.png`);
await runTour("desktop");
await sleep(300);
await p.shot(`${OUT}/desktop-after-tour.png`);
if ((await p.eval(`!!document.querySelector('[role=dialog]')`))) note("desktop: tour dialog still open after Selesai");

// ---- phone: fresh run so the welcome shows again
await p.setViewport(390, 780, true);
await p.goto(`${BASE}/sim?reset=1&biz=warung&nopw=1&tour=1`, 2500);
await p.waitFor(`document.body.innerText.includes('Selamat datang di Kasir Rakyat')`, 10000, "welcome (phone)");
await p.shot(`${OUT}/phone-welcome.png`);
await runTour("phone");
await p.shot(`${OUT}/phone-after-tour.png`);

console.log("\nconsole errors:", p.errors.length ? p.errors : "none");
console.log("problems:", problems.length ? problems : "none");
await p.close();
process.exit(0);
