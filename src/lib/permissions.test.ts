import { describe, expect, it } from "vitest";
import {
  EMPTY_THROTTLE,
  ROLE_PRESETS,
  canAccess,
  hasAnyAdminPermission,
  hashPin,
  isNameTaken,
  isValidPin,
  lockRemainingMs,
  recordFailure,
  recordSuccess,
  verifyPin,
  type Requirement,
} from "./permissions";
import { kasirToRow, rowToKasir } from "./sheetsSchema";
import { limitsFor } from "./limits";
import type { KasirProfil, KasirRole } from "../types";

const profile = (role: KasirRole, over: Partial<KasirProfil> = {}): KasirProfil => ({
  id: `id-${role}`,
  nama: role.toUpperCase(),
  pinHash: "x",
  role,
  izin: [...ROLE_PRESETS[role]],
  aktif: true,
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("role presets and access matrix", () => {
  const reqs: Requirement[] = ["riwayat", "batalkan", "laporan", "produk", "any-admin", "owner"];
  const matrix = (p: KasirProfil | null, isOwner = false) => reqs.map((r) => canAccess(r, { isOwner, profile: p }));

  it("kasir: can do nothing in the admin area", () => {
    expect(matrix(profile("kasir"))).toEqual([false, false, false, false, false, false]);
  });

  it("supervisor: history + void only", () => {
    expect(matrix(profile("supervisor"))).toEqual([true, true, false, false, true, false]);
  });

  it("manajer: every grantable permission, but never owner-only areas", () => {
    expect(matrix(profile("manajer"))).toEqual([true, true, true, true, true, false]);
  });

  it("owner (admin password unlocked): everything, including owner-only", () => {
    expect(matrix(null, true)).toEqual([true, true, true, true, true, true]);
  });

  it("nobody signed in: nothing", () => {
    expect(matrix(null)).toEqual([false, false, false, false, false, false]);
  });

  it("a deactivated kasir has no access even with permissions", () => {
    expect(matrix(profile("manajer", { aktif: false }))).toEqual([false, false, false, false, false, false]);
  });

  it("custom permission sets are honoured (kasir + laporan only)", () => {
    const p = profile("kasir", { izin: ["laporan"] });
    expect(canAccess("laporan", { isOwner: false, profile: p })).toBe(true);
    expect(canAccess("produk", { isOwner: false, profile: p })).toBe(false);
    expect(hasAnyAdminPermission(p)).toBe(true);
  });
});

describe("PIN", () => {
  it("accepts 4-6 digits only", () => {
    for (const ok of ["1234", "12345", "123456"]) expect(isValidPin(ok)).toBe(true);
    for (const bad of ["", "123", "1234567", "12a4", "12 34", "١٢٣٤"]) expect(isValidPin(bad)).toBe(false);
  });

  it("verifies the right PIN and rejects a wrong one", async () => {
    const id = "abc";
    const k = { id, pinHash: await hashPin("4821", id) };
    expect(await verifyPin("4821", k)).toBe(true);
    expect(await verifyPin("4822", k)).toBe(false);
  });

  it("is salted per profile: same PIN, different hash", async () => {
    expect(await hashPin("1111", "a")).not.toBe(await hashPin("1111", "b"));
  });

  it("never stores the PIN itself", async () => {
    expect(await hashPin("4821", "abc")).not.toContain("4821");
  });
});

describe("brute-force throttle", () => {
  it("allows 4 misses, locks on the 5th, doubles, caps at 5 minutes, resets on success", () => {
    let s = EMPTY_THROTTLE;
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) {
      s = recordFailure(s, now);
      expect(lockRemainingMs(s, now)).toBe(0);
    }
    s = recordFailure(s, now); // 5th
    expect(lockRemainingMs(s, now)).toBe(30_000);
    s = recordFailure(s, now); // 6th
    expect(lockRemainingMs(s, now)).toBe(60_000);
    for (let i = 0; i < 10; i++) s = recordFailure(s, now);
    expect(lockRemainingMs(s, now)).toBe(300_000);
    expect(lockRemainingMs(s, now + 300_001)).toBe(0);
    expect(recordSuccess()).toEqual(EMPTY_THROTTLE);
  });
});

describe("registering kasir", () => {
  it("names are unique case-insensitively (sales are attributed by name)", () => {
    const list = [profile("kasir", { id: "1", nama: "Dewi" })];
    expect(isNameTaken("dewi ", list)).toBe(true);
    expect(isNameTaken("Dewi", list, "1")).toBe(false); // editing yourself
    expect(isNameTaken("Sari", list)).toBe(false);
  });

  it("free plan is capped at 2 kasir, paid is unlimited", () => {
    expect(limitsFor("gratis").maxKasir).toBe(2);
    expect(limitsFor("berbayar").maxKasir).toBe(Infinity);
  });

  it("survives a round trip through a sheet row (incl. 'aktif' word and izin list)", () => {
    const p = profile("supervisor", { id: "u-1", nama: "Budi", pinHash: "abc123", aktif: false });
    expect(rowToKasir(kasirToRow(p).map(String))).toEqual(p);
  });

  it("a row with garbage role/izin degrades safely to a plain kasir", () => {
    const p = rowToKasir(["u", "X", "h", "root", "hack,laporan", "ya", "", ""]);
    expect(p.role).toBe("kasir");
    expect(p.izin).toEqual(["laporan"]);
  });
});
