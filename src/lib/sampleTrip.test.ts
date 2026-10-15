import { describe, expect, it } from "vitest";
import { groupLedger } from "@/lib/money";
import { sampleTripExpenses } from "./sampleTrip";

const me = { id: "me", name: "Sam", email: "sam@example.com" };
const friends = [
  { id: "temp-maya", name: "Maya", email: "" },
  { id: "temp-leo", name: "Leo", email: "" },
];

describe("sample trip", () => {
  it("makes five dated expenses that each split among real members", () => {
    const now = new Date("2026-10-13T09:00:00");
    const rows = sampleTripExpenses(me, friends, now);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.amount).toBeGreaterThan(0);
      expect(row.splitAmong.length).toBeGreaterThan(0);
      expect(row.date.getTime()).toBeLessThan(now.getTime());
    }
  });

  it("leaves balances that add up to zero, with you owed money", () => {
    const rows = sampleTripExpenses(me, friends);
    const members = [me, ...friends];
    const ledger = groupLedger({
      members,
      expenses: rows.map((r, i) => ({ id: `e${i}`, groupId: "g", ...r })) as never,
      settlements: [],
    });
    const nets = [...ledger.nets.values()];
    expect(nets.reduce((a, b) => a + b, 0)).toBe(0);
    expect(ledger.nets.get("me")).toBeGreaterThan(0);
  });

  it("returns nothing without both friends", () => {
    expect(sampleTripExpenses(me, friends.slice(0, 1))).toEqual([]);
  });
});
