import { format } from "date-fns";

/**
 * The numbers behind "Insights" and the PDF report: totals, your share, the biggest expense, and
 * spending by category, month and payer. One currency at a time; amounts are in cents.
 */

export type SpendItem = {
  cents: number;
  /** Your share of it, in cents (0 when you're not in the split). */
  shareCents: number;
  category: string;
  payer: string;
  date: Date;
  description: string;
};

export type SpendBar = { label: string; cents: number; pct: number };

export type SpendingSummary = {
  count: number;
  total: number;
  mine: number;
  /** Your share as a percentage of the total. */
  minePct: number;
  biggest: { cents: number; description: string; date: Date } | null;
  categories: SpendBar[];
  /** Newest month first. */
  months: SpendBar[];
  payers: SpendBar[];
};

const pctOf = (cents: number, total: number) => (total > 0 ? Math.round((cents / total) * 100) : 0);

/** "12%", or "<1%" for a small but real amount. */
export const pctLabel = ({ cents, pct }: { cents: number; pct: number }) => (pct === 0 && cents > 0 ? "<1%" : `${pct}%`);

export function summarizeSpending(
  items: SpendItem[],
  { maxCategories = 8, maxMonths = 12, maxPayers = 6 }: { maxCategories?: number; maxMonths?: number; maxPayers?: number } = {}
): SpendingSummary {
  let total = 0;
  let mine = 0;
  let biggest: SpendingSummary["biggest"] = null;
  const byCategory = new Map<string, number>();
  const byPayer = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const item of items) {
    total += item.cents;
    mine += item.shareCents;
    if (!biggest || item.cents > biggest.cents) biggest = { cents: item.cents, description: item.description.trim(), date: item.date };
    const category = item.category.trim() || "Uncategorised";
    byCategory.set(category, (byCategory.get(category) ?? 0) + item.cents);
    const payer = item.payer.trim() || "Someone";
    byPayer.set(payer, (byPayer.get(payer) ?? 0) + item.cents);
    const month = format(item.date, "yyyy-MM");
    byMonth.set(month, (byMonth.get(month) ?? 0) + item.cents);
  }

  const bars = (entries: [string, number][]) => entries.map(([label, cents]) => ({ label, cents, pct: pctOf(cents, total) }));
  const largestFirst = (m: Map<string, number>, n: number) => bars([...m].sort((a, b) => b[1] - a[1]).slice(0, n));
  const months = [...byMonth]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, maxMonths)
    .map(([key, cents]) => [format(new Date(`${key}-01T00:00:00`), "MMM yyyy"), cents] as [string, number]);

  return {
    count: items.length,
    total,
    mine,
    minePct: pctOf(mine, total),
    biggest,
    categories: largestFirst(byCategory, maxCategories),
    months: bars(months),
    payers: largestFirst(byPayer, maxPayers),
  };
}
