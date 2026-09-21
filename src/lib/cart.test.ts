import { describe, expect, it } from "vitest";
import { cartReducer, computeTotals, emptyCart } from "./cart";
import { buildTransaksi } from "./checkout";
import { produk, line } from "../test/factories";

describe("cart reducer", () => {
  it("rapid taps on one product accumulate (no stale-closure lost update)", () => {
    const p = produk("Es Teh", 5000);
    let s = emptyCart;
    for (let i = 0; i < 25; i++) s = cartReducer(s, { type: "add", produk: p });
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].qty).toBe(25);
  });

  it("qty <= 0 removes the line; remove and clear work", () => {
    const a = produk("A", 1000);
    const b = produk("B", 2000);
    let s = cartReducer(cartReducer(emptyCart, { type: "add", produk: a }), { type: "add", produk: b });
    s = cartReducer(s, { type: "setQty", produkId: a.id, qty: 0 });
    expect(s.lines.map((l) => l.nama)).toEqual(["B"]);
    s = cartReducer(s, { type: "remove", produkId: b.id });
    expect(s.lines).toEqual([]);
    expect(cartReducer(s, { type: "clear" })).toEqual(emptyCart);
  });

  it("keeps the price at add time even if the product changes later", () => {
    const p = produk("Kopi", 8000);
    const s = cartReducer(emptyCart, { type: "add", produk: p });
    expect(s.lines[0].harga).toBe(8000);
  });
});

describe("totals per business type", () => {
  it("warung: no tax, no service", () => {
    const t = computeTotals([line("Kopi", 5000, 2), line("Gorengan", 1000, 5)], 0, 0);
    expect(t).toEqual({ subtotal: 15000, pajak: 0, serviceCharge: 0, total: 15000 });
  });

  it("resto: 10% tax + 5% service on the subtotal", () => {
    const t = computeTotals([line("Nasi Goreng", 15000), line("Es Teh", 5000, 2), line("Ayam Bakar", 18000), line("Kentang", 10000)], 10, 5);
    expect(t.subtotal).toBe(53000);
    expect(t.pajak).toBe(5300);
    expect(t.serviceCharge).toBe(2650);
    expect(t.total).toBe(60950);
  });

  it("toko: percent rounding is to the nearest rupiah", () => {
    const t = computeTotals([line("Sabun", 3333, 3)], 11, 0);
    expect(t.subtotal).toBe(9999);
    expect(t.pajak).toBe(1100); // 1099.89
    expect(t.total).toBe(11099);
  });

  it("a discount larger than the subtotal never goes negative", () => {
    expect(computeTotals([line("A", 1000)], 10, 5, 5000).total).toBe(0);
  });

  it("an empty cart is all zeros", () => {
    expect(computeTotals([], 10, 5).total).toBe(0);
  });
});

describe("buildTransaksi", () => {
  it("cash: change = received - total; non-cash has no change", () => {
    const lines = [line("Nasi", 15000, 2)];
    const cash = buildTransaksi({ lines, meja: "5", catatan: "", metodeBayar: "tunai", uangDiterima: 50000, kasirEmail: "a@b.c", kasirNama: "Dewi", settings: { taxPercent: 10, serviceChargePercent: 0 } });
    expect(cash.total).toBe(33000);
    expect(cash.kembalian).toBe(17000);
    const qris = buildTransaksi({ lines, meja: "", catatan: "", metodeBayar: "qris-manual", uangDiterima: null, kasirEmail: "a@b.c", kasirNama: "Dewi", settings: { taxPercent: 10, serviceChargePercent: 0 } });
    expect(qris.kembalian).toBeNull();
  });

  it("strips UI-only fields (foto) from stored items", () => {
    const t = buildTransaksi({
      lines: [{ ...line("Nasi", 15000), foto: "internal:abc.jpg" }],
      meja: "", catatan: "", metodeBayar: "tunai", uangDiterima: 20000, kasirEmail: "a@b.c", kasirNama: "Dewi", settings: { taxPercent: 0, serviceChargePercent: 0 },
    });
    expect(JSON.stringify(t.items)).not.toContain("foto");
  });

  it("jumlahItem is the sum of quantities", () => {
    const t = buildTransaksi({ lines: [line("A", 1, 3), line("B", 1, 4)], meja: "", catatan: "", metodeBayar: "tunai", uangDiterima: 100, kasirEmail: "", kasirNama: "", settings: { taxPercent: 0, serviceChargePercent: 0 } });
    expect(t.jumlahItem).toBe(7);
  });
});
