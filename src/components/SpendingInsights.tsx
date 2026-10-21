import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useBudgetStore } from "@/stores/budgetStore";
import { useExpenseStore, type Expense } from "@/stores/expenseStore";
import { useUserBalances } from "@/stores/useLedger";
import { useSpendRows, usePersonalBudgetSpend, type SpendRow } from "@/stores/useSpending";
import { formatMoney, toCents, toCurrencyCode } from "@/lib/money";
import { debtAge, isOldDebt } from "@/lib/dates";
import {
  PERIODS,
  amountOf,
  budgetTarget,
  carrying,
  categoryJump,
  changeWords,
  comparisonSpan,
  inSpan,
  monthlyTrend,
  periodSpan,
  sumIn,
  usualMonth,
  type Basis,
  type Period,
} from "@/lib/insights";
import { pctLabel, summarizeSpending } from "@/lib/spendingSummary";
import { cn } from "@/lib/utils";
import { TiltCard, type CardTone } from "@/components/fx/TiltCard";

/** "$1.2K": short amounts for chart labels, with the same symbols as formatMoney. */
const compact = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: currency === "CAD" || currency === "AUD" ? "symbol" : "narrowSymbol",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);

const chip = (on: boolean) =>
  cn(
    "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
  );

const linkClass = "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A small card that answers one question and opens where the details are. A lighter version of
 * the landing page's lit cards: a 3° tilt, and a light that says how things stand (green when
 * settled or on track, amber when something's owed or over).
 */
function QuestionCard({ question, to, tone = "plain", children }: { question: string; to: string; tone?: CardTone; children: ReactNode }) {
  return (
    <TiltCard to={to} tone={tone} light="top-right" max={3} bodyClassName="mt-0 p-4 sm:p-5 md:p-5">
      <p className="text-sm text-muted-foreground">{question}</p>
      {children}
    </TiltCard>
  );
}

/**
 * Insights: one question per card, every number with something to compare it with, your share
 * first (Group total on a switch), and everything taps through to the matching expenses. One
 * currency at a time: amounts in different currencies are never added together. The totals come
 * from summarizeSpending, like the PDF report, so the two always agree.
 */
export default function SpendingInsights({ expenses, groupId }: { expenses: Expense[]; groupId?: string }) {
  const { user } = useAuth();
  const groups = useExpenseStore((s) => s.groups);
  const budgets = useBudgetStore((s) => s.budgets);
  const getBudgetUsage = useBudgetStore((s) => s.getBudgetUsage);
  const balances = useUserBalances(user?.uid);
  const { mainCurrency, spentFor } = usePersonalBudgetSpend();
  const rows = useSpendRows(expenses);
  const now = useMemo(() => new Date(), []);

  const currencies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([code]) => code);
  }, [rows]);
  const [chosen, setChosen] = useState<string | null>(null);
  const currency = chosen && currencies.includes(chosen) ? chosen : currencies[0] ?? "USD";
  const inCurrency = useMemo(() => rows.filter((r) => r.currency === currency), [rows, currency]);

  const [basis, setBasis] = useState<Basis>("mine");
  // Open on this month, or the most recent period that has anything in it.
  const defaultPeriod = useMemo<Period>(
    () => (["month", "3m", "year"] as Period[]).find((p) => inCurrency.some((r) => inSpan(r.date, periodSpan(p, now)))) ?? "all",
    [inCurrency, now]
  );
  const [period, setPeriod] = useState<Period | null>(null);
  const active = period ?? defaultPeriod;
  const span = useMemo(() => periodSpan(active, now), [active, now]);
  const list = useMemo(() => inCurrency.filter((r) => inSpan(r.date, span)), [inCurrency, span]);

  // Links into the Expenses list, filtered to match what was tapped.
  const groupParam = `${groupId ? `&group=${groupId}` : ""}${currencies.length > 1 ? `&currency=${currency}` : ""}`;
  const rangeParam = active === "all" ? "" : `&range=${active}`;
  const expensesLink = (filters: string) => `/expenses?${filters}${rangeParam}${groupParam}`.replace("?&", "?");

  const stats = useMemo(
    () =>
      summarizeSpending(
        list
          .map((r) => ({ cents: amountOf(r, basis), shareCents: r.shareCents, category: r.category, payer: "", date: r.date, description: r.expense.description }))
          .filter((i) => i.cents > 0)
      ),
    [list, basis]
  );

  // How much: compared with the same stretch before, and (for months) your usual month.
  const total = sumIn(inCurrency, span, basis);
  const cmp = comparisonSpan(active, now);
  const cmpTotal = cmp ? sumIn(inCurrency, cmp, basis) : 0;
  const usual = active === "month" ? usualMonth(inCurrency, now, basis) : active === "lastMonth" ? usualMonth(inCurrency, span.start!, basis) : null;
  const change = cmp && cmpTotal > 0 ? changeWords(total, cmpTotal) : null;
  const muchMore = cmp && cmpTotal > 0 && total > cmpTotal * 1.2;

  // What's still open in this currency (and this group, on a group's page).
  const open = balances.debts.filter(
    (d) => d.currency === currency && (!groupId || d.groupId === groupId) && (d.from === user?.uid || d.to === user?.uid)
  );
  const owedToYou = open.filter((d) => d.to === user?.uid).reduce((s, d) => s + d.cents, 0);
  const youOwe = open.filter((d) => d.from === user?.uid).reduce((s, d) => s + d.cents, 0);
  const oldest = open.reduce<Date | null>((min, d) => (d.since && (!min || d.since < min) ? d.since : min), null);

  // The budget to pace against: the group's on its page, else your own in this currency.
  const budget = useMemo(() => {
    if (groupId) {
      const own = budgets.filter((b) => b.groupId === groupId && b.isActive && b.type !== "individual");
      const b = own.find((x) => x.type === "group_overall") ?? own[0];
      if (!b) return null;
      const usage = getBudgetUsage(expenses, undefined, groupId).find((u) => u.budgetId === b.id);
      return { budget: b, spent: toCents(usage?.spent ?? 0), more: own.length - 1 };
    }
    const own = budgets.filter(
      (b) => b.type === "individual" && b.isActive && (!b.userId || b.userId === user?.uid) && toCurrencyCode(b.currency || mainCurrency) === currency
    );
    const b = own.find((x) => x.period === "monthly") ?? own[0];
    return b ? { budget: b, spent: spentFor(b), more: own.length - 1 } : null;
  }, [groupId, budgets, getBudgetUsage, expenses, user?.uid, mainCurrency, currency, spentFor]);

  const trend = useMemo(() => monthlyTrend(inCurrency, now, basis), [inCurrency, now, basis]);
  const jump = useMemo(() => (active === "lastMonth" ? null : categoryJump(inCurrency, now, basis)), [inCurrency, now, basis, active]);
  const carried = useMemo(() => carrying(list.map((r: SpendRow) => ({ payerId: r.payerId, cents: r.cents, shares: r.shares }))), [list]);

  const personName = (id: string) => {
    if (id === user?.uid) return "You";
    for (const g of groups) {
      const m = g.members.find((x) => x.id === id);
      if (m) return m.name.trim().split(/\s+/)[0] || m.name;
    }
    return "Former member";
  };

  if (expenses.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Add a few expenses to see where the money goes.</p>;
  }

  const money = (cents: number) => formatMoney(cents, currency);
  const whose = basis === "mine" ? "your" : "the group's";
  const trendMax = Math.max(...trend.bars.map((b) => b.cents), trend.average ?? 0, 1);
  const carriedMax = Math.max(...carried.map((c) => Math.abs(c.cents)), 1);

  return (
    <div className="space-y-6">
      {/* Compact controls, so the first cards fit on a phone's first screen: periods scroll sideways. */}
      <div className="space-y-3">
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Period"
        >
          {PERIODS.map((p) => (
            <button key={p.value} type="button" className={chip(p.value === active)} aria-pressed={p.value === active} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-full border p-0.5" role="group" aria-label="Whose spending">
            {(["mine", "group"] as Basis[]).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={basis === b}
                onClick={() => setBasis(b)}
                className={cn(
                  "h-9 rounded-full px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  basis === b ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {b === "mine" ? "Your share" : "Group total"}
              </button>
            ))}
          </div>
          {currencies.length > 1 && (
            <div className="flex gap-1" role="group" aria-label="Currency">
              {currencies.map((code) => (
                <button key={code} type="button" className={chip(code === currency)} aria-pressed={code === currency} onClick={() => setChosen(code)}>
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuestionCard question={basis === "mine" ? "How much did I spend?" : "How much did the group spend?"} to={expensesLink("")} tone={muchMore ? "owes" : "plain"}>
          <p className="money mt-1 font-display text-[30px] leading-tight">{money(total)}</p>
          {cmp && (
            <p className={cn("mt-1 text-xs", muchMore ? "text-owes" : "text-muted-foreground")}>
              {change ? `${change.charAt(0).toUpperCase()}${change.slice(1)} ${cmp.label}` : `Nothing in ${cmp.label}`}
            </p>
          )}
          {usual !== null && <p className="money text-xs text-muted-foreground">Usual month: {money(usual)}</p>}
        </QuestionCard>

        <QuestionCard question="What's still unsettled?" to={groupId ? `/groups/${groupId}?tab=balances` : "/"} tone={youOwe > 0 ? "owes" : "settled"}>
          {owedToYou === 0 && youOwe === 0 ? (
            <>
              <p className="mt-1 font-display text-[30px] leading-tight text-settled">All settled</p>
              <p className="mt-1 text-xs text-muted-foreground">Nothing open in {currency}</p>
            </>
          ) : (
            <>
              {owedToYou > 0 && (
                <p className="money mt-1 font-display text-[24px] leading-tight">
                  <span className="text-settled">{money(owedToYou)}</span> <span className="font-sans text-sm text-muted-foreground">owed to you</span>
                </p>
              )}
              {youOwe > 0 && (
                <p className="money mt-1 font-display text-[24px] leading-tight">
                  <span className="text-owes">{money(youOwe)}</span> <span className="font-sans text-sm text-muted-foreground">you owe</span>
                </p>
              )}
              {oldest && <p className={cn("mt-1 text-xs", isOldDebt(oldest) ? "text-owes" : "text-muted-foreground")}>Oldest: {debtAge(oldest)}</p>}
            </>
          )}
        </QuestionCard>

        <QuestionCard
          question="Am I on budget?"
          to={groupId ? `/groups/${groupId}?tab=budgets` : "/personal?tab=budgets"}
          tone={!budget ? "plain" : budget.spent > budgetTarget(toCents(budget.budget.limit), budget.budget.period, now) ? "owes" : "settled"}
        >
          {budget ? (
            (() => {
              const limit = toCents(budget.budget.limit);
              const target = budgetTarget(limit, budget.budget.period, now);
              const over = budget.spent - target;
              return (
                <>
                  <p className="mt-1">
                    <span className="money font-display text-[30px] leading-tight">{money(budget.spent)}</span>{" "}
                    <span className="money text-sm text-muted-foreground">of {money(limit)}</span>
                  </p>
                  <div className="relative mt-2 h-2 rounded-full bg-secondary" aria-hidden="true">
                    <div
                      className={cn("h-2 rounded-full", budget.spent > limit ? "bg-destructive" : over > 0 ? "bg-owes" : "bg-foreground/70")}
                      style={{ width: `${Math.min(100, limit ? (budget.spent / limit) * 100 : 0)}%` }}
                    />
                    {/* Where spending should be by today to end on the limit. */}
                    <div className="absolute -top-1 h-4 w-0.5 bg-foreground" style={{ left: `${limit ? Math.min(100, (target / limit) * 100) : 0}%` }} />
                  </div>
                  <p className={cn("money mt-2 text-xs", over > 0 ? "text-owes" : "text-muted-foreground")}>
                    {over > 0 ? `${money(over)} above today's target` : `${money(-over)} below today's target`}
                    {budget.more > 0 ? ` · ${budget.budget.name} and ${budget.more} more` : ` · ${budget.budget.name}`}
                  </p>
                </>
              );
            })()
          ) : (
            <>
              <p className="mt-1 font-display text-[24px] leading-tight text-muted-foreground">No budget yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Set one to see if you're on track</p>
            </>
          )}
        </QuestionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Where did it go?</CardTitle>
            {jump && (
              <p className="flex items-center gap-1.5 text-sm text-owes">
                <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                {jump.category} is {jump.pct}% above {whose} usual month, so far this month.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {stats.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in this period.</p>
            ) : (
              <ul className="space-y-1">
                {stats.categories.map((row) => {
                  const max = stats.categories[0].cents || 1;
                  const body = (
                    <>
                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{row.label}</span>
                        <span className="money shrink-0 text-muted-foreground">
                          {money(row.cents)} <span className="text-xs">· {pctLabel(row)}</span>
                        </span>
                      </span>
                      <span className="mt-1.5 block h-2 rounded-full bg-secondary" aria-hidden="true">
                        <span className="block h-2 rounded-full bg-foreground/80" style={{ width: `${Math.max(2, (row.cents / max) * 100)}%` }} />
                      </span>
                    </>
                  );
                  return (
                    <li key={row.label}>
                      {row.label === "Uncategorised" ? (
                        <div className="py-1.5">{body}</div>
                      ) : (
                        <Link to={expensesLink(`category=${encodeURIComponent(row.label)}`)} className={cn("block py-1.5 hover:opacity-80", linkClass)}>
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Tap a category to see those expenses.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Am I spending more than usual?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex h-40 items-end gap-2 border-b" role="list" aria-label={`${whose} spending per month`}>
              {trend.average !== null && trend.average > 0 && (
                <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/60" style={{ bottom: `${(trend.average / trendMax) * 100}%` }} aria-hidden="true">
                  <span className="absolute -top-5 right-0 text-[11px] text-muted-foreground">average {compact(trend.average, currency)}</span>
                </div>
              )}
              {trend.bars.map((bar) => (
                <Link
                  key={bar.key}
                  role="listitem"
                  to={`/expenses?range=${bar.key}${groupParam}`}
                  title={`${bar.label}: ${money(bar.cents)}${bar.current ? " so far" : ""}`}
                  aria-label={`${bar.label}: ${money(bar.cents)}${bar.current ? " so far" : ""}`}
                  className={cn("flex h-full flex-1 flex-col justify-end", linkClass)}
                >
                  <span className="money mb-1 text-center text-[11px] text-muted-foreground">{bar.cents ? compact(bar.cents, currency) : ""}</span>
                  <span
                    className={cn("block rounded-t-md", bar.current ? "border border-b-0 border-dashed border-foreground/60" : "bg-foreground/70 hover:bg-foreground")}
                    style={{ height: `${Math.max(bar.cents ? 3 : 0, (bar.cents / trendMax) * 100)}%` }}
                  />
                </Link>
              ))}
            </div>
            <div className="mt-1 flex gap-2" aria-hidden="true">
              {trend.bars.map((bar) => (
                <span key={bar.key} className="flex-1 text-center text-xs text-muted-foreground">
                  {bar.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">This month is dashed until it's over. Tap a month to see it.</p>
          </CardContent>
        </Card>

        {carried.length >= 2 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Who's carrying the group?</CardTitle>
              <p className="text-sm text-muted-foreground">What each person paid, minus their share. That gap is what becomes debts.</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {carried.map((c) => (
                  <li key={c.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm">
                    <Link to={expensesLink(`person=${encodeURIComponent(c.id)}`)} className={cn("truncate hover:underline", linkClass)}>
                      {personName(c.id)}
                    </Link>
                    <span className="relative h-3" aria-hidden="true">
                      <span className="absolute inset-y-[-4px] left-1/2 w-px bg-border" />
                      <span
                        className={cn("absolute top-0 h-3 rounded-sm", c.cents > 0 ? "left-1/2 bg-settled/60" : "right-1/2 bg-owes/60")}
                        style={{ width: `${(Math.abs(c.cents) / carriedMax) * 50}%` }}
                      />
                    </span>
                    <span className={cn("money w-24 text-right text-xs", c.cents > 0 ? "text-settled" : "text-owes")}>
                      {c.cents > 0 ? `paid ${money(c.cents)} more` : `${money(-c.cents)} less`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
