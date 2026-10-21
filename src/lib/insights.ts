import { addMonths, addYears, format, startOfMonth, startOfYear, subMonths, subYears } from "date-fns";

/**
 * The extra numbers on the Insights tab: what to compare a total with, the monthly trend, a note
 * when a category jumps, and who's carrying the group. One currency at a time; amounts in cents.
 * The totals themselves come from summarizeSpending, like the PDF report.
 */

export type Period = "month" | "lastMonth" | "3m" | "year" | "all";
/** Your share of each expense, or the whole group's spending. */
export type Basis = "mine" | "group";

export type InsightItem = {
  date: Date;
  cents: number;
  shareCents: number;
  category: string;
};

export const amountOf = (item: InsightItem, basis: Basis) => (basis === "mine" ? item.shareCents : item.cents);

export const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "3m", label: "3 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

type Span = { start: Date | null; end: Date };

/** The dates a period covers: `start` inclusive (null = from the beginning), `end` exclusive. */
export function periodSpan(period: Period, now: Date): Span {
  const later = new Date(now.getTime() + 1);
  switch (period) {
    case "month":
      return { start: startOfMonth(now), end: later };
    case "lastMonth":
      return { start: startOfMonth(subMonths(now, 1)), end: startOfMonth(now) };
    case "3m":
      return { start: startOfMonth(subMonths(now, 2)), end: later };
    case "year":
      return { start: startOfYear(now), end: later };
    default:
      return { start: null, end: later };
  }
}

/**
 * What the period's total is compared with: the same stretch one step back, so a month that's
 * half over is set against last month up to the same day, not all of it.
 */
export function comparisonSpan(period: Period, now: Date): (Span & { label: string }) | null {
  switch (period) {
    case "month":
      return { start: startOfMonth(subMonths(now, 1)), end: subMonths(now, 1), label: `${format(subMonths(now, 1), "MMMM")} by this day` };
    case "lastMonth":
      return { start: startOfMonth(subMonths(now, 2)), end: startOfMonth(subMonths(now, 1)), label: format(subMonths(now, 2), "MMMM") };
    case "3m": {
      const start = startOfMonth(subMonths(now, 2));
      return { start: subMonths(start, 3), end: subMonths(now, 3), label: "the 3 months before" };
    }
    case "year":
      return { start: startOfYear(subYears(now, 1)), end: subYears(now, 1), label: `${format(subYears(now, 1), "yyyy")} by this date` };
    default:
      return null;
  }
}

export const inSpan = (date: Date, { start, end }: Span) => (!start || date >= start) && date < end;

export const sumIn = (items: InsightItem[], span: Span, basis: Basis) =>
  items.reduce((sum, item) => (inSpan(item.date, span) ? sum + amountOf(item, basis) : sum), 0);

const monthKey = (date: Date) => format(date, "yyyy-MM");

/**
 * Your usual month: the average of up to three whole months before `before`, counting only months
 * since the first one with any spending (a new account isn't averaged with empty months).
 */
export function usualMonth(items: InsightItem[], before: Date, basis: Basis): number | null {
  const first = items.reduce<Date | null>((min, item) => (amountOf(item, basis) > 0 && (!min || item.date < min) ? item.date : min), null);
  if (!first) return null;
  const months: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const start = startOfMonth(subMonths(before, i));
    if (addMonths(start, 1) <= startOfMonth(first)) break;
    months.push(sumIn(items, { start, end: addMonths(start, 1) }, basis));
  }
  return months.length ? Math.round(months.reduce((a, b) => a + b, 0) / months.length) : null;
}

export type MonthBar = { key: string; label: string; cents: number; current: boolean };

/** The last `count` months, oldest first; the current one is marked (it isn't over yet). */
export function monthlyTrend(items: InsightItem[], now: Date, basis: Basis, count = 6): { bars: MonthBar[]; average: number | null } {
  const bars: MonthBar[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    bars.push({
      key: monthKey(start),
      label: format(start, "MMM"),
      cents: sumIn(items, { start, end: addMonths(start, 1) }, basis),
      current: i === 0,
    });
  }
  // Average of finished months, from the first one with spending.
  const firstWithSpend = bars.findIndex((b) => b.cents > 0);
  const finished = firstWithSpend < 0 ? [] : bars.slice(firstWithSpend).filter((b) => !b.current);
  const average = finished.length ? Math.round(finished.reduce((s, b) => s + b.cents, 0) / finished.length) : null;
  return { bars, average };
}

/**
 * "Groceries are 40% above your 3-month average": the category furthest above its usual monthly
 * amount this month so far, if it's at least 40% above and the gap is worth mentioning.
 * Needs two earlier months with spending, so a new account doesn't get a note on day two.
 */
export function categoryJump(items: InsightItem[], now: Date, basis: Basis): { category: string; pct: number } | null {
  const thisMonth = { start: startOfMonth(now), end: new Date(now.getTime() + 1) };
  const earlier: { start: Date; end: Date }[] = [1, 2, 3].map((i) => ({ start: startOfMonth(subMonths(now, i)), end: startOfMonth(subMonths(now, i - 1)) }));
  const activeEarlier = earlier.filter((span) => sumIn(items, span, basis) > 0);
  if (activeEarlier.length < 2) return null;
  const usualTotal = activeEarlier.reduce((s, span) => s + sumIn(items, span, basis), 0) / activeEarlier.length;

  let best: { category: string; pct: number } | null = null;
  for (const category of new Set(items.map((i) => i.category))) {
    const ofCategory = items.filter((i) => i.category === category);
    const now = sumIn(ofCategory, thisMonth, basis);
    const usual = activeEarlier.reduce((s, span) => s + sumIn(ofCategory, span, basis), 0) / activeEarlier.length;
    if (usual <= 0 || now < usual * 1.4 || now - usual < usualTotal * 0.05) continue;
    const pct = Math.round(((now - usual) / usual) * 100);
    if (!best || pct > best.pct) best = { category, pct };
  }
  return best;
}

/**
 * Who's carrying the group: for each person, what they paid minus their share. Positive people
 * paid for others; negative people were paid for. That gap is what turns into debts.
 */
export function carrying(items: { payerId: string; cents: number; shares: Map<string, number> }[]) {
  const net = new Map<string, number>();
  for (const item of items) {
    net.set(item.payerId, (net.get(item.payerId) ?? 0) + item.cents);
    for (const [id, share] of item.shares) net.set(id, (net.get(id) ?? 0) - share);
  }
  return [...net].filter(([, cents]) => cents !== 0).sort((a, b) => b[1] - a[1]).map(([id, cents]) => ({ id, cents }));
}

/**
 * Where spending should be by now for a budget to end on its limit: the limit times the part of
 * the period that's gone. Weekly budgets count the last 7 days, so the whole limit applies.
 */
export function budgetTarget(limitCents: number, period: "monthly" | "weekly" | "yearly", now: Date): number {
  if (period === "weekly") return limitCents;
  const start = period === "yearly" ? startOfYear(now) : startOfMonth(now);
  const end = period === "yearly" ? addYears(start, 1) : addMonths(start, 1);
  const gone = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.round(limitCents * Math.min(1, Math.max(0, gone)));
}

/** "28% less" / "12% more" / "the same", against a comparison amount. */
export function changeWords(cents: number, against: number): string | null {
  if (against <= 0) return null;
  const pct = Math.round(((cents - against) / against) * 100);
  if (pct === 0) return "about the same as";
  return `${Math.abs(pct)}% ${pct > 0 ? "more" : "less"} than`;
}
