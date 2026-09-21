import { describe, expect, it } from "vitest";
import { PAPER_WIDTHS, buildReceiptBytes, buildTestPageBytes, chunkBytes, decodeEscPos, type PaperWidthKey } from "./escpos";
import { PartialPrintError, findWriteTarget, friendlyBleError, sendToPrinter, type BleAdapter, type BleService } from "./bluetoothPrinter";
import { buildReceiptText } from "./receipt";
import { baseSettings, line, trx } from "../test/factories";

// A fake BLE thermal printer: records every write and lets tests set the MTU,
// the GATT layout, and a failure point.
function fakePrinter(opts: { mtu?: number | "unsupported"; services?: BleService[]; failOnWrite?: number } = {}) {
  const writes: Uint8Array[] = [];
  const adapter: BleAdapter = {
    initialize: async () => {},
    requestLEScan: async () => {},
    stopLEScan: async () => {},
    connect: async () => {},
    disconnect: async () => {},
    getServices: async () =>
      opts.services ?? [
        { uuid: "180a", characteristics: [{ uuid: "2a29", properties: {} }] }, // device info: not writable
        { uuid: "ff00", characteristics: [{ uuid: "ff02", properties: { writeWithoutResponse: true } }] },
      ],
    getMtu: async () => {
      if (opts.mtu === "unsupported") throw new Error("not supported");
      return opts.mtu ?? 23;
    },
    write: async (_d, _s, _c, data) => {
      if (opts.failOnWrite !== undefined && writes.length === opts.failOnWrite) throw new Error("GATT write failed");
      writes.push(data);
    },
  };
  return { adapter, writes, bytesReceived: () => Uint8Array.from(writes.flatMap((w) => [...w])) };
}

const noSleep = async () => {};

describe("ESC/POS receipt bytes", () => {
  const sale = trx({
    meja: "7",
    items: [line("Nasi Goreng Spesial", 25000, 2), line("Es Teh Manis", 5000, 3)],
    jumlahItem: 5,
    subtotal: 65000,
    pajak: 6500,
    total: 71500,
    uangDiterima: 100000,
    kembalian: 28500,
  });

  it("starts with init, prints the name bold, and ends with feed + cut", () => {
    const bytes = buildReceiptBytes(sale, baseSettings({ businessName: "Resto Sedap" }), { paperWidth: "58" });
    const decoded = decodeEscPos(bytes);
    expect(decoded.initialised).toBe(true);
    expect(decoded.cut).toBe(true);
    expect(decoded.boldLines.join(" ")).toContain("Resto Sedap");
    expect(decoded.lines.join("\n")).toContain("TOTAL");
    expect(decoded.lines.join("\n")).toContain("71.500");
  });

  for (const key of ["58", "80"] as PaperWidthKey[]) {
    it(`no printed line exceeds the ${key}mm column count`, () => {
      const cols = PAPER_WIDTHS[key].chars;
      const decoded = decodeEscPos(buildReceiptBytes(sale, baseSettings({ businessName: "Restoran Sedap Rasa Nusantara Raya" }), { paperWidth: key, watermark: true }));
      // the big business name is double-width, so it occupies 2 columns per char
      const body = decoded.lines.filter((l) => !decoded.boldLines.includes(l));
      for (const l of body) expect(l.length).toBeLessThanOrEqual(cols);
      for (const l of decoded.boldLines) expect(l.length * 2).toBeLessThanOrEqual(cols);
    });
  }

  it("never emits a byte the printer cannot render (NBSP / UTF-8 lead bytes / emoji)", () => {
    const bytes = buildReceiptBytes(sale, baseSettings({ businessName: "Café Ñandú ✓", receiptFooterText: "Terima kasih 🙏 — sampai jumpa" }), { paperWidth: "58" });
    // control bytes aside, every payload byte must be printable ASCII or LF
    const decoded = decodeEscPos(bytes);
    for (const l of decoded.lines) expect(/^[\x20-\x7e]*$/.test(l)).toBe(true);
  });

  it("prints the same content as the RawBT/clipboard text receipt", () => {
    const st = baseSettings({ businessName: "Toko Maju" });
    const fromBytes = decodeEscPos(buildReceiptBytes(sale, st, { paperWidth: "58" })).lines.map((l) => l.trim()).filter(Boolean);
    const fromText = buildReceiptText(sale, st).split("\n").map((l) => l.trim()).filter(Boolean);
    expect(fromBytes).toEqual(fromText);
  });

  it("test page reports the paper width and a full-width ruler", () => {
    const decoded = decodeEscPos(buildTestPageBytes("Warung Ibu", "80"));
    expect(decoded.lines.join("\n")).toContain("48 kolom");
    expect(decoded.lines.some((l) => l.length === 48 && /^\d+$/.test(l))).toBe(true);
    expect(decoded.cut).toBe(true);
  });
});

describe("BLE transport", () => {
  it("picks the first writable characteristic (skips read-only device-info)", async () => {
    const { adapter } = fakePrinter();
    expect(await findWriteTarget(adapter, "dev")).toEqual({ service: "ff00", characteristic: "ff02", writeWithoutResponse: true });
  });

  it("returns null when the device exposes nothing writable (not a printer)", async () => {
    const { adapter } = fakePrinter({ services: [{ uuid: "180d", characteristics: [{ uuid: "2a37", properties: {} }] }] });
    expect(await findWriteTarget(adapter, "dev")).toBeNull();
  });

  for (const mtu of [23, 185, 512] as const) {
    it(`chunks to MTU ${mtu} - 3 and reassembles the exact receipt`, async () => {
      const printer = fakePrinter({ mtu });
      const bytes = buildReceiptBytes(trx({ items: [line("Produk", 1000, 1)] }), baseSettings(), { paperWidth: "58" });
      const target = (await findWriteTarget(printer.adapter, "d"))!;
      const res = await sendToPrinter(printer.adapter, "d", target, bytes, { sleep: noSleep });
      expect(res.chunkSize).toBe(Math.max(20, mtu - 3));
      for (const w of printer.writes) expect(w.length).toBeLessThanOrEqual(res.chunkSize);
      expect([...printer.bytesReceived()]).toEqual([...bytes]);
    });
  }

  it("falls back to 20-byte chunks when the MTU can't be read", async () => {
    const printer = fakePrinter({ mtu: "unsupported" });
    const bytes = new Uint8Array(100).fill(65);
    const res = await sendToPrinter(printer.adapter, "d", (await findWriteTarget(printer.adapter, "d"))!, bytes, { sleep: noSleep });
    expect(res.chunkSize).toBe(20);
    expect(printer.writes.length).toBe(5);
  });

  it("pauses between chunks so cheap printers don't drop bytes", async () => {
    const printer = fakePrinter();
    const sleeps: number[] = [];
    const bytes = new Uint8Array(60).fill(1);
    await sendToPrinter(printer.adapter, "d", (await findWriteTarget(printer.adapter, "d"))!, bytes, { sleep: async (ms) => void sleeps.push(ms) });
    expect(sleeps.length).toBe(3);
    expect(sleeps.every((ms) => ms >= 10)).toBe(true);
  });

  it("a mid-print failure raises PartialPrintError with progress", async () => {
    const printer = fakePrinter({ failOnWrite: 2 });
    const bytes = new Uint8Array(100).fill(1);
    const err = await sendToPrinter(printer.adapter, "d", (await findWriteTarget(printer.adapter, "d"))!, bytes, { sleep: noSleep }).catch((e) => e);
    expect(err).toBeInstanceOf(PartialPrintError);
    expect(err.sent).toBe(2);
    expect(friendlyBleError(err, "x")).toContain("sebagian");
  });

  it("chunkBytes rejects a zero size instead of looping forever", () => {
    expect(() => chunkBytes(new Uint8Array(3), 0)).toThrow();
  });
});

describe("printer error messages are actionable Indonesian text", () => {
  const cases: [string, RegExp][] = [
    ["Location services are not enabled", /Lokasi/],
    ["Bluetooth is not enabled", /Bluetooth mati/],
    ["Missing permission BLUETOOTH_SCAN", /Izin Bluetooth/],
    ["Connection timeout", /Waktu tunggu/],
    ["BLE not available on this device", /tidak mendukung/],
  ];
  for (const [msg, expected] of cases) {
    it(`"${msg}"`, () => expect(friendlyBleError(new Error(msg), "Gagal")).toMatch(expected));
  }
  it("unknown errors keep the raw text so nothing is hidden", () => {
    expect(friendlyBleError(new Error("boom 42"), "Gagal terhubung")).toContain("boom 42");
  });
});
