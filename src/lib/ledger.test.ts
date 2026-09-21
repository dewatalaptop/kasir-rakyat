import { describe, expect, it } from "vitest";
import { computeTodayStats, dailySeries } from "./stats";
import { dedupeById, effectiveTransaksi, isVoided } from "./ledger";
import { trx, voidOf } from "../test/factories";

describe("ledger: voids and duplicates", () => {
  it("a voided sale is excluded from revenue (both the original and the reversal row)", () => {
    const a = trx({ total: 30000 });
    const b = trx({ total: 20000 });
    const rows = [a, b, voidOf(a)];
    const eff = effectiveTransaksi(rows);
    expect(eff.map((t) => t.id)).toEqual([b.id]);
    expect(eff.reduce((s, t) => s + t.total, 0)).toBe(20000);
  });

  it("today's stats and the daily chart do not count voided sales", () => {
    const a = trx({ total: 30000, jumlahItem: 2 });
    const b = trx({ total: 20000, jumlahItem: 1 });
    const stats = computeTodayStats([a, b, voidOf(a)]);
    expect(stats.today.count).toBe(1);
    expect(stats.today.omzet).toBe(20000);
    expect(stats.today.itemsSold).toBe(1);
    const series = dailySeries([a, b, voidOf(a)], 3);
    expect(series[series.length - 1].omzet).toBe(20000);
  });

  it("dedupes a retried append that landed twice (same id)", () => {
    const a = trx({ total: 12000 });
    expect(dedupeById([a, { ...a }, trx()]).length).toBe(2);
    expect(effectiveTransaksi([a, { ...a }]).length).toBe(1);
  });

  it("isVoided reports a sale that already has a reversal", () => {
    const a = trx();
    expect(isVoided(a, [a])).toBe(false);
    expect(isVoided(a, [a, voidOf(a)])).toBe(true);
  });

  it("a double void does not double-subtract or crash", () => {
    const a = trx({ total: 10000 });
    const eff = effectiveTransaksi([a, voidOf(a), { ...voidOf(a), id: "void-2" }]);
    expect(eff).toEqual([]);
  });
});
