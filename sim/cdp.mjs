// Minimal Chrome DevTools Protocol driver (Node 22+, no dependencies): launches a
// headless Chrome, and gives scenario scripts real clicks/typing/screenshots plus
// console-error collection. Headless has no "background tab" throttling, unlike
// driving a tab in a normal window.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port = 9333) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sim-chrome-"));
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars=false", "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (targets.length) break;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  return new Page(ws, proc, dir);
}

export class Page {
  constructor(ws, proc, dir) {
    this.ws = ws;
    this.proc = proc;
    this.dir = dir;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    this.dialogs = []; // native alert/confirm/prompt texts seen (auto-accepted)
    this.viewport = { width: 1366, height: 768 };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(m.error.message)) : resolve(m.result);
      } else if (m.method === "Page.javascriptDialogOpening") {
        this.dialogs.push(m.params.type + ": " + m.params.message);
        this.send("Page.handleJavaScriptDialog", { accept: true });
      } else if (m.method === "Runtime.exceptionThrown") {
        this.errors.push("EXCEPTION " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text));
      } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
        this.errors.push("console.error " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async init() {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.setViewport(1366, 768);
  }
  // phone = true emulates a touch phone (mobile layout, meta viewport honoured)
  async setViewport(width, height, phone = false) {
    this.viewport = { width, height };
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: phone ? 2 : 1, mobile: phone });
    await this.send("Emulation.setTouchEmulationEnabled", { enabled: phone });
  }
  async goto(url, settle = 1500) {
    await this.send("Page.navigate", { url });
    // the dev server compiles lazily: wait for the app to actually render, not a fixed delay
    await sleep(300);
    await this.waitFor(`document.getElementById('root') && document.getElementById('root').children.length > 0`, 40000, "app to render").catch(() => {});
    await sleep(settle);
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  // Wait until fn (a JS expression string) is truthy in the page.
  async waitFor(expr, timeout = 8000, label = expr) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.eval(`Boolean(${expr})`).catch(() => false)) return true;
      await sleep(120);
    }
    throw new Error(`timeout waiting for: ${label}`);
  }
  // Locate a visible element by CSS selector and/or exact-ish text; returns its centre.
  async locate({ sel = "button, a, [role=button], [role=tab], input, label, summary", text, nth = 0, exact = false }) {
    const js = `(() => {
      const t = ${JSON.stringify(text ?? null)};
      const norm = (s) => (s || "").replace(/\\s+/g, " ").trim();
      const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      }).filter((e) => t === null || (${exact} ? (norm(e.innerText) === t || norm(e.getAttribute("aria-label")) === t) : (norm(e.innerText || e.getAttribute("aria-label") || e.value || e.placeholder).includes(t) || norm(e.getAttribute("aria-label")).includes(t))));
      const e = els[${nth}];
      if (!e) return null;
      e.scrollIntoView({ block: "center", inline: "center" });
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
    })()`;
    return this.eval(js);
  }
  async click(target) {
    const spec = typeof target === "string" ? { text: target } : target;
    await this.waitFor(`(${this.locateExpr(spec)})`, 6000, `element ${JSON.stringify(spec)}`);
    const p = await this.locate(spec);
    await this.mouse(p.x, p.y);
    await sleep(350);
    return p;
  }
  locateExpr(spec) {
    return `(() => { const t = ${JSON.stringify(spec.text ?? null)}; const norm = (s) => (s || "").replace(/\\s+/g, " ").trim(); return [...document.querySelectorAll(${JSON.stringify(spec.sel ?? "button, a, [role=button], [role=tab], input, label, summary")})].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (t === null || (${!!spec.exact} ? (norm(e.innerText) === t || norm(e.getAttribute("aria-label")) === t) : (norm(e.innerText || e.getAttribute("aria-label") || e.value || e.placeholder).includes(t) || norm(e.getAttribute("aria-label")).includes(t)))); }); })()`;
  }
  async mouse(x, y) {
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  async type(text) {
    for (const ch of text) {
      await this.send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, key: ch });
      await this.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
    }
    await sleep(150);
  }
  async press(key) {
    const codes = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, ArrowRight: 39, ArrowLeft: 37 };
    const vk = codes[key];
    await this.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, windowsVirtualKeyCode: vk, text: key === "Enter" ? "\r" : undefined });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: vk });
    await sleep(250);
  }
  async fill(sel, value) {
    const p = await this.locate({ sel });
    if (!p) throw new Error("no field " + sel);
    await this.mouse(p.x, p.y);
    await this.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.select && e.select(); })()`);
    await this.type(value);
  }
  async shot(file, { fullPage = false } = {}) {
    const r = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    return file;
  }
  async text() {
    return this.eval("document.body.innerText");
  }
  async close() {
    try {
      this.ws.close();
    } catch {
      /* already closed */
    }
    this.proc.kill();
    await sleep(300);
    try {
      fs.rmSync(this.dir, { recursive: true, force: true });
    } catch {
      /* chrome may still hold files */
    }
  }
}

export { sleep };
