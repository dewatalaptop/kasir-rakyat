import { describe, expect, it } from "vitest";
import { LICENSE_GRACE_MS, decideFallback } from "./license";
import { canRenew, daysLeft, billingLabel, upgradeErrorMessage } from "./upgrade";
import { limitsFor } from "./limits";
import { productPhotoAccess } from "./features";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date("2026-09-21T12:00:00Z").getTime();

describe("license fallback when the server is unreachable", () => {
  const paid = { uid: "u1", expiresAt: new Date(NOW + 10 * DAY).toISOString(), checkedAt: NOW - 5 * HOUR };

  it("a recently confirmed paid account stays paid (offline shop keeps trading)", () => {
    expect(decideFallback(paid, "u1", NOW)).toEqual({ plan: "berbayar", expiresAt: paid.expiresAt, stale: true });
  });

  it("no cache => gratis (never fail open)", () => {
    expect(decideFallback(null, "u1", NOW).plan).toBe("gratis");
  });

  it("someone else's cached license never applies", () => {
    expect(decideFallback(paid, "u2", NOW).plan).toBe("gratis");
    expect(decideFallback(paid, null, NOW).plan).toBe("gratis");
  });

  it("the grace window ends after 72h without server confirmation", () => {
    expect(decideFallback({ ...paid, checkedAt: NOW - LICENSE_GRACE_MS + HOUR }, "u1", NOW).plan).toBe("berbayar");
    expect(decideFallback({ ...paid, checkedAt: NOW - LICENSE_GRACE_MS - HOUR }, "u1", NOW).plan).toBe("gratis");
  });

  it("an expired subscription cannot ride the cache", () => {
    expect(decideFallback({ ...paid, expiresAt: new Date(NOW - HOUR).toISOString() }, "u1", NOW).plan).toBe("gratis");
  });

  it("a lifetime purchase (no expiry) is honoured within the grace window", () => {
    expect(decideFallback({ ...paid, expiresAt: null }, "u1", NOW).plan).toBe("berbayar");
  });
});

describe("renewal and helpers", () => {
  it("daysLeft rounds up and handles lifetime", () => {
    expect(daysLeft(new Date(NOW + 2.2 * DAY).toISOString(), NOW)).toBe(3);
    expect(daysLeft(null, NOW)).toBeNull();
  });

  it("renew is offered only when active and within 7 days of expiry", () => {
    const lic = (days: number, active = true) => ({ active, expiresAt: new Date(NOW + days * DAY).toISOString() });
    expect(canRenew(lic(20), NOW)).toBe(false);
    expect(canRenew(lic(7), NOW)).toBe(true);
    expect(canRenew(lic(1), NOW)).toBe(true);
    expect(canRenew(lic(3, false), NOW)).toBe(false);
    expect(canRenew({ active: true, expiresAt: null }, NOW)).toBe(false);
  });

  it("billing labels", () => {
    expect(billingLabel("bulanan")).toBe("/bulan");
    expect(billingLabel("tahunan")).toBe("/tahun");
  });

  it("maps callable errors to readable text", () => {
    expect(upgradeErrorMessage(new Error("Rekening pembayaran belum diatur oleh penyedia aplikasi."))).toContain("Rekening");
    expect(upgradeErrorMessage(new Error("Failed to fetch"))).toContain("internet");
    expect(upgradeErrorMessage(new Error("unauthenticated"))).toContain("login");
  });
});

describe("what the paid plan unlocks (every gated feature, both plans)", () => {
  const free = limitsFor("gratis");
  const paid = limitsFor("berbayar");

  it("products, reports, kasir, watermark and photos are all gated on the plan", () => {
    expect(free).toMatchObject({ maxProduk: 20, laporanDayOptions: [7], receiptWatermark: true, productPhotos: false, maxKasir: 2 });
    expect(paid.maxProduk).toBe(Infinity);
    expect(paid.laporanDayOptions).toEqual([7, 30, 90]);
    expect(paid.receiptWatermark).toBe(false);
    expect(paid.productPhotos).toBe(true);
    expect(paid.maxKasir).toBe(Infinity);
  });

  it("product photos need BOTH a paid plan and the Android app", () => {
    // vitest runs in node: not Android
    expect(productPhotoAccess("gratis")).toEqual({ allowed: false, reason: "not-paid" });
    expect(productPhotoAccess("berbayar")).toEqual({ allowed: false, reason: "not-android" });
  });
});
