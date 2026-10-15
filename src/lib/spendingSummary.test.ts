import { describe, expect, it } from "vitest";
import { pctLabel, summarizeSpending, type SpendItem } from "./spendingSummary";

const item = (cents: number, category: string, payer: string, date: string, shareCents = cents / 2, description = category): SpendItem => ({
  cents,
  shareCents,
  category,
  payer,
  date: new Date(`${date}T12:00:00`),
  description,
});

describe("summarizeSpending", () => {
  const items = [
    item(58000, "Food & Dining", "Sumon", "2026-04-10", 29000, "Big shop"),
    item(2200, "Bills & Utilities", "Anik", "2026-05-02"),
    item(2100, "Groceries", "Sumon", "2026-01-20"),
    item(10000, "Food & Dining", "Anik", "2026-04-22"),
    item(500, " ", "", "2026-05-30", 0),
  ];
  const s = summarizeSpending(items);

  it("totals the spending and your share", () => {
    expect(s.count).toBe(5);
    expect(s.total).toBe(72800);
    expect(s.mine).toBe(29000 + 1100 + 1050 + 5000);
    expect(s.minePct).toBe(Math.round((s.mine / s.total) * 100));
  });

  it("finds the biggest expense", () => {
    expect(s.biggest).toMatchObject({ cents: 58000, description: "Big shop" });
  });

  it("groups by category, largest first, with blanks as Uncategorised", () => {
    expect(s.categories.map((c) => c.label)).toEqual(["Food & Dining", "Bills & Utilities", "Groceries", "Uncategorised"]);
    expect(s.categories[0]).toMatchObject({ cents: 68000, pct: 93 });
  });

  it("lists months newest first", () => {
    expect(s.months.map((m) => m.label)).toEqual(["May 2026", "Apr 2026", "Jan 2026"]);
    expect(s.months[1].cents).toBe(68000);
  });

  it("totals who paid, with a missing payer as Someone", () => {
    expect(s.payers).toEqual([
      { label: "Sumon", cents: 60100, pct: 83 },
      { label: "Anik", cents: 12200, pct: 17 },
      { label: "Someone", cents: 500, pct: 1 },
    ]);
  });

  it("handles no expenses", () => {
    expect(summarizeSpending([])).toMatchObject({ total: 0, minePct: 0, biggest: null, categories: [], months: [] });
  });

  it("never shows 0% for a real amount", () => {
    expect(pctLabel({ cents: 300, pct: 0 })).toBe("<1%");
    expect(pctLabel({ cents: 0, pct: 0 })).toBe("0%");
    expect(pctLabel({ cents: 5000, pct: 12 })).toBe("12%");
  });
});
