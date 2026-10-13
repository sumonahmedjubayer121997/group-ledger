import { useMemo, useState } from "react";
import { startOfYear, subDays, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore, type Expense } from "@/stores/expenseStore";
import { expenseShares, formatMoney, makeResolver, toCents } from "@/lib/money";
import { toDate } from "@/lib/dates";
import { pctLabel, summarizeSpending, type SpendBar } from "@/lib/spendingSummary";

type Period = "30d" | "3m" | "year" | "all";

const periods: { value: Period; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

const periodStart = (period: Period, now: Date) =>
  period === "30d" ? subDays(now, 30) : period === "3m" ? subMonths(now, 3) : period === "year" ? startOfYear(now) : null;

const inPeriod = (expense: Expense, period: Period, now: Date) => {
  const start = periodStart(period, now);
  const date = toDate(expense.date);
  return !!date && (!start || date >= start);
};

/** A labelled horizontal bar per row: readable by screen readers as plain text. */
function Bars({ rows, currency }: { rows: SpendBar[]; currency: string }) {
  const max = Math.max(...rows.map((r) => r.cents), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="money shrink-0 text-muted-foreground">
              {formatMoney(row.cents, currency)} <span className="text-xs">· {pctLabel(row)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-secondary" aria-hidden="true">
            <div className="h-2 rounded-full bg-foreground/80" style={{ width: `${Math.max(2, (row.cents / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Spending for one currency at a time (amounts in different currencies are never added together). */
export default function SpendingInsights({ expenses, currencyOf }: { expenses: Expense[]; currencyOf: (groupId: string) => string }) {
  const { user } = useAuth();
  const groups = useExpenseStore((s) => s.groups);
  const now = useMemo(() => new Date(), []);

  const currencies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) counts.set(currencyOf(e.groupId), (counts.get(currencyOf(e.groupId)) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([code]) => code);
  }, [expenses, currencyOf]);
  const [chosen, setChosen] = useState<string | null>(null);
  const currency = chosen && currencies.includes(chosen) ? chosen : currencies[0] ?? "USD";
  const inCurrency = useMemo(() => expenses.filter((e) => currencyOf(e.groupId) === currency), [expenses, currencyOf, currency]);

  // Open on the last 30 days, or the most recent period that has anything in it.
  const defaultPeriod = useMemo<Period>(
    () => (["30d", "3m", "year"] as Period[]).find((p) => inCurrency.some((e) => inPeriod(e, p, now))) ?? "all",
    [inCurrency, now]
  );
  const [period, setPeriod] = useState<Period | null>(null);
  const active = period ?? defaultPeriod;
  const list = useMemo(() => inCurrency.filter((e) => inPeriod(e, active, now)), [inCurrency, active, now]);

  // The same numbers as the PDF report (see summarizeSpending).
  const stats = useMemo(() => {
    const byGroup = new Map(groups.map((g) => [g.id, makeResolver(g.members)]));
    return summarizeSpending(
      list.map((e) => {
        const resolve = byGroup.get(e.groupId);
        const me = resolve && user ? resolve({ id: user.uid, email: user.email }) : null;
        return {
          cents: toCents(e.amount),
          shareCents: (resolve && me && expenseShares(e, resolve).get(me)) || 0,
          category: e.category ?? "",
          payer: e.paidBy?.name ?? "",
          date: toDate(e.date) ?? new Date(0),
          description: e.description,
        };
      })
    );
  }, [list, groups, user]);

  if (expenses.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Add a few expenses to see where the money goes.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {currencies.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Currency">
            {currencies.map((code) => (
              <Button
                key={code}
                size="sm"
                variant={code === currency ? "default" : "outline"}
                aria-pressed={code === currency}
                onClick={() => setChosen(code)}
              >
                {code}
              </Button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <Select value={active} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total spent", value: formatMoney(stats.total, currency), sub: `${list.length} ${list.length === 1 ? "expense" : "expenses"}` },
          { label: "Your share", value: formatMoney(stats.mine, currency), sub: stats.total ? `${stats.minePct}% of the total` : "" },
          {
            label: "Biggest expense",
            value: stats.biggest ? formatMoney(stats.biggest.cents, currency) : "–",
            sub: stats.biggest?.description ?? "",
          },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="money mt-1 font-display text-[30px] leading-tight">{tile.value}</p>
              {tile.sub && <p className="mt-1 truncate text-xs text-muted-foreground">{tile.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nothing in this period. Try a longer one.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">By category</CardTitle>
            </CardHeader>
            <CardContent>
              <Bars rows={stats.categories} currency={currency} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">By month</CardTitle>
            </CardHeader>
            <CardContent>
              <Bars rows={stats.months} currency={currency} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Who paid</CardTitle>
            </CardHeader>
            <CardContent>
              <Bars rows={stats.payers} currency={currency} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
