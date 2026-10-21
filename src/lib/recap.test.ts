import { describe, expect, it } from "vitest";
import { buildRecap, recapText } from "./recap";

const row = (d: number, cents: number, category: string) => ({ date: new Date(2026, 9, d, 12), cents, category });
const opts = { groupName: "Flat 12", currency: "USD", people: 3 };

describe("buildRecap", () => {
  it("sums one month and names its biggest categories", () => {
    const rows = [row(2, 120000, "Rent"), row(9, 4000, "Internet"), row(12, 2100, "Groceries"), row(30, 0, "Nothing")];
    const recap = buildRecap(rows, new Date(2026, 9, 1), new Date(2026, 10, 3), opts)!;
    expect(recap.monthLabel).toBe("October");
    expect(recap.total).toBe(126100);
    expect(recap.count).toBe(3);
    expect(recap.top.map((t) => [t.label, t.pct])).toEqual([
      ["Rent", 95],
      ["Internet", 3],
      ["Groceries", 2],
    ]);
    expect(recapText(recap, "https://spiltwize.web.app")).toBe(
      "Flat 12 spent $1,261.00 in October, 95% on rent. Split with SplitWize: https://spiltwize.web.app"
    );
  });

  it("says 'so far' for this month, and nothing for an empty month", () => {
    expect(buildRecap([row(2, 500, "Food")], new Date(2026, 9, 1), new Date(2026, 9, 21), opts)?.monthLabel).toBe("October so far");
    expect(buildRecap([row(2, 500, "Food")], new Date(2026, 8, 1), new Date(2026, 9, 21), opts)).toBeNull();
  });
});
