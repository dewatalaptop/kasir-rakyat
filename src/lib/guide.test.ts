// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { GUIDE_KEY, closeTip, computeQuickStart, getGuide, markStep, setChecklistHidden, setTourSeen } from "./guide";

beforeEach(() => localStorage.clear());

describe("computeQuickStart", () => {
  it("a brand-new shop: nothing done, first required step is next", () => {
    const qs = computeQuickStart({ marked: [], hasOwnerPassword: false });
    expect(qs.done).toBe(0);
    expect(qs.total).toBe(4);
    expect(qs.percent).toBe(0);
    expect(qs.allDone).toBe(false);
    expect(qs.next?.key).toBe("produk");
  });

  it("progress follows what was really done; optional steps never block 'next'", () => {
    const qs = computeQuickStart({ marked: ["produk", "jual"], hasOwnerPassword: false });
    expect(qs.done).toBe(2);
    expect(qs.percent).toBe(50);
    // required steps finished: it points at an optional one rather than nothing
    expect(qs.next?.optional).toBe(true);
  });

  it("the security step is derived from a real password, never remembered", () => {
    expect(computeQuickStart({ marked: [], hasOwnerPassword: true }).steps.find((s) => s.key === "keamanan")!.done).toBe(true);
    expect(computeQuickStart({ marked: ["produk", "jual", "printer"], hasOwnerPassword: false }).allDone).toBe(false);
    const all = computeQuickStart({ marked: ["produk", "jual", "printer"], hasOwnerPassword: true });
    expect(all.allDone).toBe(true);
    expect(all.next).toBeNull();
  });

  it("every step links to a real route", () => {
    for (const s of computeQuickStart({ marked: [], hasOwnerPassword: false }).steps) expect(s.to).toMatch(/^\/(kasir|admin)/);
  });
});

describe("guide store", () => {
  it("starts empty and persists marks, tips, tour and checklist state", () => {
    expect(getGuide()).toEqual({ marked: [], checklistHidden: false, tourSeen: false, tipsClosed: [] });
    markStep("jual");
    markStep("jual"); // idempotent
    closeTip("produk-nonaktif");
    setTourSeen(true);
    setChecklistHidden(true);
    const stored = JSON.parse(localStorage.getItem(GUIDE_KEY)!);
    expect(stored).toEqual({ marked: ["jual"], checklistHidden: true, tourSeen: true, tipsClosed: ["produk-nonaktif"] });
  });

  it("returns a referentially stable snapshot until something changes (useSyncExternalStore requirement)", () => {
    const a = getGuide();
    expect(getGuide()).toBe(a);
    markStep("produk");
    expect(getGuide()).not.toBe(a);
  });

  it("garbage in storage falls back to a clean state instead of crashing", () => {
    localStorage.setItem(GUIDE_KEY, "{not json");
    expect(getGuide().marked).toEqual([]);
    localStorage.setItem(GUIDE_KEY, JSON.stringify({ marked: "x", tipsClosed: 5, tourSeen: 1 }));
    const g = getGuide();
    expect(g.marked).toEqual([]);
    expect(g.tipsClosed).toEqual([]);
    expect(g.tourSeen).toBe(true);
  });
});
