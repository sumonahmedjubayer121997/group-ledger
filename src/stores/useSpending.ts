import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { expenseMoment } from "@/lib/dates";
import { expenseShares, makeResolver, toCents, toCurrencyCode } from "@/lib/money";
import type { InsightItem } from "@/lib/insights";
import { useHidden } from "@/lib/undo";
import type { Budget } from "./budgetStore";
import { useExpenseStore, type Expense } from "./expenseStore";
import { useCurrencyOf } from "./useLedger";

/** One expense as Insights, the Overview line and budgets count it. */
export type SpendRow = InsightItem & {
  expense: Expense;
  groupId: string;
  currency: string;
  /** Who paid, as a current member (a claimed name counts as the person who claimed it). */
  payerId: string;
  /** Everyone's share, in cents. */
  shares: Map<string, number>;
};

/** Expenses with your share, everyone's shares and their currency, worked out once. */
export function useSpendRows(expenses?: Expense[]): SpendRow[] {
  const { user } = useAuth();
  const groups = useExpenseStore((s) => s.groups);
  const all = useExpenseStore((s) => s.expenses);
  const hidden = useHidden((s) => s.hidden);
  const currencyOf = useCurrencyOf();
  const list = expenses ?? all;

  return useMemo(() => {
    const resolvers = new Map(groups.map((g) => [g.id, makeResolver(g.members, g.aliases)]));
    const rows: SpendRow[] = [];
    for (const expense of list) {
      const resolve = resolvers.get(expense.groupId);
      // Deleted a moment ago (still undoable) doesn't count.
      if (!resolve || hidden.has(`expense-${expense.id}`)) continue;
      const shares = expenseShares(expense, resolve);
      const me = user ? resolve({ id: user.uid, email: user.email }) : null;
      rows.push({
        expense,
        groupId: expense.groupId,
        currency: currencyOf(expense.groupId),
        date: expenseMoment(expense.date, expense.createdAt),
        cents: toCents(expense.amount),
        shareCents: (me && shares.get(me)) || 0,
        category: expense.category?.trim() || "Uncategorised",
        payerId: resolve(expense.paidBy) ?? "",
        shares,
      });
    }
    return rows;
  }, [list, groups, hidden, currencyOf, user]);
}

/** The currency most of these rows are in (USD when there are none). */
export function mainCurrencyOf(rows: { currency: string }[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
}

/** Where a budget's period starts: this week (the last 7 days), this month or this year. */
export function budgetPeriodStart(period: Budget["period"], now = new Date()) {
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d;
  }
  if (period === "yearly") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Your personal budgets count your share of expenses in their currency (older budgets without one
 * use your main currency). Returns that main currency and the amount spent so far for a budget.
 */
export function usePersonalBudgetSpend() {
  const rows = useSpendRows();
  const mainCurrency = useMemo(() => mainCurrencyOf(rows), [rows]);
  const spentFor = useMemo(
    () => (budget: Budget) => {
      const currency = toCurrencyCode(budget.currency || mainCurrency);
      const start = budgetPeriodStart(budget.period);
      return rows.reduce((sum, r) => (r.currency === currency && r.date >= start ? sum + r.shareCents : sum), 0);
    },
    [rows, mainCurrency]
  );
  return { mainCurrency, spentFor };
}
