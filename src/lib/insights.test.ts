import { describe, expect, it } from "vitest";
import {
  budgetTarget,
  carrying,
  categoryJump,
  changeWords,
  comparisonSpan,
  monthlyTrend,
  sumIn,
  usualMonth,
  type InsightItem,
} from "./insights";

const now = new Date(2026, 9, 15, 12); // 15 Oct 2026
const item = (y: number, m: number, d: number, cents: number, category = "Food", shareCents = cents / 2): InsightItem => ({
  date: new Date(y, m, d, 12),
  cents,
  shareCents,
  category,
});

describe("comparisons", () => {
  it("compares this month with last month up to the same day", () => {
    const items = [item(2026, 8, 10, 1000), item(2026, 8, 20, 5000), item(2026, 9, 3, 2000)];
    const span = comparisonSpan("month", now)!;
    expect(span.label).toBe("September by this day");
    expect(sumIn(items, span, "group")).toBe(1000);
  });

  it("averages your usual month from the first month with spending", () => {
    const items = [item(2026, 7, 5, 3000), item(2026, 8, 5, 1000)];
    expect(usualMonth(items, now, "group")).toBe(2000);
    expect(usualMonth(items, now, "mine")).toBe(1000);
    expect(usualMonth([], now, "group")).toBeNull();
  });

  it("says how much more or less", () => {
    expect(changeWords(880, 1000)).toBe("12% less than");
    expect(changeWords(1500, 1000)).toBe("50% more than");
    expect(changeWords(500, 0)).toBeNull();
  });
});

describe("monthlyTrend", () => {
  it("marks the current month and averages finished months only", () => {
    const items = [item(2026, 7, 5, 3000), item(2026, 8, 5, 1000), item(2026, 9, 5, 9000)];
    const { bars, average } = monthlyTrend(items, now, "group", 4);
    expect(bars.map((b) => [b.label, b.cents, b.current])).toEqual([
      ["Jul", 0, false],
      ["Aug", 3000, false],
      ["Sep", 1000, false],
      ["Oct", 9000, true],
    ]);
    expect(average).toBe(2000);
  });
});

describe("categoryJump", () => {
  it("names the category furthest above its usual amount", () => {
    const items = [
      item(2026, 7, 5, 1000, "Groceries"),
      item(2026, 8, 5, 1000, "Groceries"),
      item(2026, 7, 6, 1000, "Rent"),
      item(2026, 8, 6, 1000, "Rent"),
      item(2026, 9, 2, 1400, "Groceries"),
      item(2026, 9, 3, 1000, "Rent"),
    ];
    expect(categoryJump(items, now, "group")).toEqual({ category: "Groceries", pct: 40 });
  });

  it("stays quiet without two earlier months to compare with", () => {
    expect(categoryJump([item(2026, 8, 5, 100), item(2026, 9, 5, 900)], now, "group")).toBeNull();
  });
});

describe("carrying", () => {
  it("is what each person paid minus their share", () => {
    const rows = carrying([
      { payerId: "a", cents: 300, shares: new Map([["a", 100], ["b", 100], ["c", 100]]) },
      { payerId: "b", cents: 60, shares: new Map([["b", 30], ["c", 30]]) },
    ]);
    expect(rows).toEqual([
      { id: "a", cents: 200 },
      { id: "b", cents: -70 },
      { id: "c", cents: -130 },
    ]);
  });
});

describe("budgetTarget", () => {
  it("is the part of the limit for the part of the period gone", () => {
    // 15 of 31 days (give or take a daylight-saving hour).
    expect(Math.abs(budgetTarget(3100, "monthly", new Date(2026, 9, 16)) - 1500)).toBeLessThan(5);
    expect(budgetTarget(1000, "weekly", now)).toBe(1000);
  });
});
