// Scenario 4 (phone): first-time owner registers cashiers, PIN gate, roles, owner sign-in, lock.
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
const ph = (placeholder) => `input[placeholder="${placeholder}"]`;
const tableRows = (name) => p.eval(`JSON.stringify(window.__sim.sheets.tables.${name})`).then((s) => JSON.parse(s));
const hash = () => p.eval(`window.__sim.sheets.tables.Pengaturan.find(r => r[0]==='admin_password_hash')[1]`);

console.log("== A. owner without password opens admin freely");
await p.goto(`${BASE}/sim?reset=1&biz=warung&nopw=1&paid=1`, 2500);
await p.goto(`${BASE}/admin/kasir`, 2000);
check((await body()).includes("Kasir & Izin"), "Kasir & Izin opens straight away (no password prompt)");
check(!/username/i.test(await body().then((t) => t.split("\n").filter((l) => /Masuk|Buat/.test(l)).join(" "))), "no 'username' wording");
await p.shot(`${OUT}/access-1-kasir-empty.png`);

console.log("== B. first cashier => must create the owner password first");
await p.click({ text: "Tambah Kasir Pertama" });
await p.waitFor(`document.body.innerText.includes('Buat password pemilik dulu')`, 4000, "password sheet");
await p.shot(`${OUT}/access-2-need-password.png`);
await p.fill(ph("Password pemilik (baru)"), "rahasia1");
await p.fill(ph("Ulangi password"), "rahasia2");
await p.click({ text: "Simpan & Lanjut", sel: "button" });
check((await body()).includes("Konfirmasi password tidak cocok"), "mismatched confirmation is refused with a message");
await p.fill(ph("Ulangi password"), "rahasia1");
await p.click({ text: "Simpan & Lanjut", sel: "button" });
await p.waitFor(`document.body.innerText.includes('Tambah Kasir')`, 5000, "cashier form after password");
check(/^[0-9a-f]{64}$/.test(await hash()), "password hash stored in the sheet");
await p.shot(`${OUT}/access-3-cashier-form.png`);

console.log("== C. register Dewi (Kasir) and Budi (Supervisor)");
async function addCashier(name, role, pin) {
  await p.fill(ph("Contoh: Dewi"), name);
  await p.click({ text: role, sel: "button", exact: true });
  await p.fill(ph("••••"), pin);
  await p.click({ text: "Simpan", sel: "button", exact: true });
  await p.waitFor(`document.body.innerText.includes('${name} disimpan.')`, 6000, `${name} saved`);
}
await addCashier("Dewi", "Kasir", "1234");
await p.shot(`${OUT}/access-4-list.png`);
await p.click({ text: "Tambah", sel: "button", exact: true });
await p.waitFor(`document.body.innerText.includes('Tambah Kasir')`, 4000);
await addCashier("Budi", "Supervisor", "5678");
const kasir = await tableRows("Kasir");
check(kasir.length === 2 && kasir.every((r) => /^[0-9a-f]{64}$/.test(r[2])), "two cashiers saved with hashed PINs");

console.log("== D. lock the register, cashier logs in with the PIN pad");
await p.goto(`${BASE}/kasir`, 1500);
await p.click({ sel: "button", text: "Ganti kasir" });
await p.waitFor(`document.body.innerText.includes('Siapa yang bertugas?')`, 5000, "PIN gate");
await p.shot(`${OUT}/access-5-pin-gate.png`);
await p.click({ text: "Dewi", sel: "button" });
await p.waitFor(`document.body.innerText.includes('Halo, Dewi')`, 4000);
for (const d of "0000") await p.click({ text: d, sel: "button", exact: true });
await p.click({ text: "Masuk", sel: "button", exact: true });
await sleep(500);
check((await body()).includes("Sisa percobaan"), "wrong PIN is refused and attempts left are shown");
await p.shot(`${OUT}/access-6-wrong-pin.png`);
for (const d of "1234") await p.click({ text: d, sel: "button", exact: true });
await p.click({ text: "Masuk", sel: "button", exact: true });
await sleep(800);
check(!(await body()).includes("Siapa yang bertugas?"), "right PIN opens the register");
await p.shot(`${OUT}/access-7-dewi-catalog.png`);

console.log("== E. cashier tries admin pages");
await p.goto(`${BASE}/admin/pengaturan`, 1800);
const t = await body();
check(/Masuk sebagai Pemilik/.test(t) && !/Simpan Pengaturan/.test(t), "cashier is stopped at the owner sign-in for Pengaturan");
await p.shot(`${OUT}/access-8-owner-prompt.png`);
await p.fill(ph("Password pemilik"), "salah");
await p.click({ text: "Masuk", sel: "button", exact: true });
check((await body()).includes("Password salah"), "wrong owner password is refused");
await p.fill(ph("Password pemilik"), "rahasia1");
await p.click({ text: "Masuk", sel: "button", exact: true });
await p.waitFor(`document.body.innerText.includes('Simpan Pengaturan')`, 5000, "settings after owner sign-in");
check(true, "right owner password opens Pengaturan");
await p.shot(`${OUT}/access-9-settings-owner.png`, { fullPage: true });

console.log("== F. Keamanan card shows change/lock/remove rules");
const s = await body();
check(s.includes("Kunci sekarang") && s.includes("Ubah Password Pemilik"), "Keamanan offers Kunci sekarang + Ubah Password Pemilik");
check(s.includes("tidak bisa dihapus selama masih ada kasir aktif"), "removing the password is blocked while cashiers are active");

console.log("== G. Kunci sekarang re-locks; owner name shown");
await p.click({ text: "Kunci sekarang", sel: "button" });
await sleep(600);
check(/Masuk sebagai Pemilik/.test(await body()), "after Kunci sekarang the password prompt returns");

console.log("\nnative dialogs:", p.dialogs);
console.log("console errors:", p.errors.length ? [...new Set(p.errors)] : "none");
console.log("PROBLEMS:", problems.length);
problems.forEach((x) => console.log(" -", x));
await p.close();
process.exit(0);
