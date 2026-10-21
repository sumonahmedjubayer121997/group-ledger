import { describe, expect, it } from "vitest";
import {
  checkSplit,
  expenseShares,
  openSince,
  formatMoney,
  formatTotals,
  groupLedger,
  makeResolver,
  simplifyDebts,
  splitFieldsToSave,
  toCents,
  toCurrencyCode,
  type LedgerExpense,
} from "./index";

const A = { id: "a", name: "Anik", email: "anik@example.com" };
const S = { id: "s", name: "Sumon", email: "sumon@example.com" };
const T = { id: "t", name: "Tara", email: "tara@example.com" };

const sum = (m: Map<string, number>) => [...m.values()].reduce((x, y) => x + y, 0);

describe("currency", () => {
  it("understands codes and the symbols older groups saved", () => {
    expect(toCurrencyCode("USD")).toBe("USD");
    expect(toCurrencyCode("usd")).toBe("USD");
    expect(toCurrencyCode("£")).toBe("GBP");
    expect(toCurrencyCode("CAD $")).toBe("CAD");
    expect(toCurrencyCode("AUS $")).toBe("AUD");
    expect(toCurrencyCode("৳")).toBe("BDT");
    expect(toCurrencyCode(undefined)).toBe("USD");
    expect(toCurrencyCode("something odd")).toBe("USD");
  });

  it("converts decimals to cents without float surprises", () => {
    expect(toCents(247.5)).toBe(24750);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-3.335)).toBe(-334);
    expect(toCents("12.3")).toBe(1230);
    expect(toCents(null)).toBe(0);
  });

  it("formats each currency with its own symbol", () => {
    expect(formatMoney(24750, "£")).toBe("£247.50");
    expect(formatMoney(24700, "USD")).toBe("$247.00");
    expect(formatMoney(88814, "CAD $")).toBe("CA$888.14");
    expect(formatMoney(255000, "BDT")).toBe("৳2,550.00");
    expect(formatMoney(1000, "JPY")).toBe("¥10");
  });

  it("never adds different currencies together", () => {
    expect(formatTotals(new Map([["GBP", 193205], ["USD", 24700]]))).toBe("£1,932.05 · $247.00");
    expect(formatTotals(new Map([["GBP", 0]]))).toBe("£0.00");
  });
});

describe("expense shares", () => {
  it("splits equally and gives the leftover cent to the payer", () => {
    const shares = expenseShares({ amount: 100, paidBy: S, splitAmong: [A, S, T], splitType: "equal" });
    expect(shares.get("s")).toBe(3334);
    expect(shares.get("a")).toBe(3333);
    expect(shares.get("t")).toBe(3333);
    expect(sum(shares)).toBe(10000);
  });

  it("hands leftovers to participants when the payer isn't splitting", () => {
    const shares = expenseShares({ amount: 10, paidBy: S, splitAmong: [A, T, { id: "x" }], splitType: "equal" });
    expect(sum(shares)).toBe(1000);
    expect([...shares.values()].sort()).toEqual([333, 333, 334]);
  });

  it("uses exact amounts as given", () => {
    const shares = expenseShares({ amount: 100, paidBy: S, splitAmong: [A, S], splitType: "exact", splitData: { a: 40, s: 60 } });
    expect(shares.get("a")).toBe(4000);
    expect(shares.get("s")).toBe(6000);
  });

  it("reads older percentage expenses as percentages, not money (the £300 / 50-50 bug)", () => {
    const shares = expenseShares({ amount: 300, paidBy: S, splitAmong: [A, S], splitType: "percentage", splitData: { a: 50, s: 50 } });
    expect(shares.get("a")).toBe(15000); // was counted as 50.00 before
    expect(shares.get("s")).toBe(15000);
  });

  it("reads new percentage expenses (saved as amounts)", () => {
    const shares = expenseShares({
      amount: 100,
      paidBy: S,
      splitAmong: [A, S],
      splitType: "percentage",
      splitData: { a: 25, s: 75 },
      splitPercentages: { a: 25, s: 75 },
      splitVersion: 2,
    });
    expect(shares.get("a")).toBe(2500);
  });

  it("matches a merged placeholder to the member with the same email", () => {
    const resolve = makeResolver([A, S]);
    const placeholder = { id: "temp_1753.42", name: "sumon", email: "SUMON@example.com" };
    const shares = expenseShares({ amount: 50, paidBy: A, splitAmong: [A, placeholder], splitType: "equal" }, resolve);
    expect(shares.get("s")).toBe(2500);
    expect(shares.has("temp_1753.42")).toBe(false);
  });
});

describe("group ledger", () => {
  const members = [A, S];

  it("works out who owes whom and keeps nets balanced", () => {
    const ledger = groupLedger({
      members,
      expenses: [{ amount: 100, paidBy: S, splitAmong: [A, S], splitType: "equal" }],
      settlements: [],
    });
    expect(ledger.nets.get("s")).toBe(5000);
    expect(ledger.nets.get("a")).toBe(-5000);
    expect(ledger.pairwise).toEqual([{ from: "a", to: "s", cents: 5000 }]);
    expect(sum(ledger.nets)).toBe(0);
  });

  it("nets opposite debts into one line", () => {
    const expenses: LedgerExpense[] = [
      { amount: 100, paidBy: S, splitAmong: [A, S], splitType: "equal" }, // Anik owes 50
      { amount: 30, paidBy: A, splitAmong: [A, S], splitType: "equal" }, // Sumon owes 15
    ];
    const ledger = groupLedger({ members, expenses, settlements: [] });
    expect(ledger.pairwise).toEqual([{ from: "a", to: "s", cents: 3500 }]);
  });

  it("subtracts settlements, including paying back too much", () => {
    const expenses: LedgerExpense[] = [{ amount: 100, paidBy: S, splitAmong: [A, S], splitType: "equal" }];
    const partial = groupLedger({ members, expenses, settlements: [{ fromMemberId: "a", toMemberId: "s", amount: 20 }] });
    expect(partial.pairwise).toEqual([{ from: "a", to: "s", cents: 3000 }]);
    const over = groupLedger({ members, expenses, settlements: [{ fromMemberId: "a", toMemberId: "s", amount: 60 }] });
    expect(over.pairwise).toEqual([{ from: "s", to: "a", cents: 1000 }]);
  });

  it("ignores settlements recorded against the wrong group", () => {
    const misfiled = { fromMemberId: "someone-else", toMemberId: "s", amount: 327.05, status: "confirmed" };
    const ledger = groupLedger({ members, expenses: [], settlements: [misfiled] });
    expect(ledger.ignoredSettlements).toEqual([misfiled]);
    expect(sum(ledger.nets)).toBe(0);
    expect(ledger.nets.get("s")).toBe(0);
  });

  it("skips settlements that aren't confirmed", () => {
    const ledger = groupLedger({
      members,
      expenses: [{ amount: 10, paidBy: S, splitAmong: [A, S] }],
      settlements: [{ fromMemberId: "a", toMemberId: "s", amount: 5, status: "pending" }],
    });
    expect(ledger.nets.get("a")).toBe(-500);
  });

  it("keeps people who left the group visible as former members", () => {
    const ledger = groupLedger({
      members,
      expenses: [{ amount: 90, paidBy: S, splitAmong: [A, S, { id: "gone", name: "Old flatmate" }], splitType: "equal" }],
      settlements: [],
    });
    expect(ledger.formerMembers).toEqual(["gone"]);
    expect(ledger.nets.get("gone")).toBe(-3000);
    expect(sum(ledger.nets)).toBe(0);
  });

  it("agrees between pairwise and simplified views", () => {
    const people = [A, S, T];
    const expenses: LedgerExpense[] = [
      { amount: 60, paidBy: A, splitAmong: people },
      { amount: 30, paidBy: S, splitAmong: people },
      { amount: 12.01, paidBy: T, splitAmong: [A, T] },
    ];
    const ledger = groupLedger({ members: people, expenses, settlements: [] });
    const fromPairs = new Map<string, number>(people.map((p) => [p.id, 0]));
    for (const d of ledger.pairwise) {
      fromPairs.set(d.from, fromPairs.get(d.from)! - d.cents);
      fromPairs.set(d.to, fromPairs.get(d.to)! + d.cents);
    }
    expect(fromPairs).toEqual(ledger.nets);
    expect(ledger.simplified.length).toBeLessThanOrEqual(people.length - 1);
  });
});

describe("claimed names", () => {
  // "Rahim" was added by name; later Bob joined by link and said "I'm Rahim".
  const R = { id: "temp-rahim", name: "Rahim", email: "" };
  const B = { id: "bob", name: "Bob", email: "bob@example.com" };
  const aliases = { "temp-rahim": "bob" };

  it("counts the placeholder's expenses and payments as the claimer's", () => {
    const ledger = groupLedger({
      members: [S, B],
      aliases,
      expenses: [
        { amount: 100, paidBy: S, splitAmong: [S, R], splitType: "equal" }, // Rahim owes 50
        { amount: 40, paidBy: R, splitAmong: [S, R], splitType: "equal" }, // Sumon owes Rahim 20
      ],
      settlements: [{ fromMemberId: "temp-rahim", toMemberId: "s", amount: 10 }],
    });
    expect(ledger.nets.get("bob")).toBe(-2000);
    expect(ledger.nets.get("s")).toBe(2000);
    expect(ledger.nets.has("temp-rahim")).toBe(false);
    expect(ledger.formerMembers).toEqual([]);
    expect(ledger.ignoredSettlements).toEqual([]);
  });

  it("keeps exact splits keyed by the placeholder", () => {
    const resolve = makeResolver([S, B], aliases);
    const shares = expenseShares(
      { amount: 30, paidBy: S, splitAmong: [S, R], splitType: "exact", splitData: { s: 10, "temp-rahim": 20 } },
      resolve
    );
    expect(shares.get("bob")).toBe(2000);
    expect(shares.get("s")).toBe(1000);
  });
});

describe("simplify", () => {
  it("settles the landing page's six debts in three payments", () => {
    const nets = new Map([
      ["laili", 345000],
      ["happy", -15000],
      ["sumon", -75000],
      ["popy", -255000],
    ]);
    expect(simplifyDebts(nets)).toEqual([
      { from: "popy", to: "laili", cents: 255000 },
      { from: "sumon", to: "laili", cents: 75000 },
      { from: "happy", to: "laili", cents: 15000 },
    ]);
  });
});

describe("expense form checks", () => {
  it("blocks percentages that don't make 100%", () => {
    expect(checkSplit("percentage", 100, { a: 33, s: 33, t: 33 }, ["a", "s", "t"])).toEqual({
      ok: false,
      message: "Percentages add up to 99%. They need to make 100%.",
    });
    expect(checkSplit("percentage", 100, { a: 50, s: 50 }, ["a", "s"]).ok).toBe(true);
  });

  it("blocks exact amounts that don't match the bill", () => {
    expect(checkSplit("exact", 100, { a: 40, s: 50 }, ["a", "s"])).toEqual({ ok: false, message: "10.00 still to assign." });
    expect(checkSplit("exact", 100, { a: 40, s: 70 }, ["a", "s"])).toEqual({ ok: false, message: "10.00 more than the bill." });
    expect(checkSplit("exact", 100, { a: 40, s: 60 }, ["a", "s"]).ok).toBe(true);
  });

  it("blocks empty amounts and empty splits", () => {
    expect(checkSplit("equal", 0, {}, ["a"]).ok).toBe(false);
    expect(checkSplit("equal", 10, {}, []).ok).toBe(false);
  });

  it("saves percent splits as amounts that add up exactly", () => {
    const saved = splitFieldsToSave("percentage", 100, { a: 33.34, s: 33.33, t: 33.33 }, ["a", "s", "t"], "s");
    expect(saved.splitVersion).toBe(2);
    const total = Object.values(saved.splitData!).reduce((x, y) => x + toCents(y), 0);
    expect(total).toBe(10000);
    expect(saved.splitPercentages).toEqual({ a: 33.34, s: 33.33, t: 33.33 });
    const shares = expenseShares({ amount: 100, paidBy: S, splitAmong: [A, S, T], splitType: "percentage", ...saved });
    expect(sum(shares)).toBe(10000);
  });
});

describe("openSince", () => {
  const day = (n: number) => new Date(2026, 9, n, 12);
  const members = [{ id: "a" }, { id: "b" }];
  const dinner = (n: number) => ({ amount: 100, paidBy: { id: "a" }, splitAmong: [{ id: "a" }, { id: "b" }], splitType: "equal", on: day(n) });
  const paid = (n: number, amount: number) => ({ fromMemberId: "b", toMemberId: "a", amount, status: "confirmed", on: day(n) });
  const when = (item: object) => ("on" in item ? (item as { on: Date }).on : null);

  it("dates a debt from when it started, through part payments", () => {
    const input = { members, expenses: [dinner(1)], settlements: [paid(3, 20)] };
    expect(openSince(input, "b", when)).toEqual(day(1));
    expect(openSince(input, "a", when)).toEqual(day(1));
  });

  it("starts again after being square", () => {
    const input = { members, expenses: [dinner(1), dinner(7)], settlements: [paid(5, 50)] };
    expect(openSince(input, "b", when)).toEqual(day(7));
  });

  it("is null when square", () => {
    expect(openSince({ members, expenses: [dinner(1)], settlements: [paid(2, 50)] }, "b", when)).toBeNull();
  });
});
