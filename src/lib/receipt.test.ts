import { describe, expect, it } from "vitest";
import { buildReceiptText, toPrinterText } from "./receipt";
import { formatRupiah } from "./format";
import { baseSettings, line, trx } from "../test/factories";

const widest = (text: string) => Math.max(...text.split("\n").map((l) => l.length));
const nonAscii = (text: string) => [...text].filter((c) => c.charCodeAt(0) > 126);

describe("thermal receipt text (32 columns)", () => {
  it("fits 58mm paper for a typical resto receipt", () => {
    const t = trx({
      meja: "12",
      items: [line("Nasi Goreng Spesial Seafood", 25000, 2), line("Es Teh Manis", 5000, 3), line("Ayam Bakar Madu Kecap Pedas", 32000)],
      jumlahItem: 6,
      subtotal: 97000,
      pajak: 9700,
      total: 106700,
      uangDiterima: 110000,
      kembalian: 3300,
    });
    const text = buildReceiptText(t, baseSettings({ businessName: "Restoran Sedap Rasa Nusantara" }));
    expect(widest(text)).toBeLessThanOrEqual(32);
    expect(text).toContain("TOTAL");
    expect(text).toContain("Kembali");
  });

  it("hard-wraps a product name longer than the paper width", () => {
    const t = trx({ items: [line("Supercalifragilisticexpialidocious_Produk_Panjang_Sekali", 1000)] });
    expect(widest(buildReceiptText(t, baseSettings()))).toBeLessThanOrEqual(32);
  });

  it("keeps large amounts on one row without truncating the price", () => {
    const t = trx({ items: [line("Mesin Kopi Profesional", 12500000, 2)], subtotal: 25000000, total: 25000000, uangDiterima: 30000000, kembalian: 5000000 });
    const text = buildReceiptText(t, baseSettings());
    expect(widest(text)).toBeLessThanOrEqual(32);
    expect(text).toContain("25.000.000");
  });

  it("contains only printable ASCII (thermal printers default to CP437)", () => {
    const text = buildReceiptText(trx(), baseSettings({ receiptFooterText: "Terima kasih — sampai jumpa lagi ✓" }));
    expect(nonAscii(text)).toEqual([]);
  });

  it("toPrinterText makes formatRupiah output printer-safe (Intl uses a non-breaking space)", () => {
    expect(nonAscii(formatRupiah(15000))).not.toEqual([]); // the raw UI string is NOT safe
    expect(nonAscii(toPrinterText(formatRupiah(15000)))).toEqual([]);
    expect(toPrinterText("Café — 2× ✓")).toBe("Cafe - 2x ");
  });

  it("shows the watermark line only when asked", () => {
    expect(buildReceiptText(trx(), baseSettings(), true)).toContain("gratis");
    expect(buildReceiptText(trx(), baseSettings(), false)).not.toContain("gratis");
  });
});

describe("service charge on receipts (resto)", () => {
  it("prints a Service row so the lines add up to TOTAL", async () => {
    const { serviceChargeOf } = await import("./receipt");
    const t = trx({ items: [line("Nasi", 20000, 2)], subtotal: 40000, pajak: 4000, total: 46000, uangDiterima: 50000, kembalian: 4000 });
    expect(serviceChargeOf(t)).toBe(2000);
    const text = buildReceiptText(t, baseSettings());
    expect(text).toContain("Service");
    expect(text).toContain("Pajak");
  });

  it("no Service row when there is none", () => {
    expect(buildReceiptText(trx(), baseSettings())).not.toContain("Service");
  });

  it("80mm paper uses 48 columns", () => {
    const text = buildReceiptText(trx({ items: [line("Nasi Goreng Spesial", 15000, 2)] }), baseSettings(), false, 48);
    expect(widest(text)).toBeLessThanOrEqual(48);
    expect(widest(text)).toBeGreaterThan(32);
  });
});
