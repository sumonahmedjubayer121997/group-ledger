import { describe, expect, it } from "vitest";
import { isOverdue, loanBalance, loanTotals, sortLoans, type Loan } from "./loans";

const loan = (over: Partial<Loan>): Loan => ({
  id: "l",
  direction: "lent",
  person: "Rahim",
  personId: null,
  amountCents: 500000,
  currency: "BDT",
  date: new Date(2026, 9, 1),
  dueDate: null,
  note: "",
  repayments: [],
  ...over,
});
const paid = (amountCents: number, id = String(amountCents)) => ({ id, amountCents, date: new Date(2026, 9, 5), note: "" });

describe("loans", () => {
  it("works out what's left after part payments", () => {
    expect(loanBalance(loan({ repayments: [paid(200000), paid(100000, "b")] }))).toEqual({
      repaidCents: 300000,
      remainingCents: 200000,
      settled: false,
    });
    expect(loanBalance(loan({ repayments: [paid(500000)] })).settled).toBe(true);
  });

  it("totals open loans per currency and direction", () => {
    const totals = loanTotals([
      loan({ id: "a" }),
      loan({ id: "b", repayments: [paid(100000)] }),
      loan({ id: "c", direction: "borrowed", currency: "GBP", amountCents: 20000 }),
      loan({ id: "d", repayments: [paid(500000)] }),
    ]);
    expect(totals.owedToYou.get("BDT")).toBe(900000);
    expect(totals.youOwe.get("GBP")).toBe(20000);
    expect(totals.open).toBe(3);
  });

  it("is overdue only after the due day, and never once paid back", () => {
    const due = loan({ dueDate: new Date(2026, 9, 10) });
    expect(isOverdue(due, new Date(2026, 9, 10, 23))).toBe(false);
    expect(isOverdue(due, new Date(2026, 9, 11))).toBe(true);
    expect(isOverdue({ ...due, repayments: [paid(500000)] }, new Date(2026, 9, 11))).toBe(false);
  });

  it("sorts open loans by due date, then paid-back ones", () => {
    const sorted = sortLoans([
      loan({ id: "settled", repayments: [paid(500000)], date: new Date(2026, 9, 9) }),
      loan({ id: "no-due", date: new Date(2026, 9, 8) }),
      loan({ id: "due-late", dueDate: new Date(2026, 11, 1) }),
      loan({ id: "due-soon", dueDate: new Date(2026, 9, 20) }),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(["due-soon", "due-late", "no-due", "settled"]);
  });
});
