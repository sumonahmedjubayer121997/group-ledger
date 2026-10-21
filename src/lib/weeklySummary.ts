import { format } from "date-fns";
import { formatMoney, formatTotals } from "@/lib/money";
import { isOverdue, loanBalance, type Loan } from "@/lib/loans";

/**
 * The weekly "where you stand" note. SplitWize has no server (the free Firebase plan can't run
 * scheduled jobs or send push or email), so your own app writes it into your notifications the
 * first time it's opened after Sunday evening. One per week, kept in your private settings.
 */

const SUMMARY_HOUR = 18;

/** The week a summary belongs to: the date of the latest Sunday 18:00 that has passed. */
export function summaryWeekKey(now: Date): string {
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), SUMMARY_HOUR);
  if (sunday > now) sunday.setDate(sunday.getDate() - 7);
  return format(sunday, "yyyy-MM-dd");
}

export type GroupPosition = { groupName: string; currency: string; net: number };

/** Null when there's nothing to say: everything settled and no loan overdue. */
export function buildWeeklySummary(groups: GroupPosition[], loans: Loan[], now: Date): { title: string; message: string } | null {
  const open = groups.filter((g) => g.net !== 0).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const overdue = loans.filter((l) => isOverdue(l, now));
  if (open.length === 0 && overdue.length === 0) return null;

  const owed = new Map<string, number>();
  const owe = new Map<string, number>();
  for (const g of open) {
    const into = g.net > 0 ? owed : owe;
    into.set(g.currency, (into.get(g.currency) ?? 0) + Math.abs(g.net));
  }
  const title =
    owed.size && owe.size
      ? `Your week: you're owed ${formatTotals(owed)} and owe ${formatTotals(owe)}`
      : owed.size
        ? `Your week: you're owed ${formatTotals(owed)}`
        : owe.size
          ? `Your week: you owe ${formatTotals(owe)}`
          : `Your week: ${overdue.length === 1 ? "a loan is" : `${overdue.length} loans are`} overdue`;

  const parts = open
    .slice(0, 3)
    .map((g) => `${g.groupName}: ${formatMoney(Math.abs(g.net), g.currency)} ${g.net > 0 ? "to you" : "to pay"}`);
  if (open.length > 3) parts.push(`${open.length - 3} more ${open.length - 3 === 1 ? "group" : "groups"}`);
  if (overdue.length) {
    const [first] = overdue;
    const what = `${first.direction === "lent" ? "from" : "to"} ${first.person}, ${formatMoney(loanBalance(first).remainingCents, first.currency)}`;
    parts.push(overdue.length === 1 ? `Overdue loan ${what}` : `${overdue.length} overdue loans, including ${what}`);
  }
  return { title, message: parts.join(" · ") };
}
