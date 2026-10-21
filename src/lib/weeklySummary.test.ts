import { describe, expect, it } from "vitest";
import { buildWeeklySummary, summaryWeekKey } from "./weeklySummary";
import type { Loan } from "./loans";

const loan = (over: Partial<Loan>): Loan => ({
  id: "l1",
  direction: "lent",
  person: "Rafi",
  personId: null,
  amountCents: 200000,
  currency: "BDT",
  date: new Date(2026, 8, 1),
  dueDate: new Date(2026, 9, 1),
  note: "",
  repayments: [{ id: "r1", amountCents: 50000, date: new Date(2026, 8, 20), note: "" }],
  ...over,
});

describe("summaryWeekKey", () => {
  it("belongs to the latest Sunday evening that has passed", () => {
    expect(summaryWeekKey(new Date(2026, 9, 18, 19))).toBe("2026-10-18"); // Sunday 7pm
    expect(summaryWeekKey(new Date(2026, 9, 18, 17))).toBe("2026-10-11"); // Sunday 5pm: last week's
    expect(summaryWeekKey(new Date(2026, 9, 21, 9))).toBe("2026-10-18"); // Wednesday
  });
});

describe("buildWeeklySummary", () => {
  const now = new Date(2026, 9, 21);

  it("sums what's open per currency and names the groups", () => {
    const s = buildWeeklySummary(
      [
        { groupName: "Notify test", currency: "USD", net: 1500 },
        { groupName: "Dhaka flat", currency: "BDT", net: -20000 },
        { groupName: "Settled trip", currency: "USD", net: 0 },
      ],
      [loan({})],
      now
    )!;
    expect(s.title).toBe("Your week: you're owed $15.00 and owe ৳200.00");
    expect(s.message).toBe("Dhaka flat: ৳200.00 to pay · Notify test: $15.00 to you · Overdue loan from Rafi, ৳1,500.00");
  });

  it("speaks up for overdue loans alone, and stays quiet when all is settled", () => {
    expect(buildWeeklySummary([], [loan({})], now)?.title).toBe("Your week: a loan is overdue");
    expect(buildWeeklySummary([{ groupName: "A", currency: "USD", net: 0 }], [loan({ dueDate: null })], now)).toBeNull();
  });
});
