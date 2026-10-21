import { describe, expect, it } from "vitest";
import { describeExpenseChanges, paymentSentence } from "./notificationText";

const dinner = {
  description: "Dinner",
  amount: 50,
  category: "Food & Dining",
  date: new Date("2026-10-03T12:00:00"),
  paidBy: { id: "a", name: "Alice Rahman" },
  splitType: "equal",
};

describe("describeExpenseChanges", () => {
  it("names what changed", () => {
    expect(describeExpenseChanges(dinner, { ...dinner, amount: 60 }, "USD")).toBe("Amount $50.00 → $60.00");
    expect(describeExpenseChanges(dinner, { ...dinner, paidBy: { id: "b", name: "Bob Khan" }, description: "Lunch" }, "USD")).toBe(
      'Renamed from "Dinner", now paid by Bob'
    );
    expect(describeExpenseChanges(dinner, { ...dinner, splitType: "exact", splitData: { a: 20, b: 30 } }, "USD")).toBe("Split changed");
  });

  it("names three changes at most", () => {
    const text = describeExpenseChanges(
      dinner,
      { amount: 70, description: "Lunch", category: "Travel", paidBy: { id: "b", name: "Bob" } },
      "USD"
    );
    expect(text).toBe('Amount $50.00 → $70.00, renamed from "Dinner", now paid by Bob and 1 more');
  });

  it("falls back when nothing it knows changed", () => {
    expect(describeExpenseChanges(dinner, { ...dinner }, "USD")).toBe("Details changed");
  });
});

describe("paymentSentence", () => {
  it("says you to the person reading it", () => {
    expect(paymentSentence("a", "Alice Rahman", "b", "Bob Khan", "b", "$30.00")).toBe("Alice paid you $30.00");
    expect(paymentSentence("a", "Alice Rahman", "b", "Bob Khan", "a", "$30.00")).toBe("You paid Bob $30.00");
  });
});
