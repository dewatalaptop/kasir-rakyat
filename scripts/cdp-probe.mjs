// Attaches to the app's WebView through Chrome DevTools (adb-forwarded socket)
// and evaluates a probe: platform detection, plugin availability, and a REAL
// native Filesystem write/read/delete round trip in the app's private storage.
import { execSync } from "node:child_process";

const pkg = process.argv[2];
const sh = (c) => execSync(c, { encoding: "utf8" }).trim();

const pid = sh(`adb shell pidof ${pkg}`);
sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);
const targets = await (await fetch("http://localhost:9222/json")).json();
const page = targets.find((t) => t.type === "page") ?? targets[0];
if (!page) throw new Error("no WebView page target");
console.log("target:", page.url);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
const evalJs = (expression) =>
  new Promise((resolve) => {
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id === 1) resolve(m); };
    ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
  });

const probe = `(async () => {
  const C = window.Capacitor, out = {};
  out.href = location.href;
  out.platform = C && C.getPlatform();
  out.native = C && C.isNativePlatform();
  out.plugins = {};
  for (const n of ["Camera", "Filesystem", "FirebaseAuthentication", "BluetoothLe"]) out.plugins[n] = C.isPluginAvailable(n);
  // Real native calls: the BLE plugin must answer (on an emulator with no Bluetooth
  // hardware the point is that it fails with a readable message instead of crashing),
  // and the Camera plugin must report its permission state.
  try { await C.nativePromise("BluetoothLe", "initialize", {}); out.bleInitialize = "ok"; }
  catch (e) { out.bleInitialize = "error: " + String((e && e.message) || e); }
  try { out.cameraPermissions = await C.nativePromise("Camera", "checkPermissions", {}); }
  catch (e) { out.cameraPermissions = "error: " + String((e && e.message) || e); }
  try {
    const b64 = btoa("kasir-rakyat-native-test");
    await C.nativePromise("Filesystem", "writeFile", { path: "produk-foto/emu-test.jpg", data: b64, directory: "DATA", recursive: true });
    const r = await C.nativePromise("Filesystem", "readFile", { path: "produk-foto/emu-test.jpg", directory: "DATA" });
    out.filesystemRoundTrip = r.data === b64;
    await C.nativePromise("Filesystem", "deleteFile", { path: "produk-foto/emu-test.jpg", directory: "DATA" });
    try { await C.nativePromise("Filesystem", "readFile", { path: "produk-foto/emu-test.jpg", directory: "DATA" }); out.deleted = false; }
    catch { out.deleted = true; }
  } catch (e) { out.filesystemError = String((e && e.message) || e); }
  out.bodyText = document.body.innerText.slice(0, 240);
  return JSON.stringify(out);
})()`;
const res = await evalJs(probe);
console.log(res.result?.result?.value ?? JSON.stringify(res));
ws.close();
