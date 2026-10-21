import { formatMoney, toCents } from "@/lib/money";
import { formatCalendarDate, toDate } from "@/lib/dates";

type ExpenseLike = {
  description?: string;
  amount?: number;
  category?: string;
  date?: Date | string | number | { toDate: () => Date };
  paidBy?: { id?: string; name?: string };
  splitType?: string;
  splitData?: Record<string, number>;
  splitPercentages?: Record<string, number>;
};

export const firstName = (name: string | undefined, fallback = "Someone") => name?.trim().split(/\s+/)[0] || fallback;

const sameDay = (a: ExpenseLike["date"], b: ExpenseLike["date"]) => {
  const x = toDate(a);
  const y = toDate(b);
  return !x || !y || x.toDateString() === y.toDateString();
};

const sameSplit = (a: ExpenseLike, b: ExpenseLike) =>
  (a.splitType || "equal") === (b.splitType || "equal") &&
  JSON.stringify(a.splitPercentages ?? a.splitData ?? {}) === JSON.stringify(b.splitPercentages ?? b.splitData ?? {});

/**
 * What an edit changed, in a few words each: "amount $50.00 → $60.00", "now paid by Bob".
 * Only fields present in `changes` are compared; at most three are named, then "and N more".
 */
export function describeExpenseChanges(before: ExpenseLike, changes: ExpenseLike, currency: string): string {
  const parts: string[] = [];
  const has = (key: keyof ExpenseLike) => key in changes && changes[key] !== undefined;
  if (has("amount") && toCents(changes.amount) !== toCents(before.amount))
    parts.push(`amount ${formatMoney(toCents(before.amount), currency)} → ${formatMoney(toCents(changes.amount), currency)}`);
  if (has("description") && changes.description?.trim() !== before.description?.trim()) parts.push(`renamed from "${before.description}"`);
  if (has("paidBy") && changes.paidBy?.id !== before.paidBy?.id) parts.push(`now paid by ${firstName(changes.paidBy?.name)}`);
  if (has("date") && !sameDay(before.date, changes.date)) parts.push(`date ${formatCalendarDate(changes.date)}`);
  if (has("splitType") && !sameSplit(before, { ...before, ...changes })) parts.push("split changed");
  if (has("category") && changes.category !== before.category) parts.push(`category ${changes.category}`);
  if (!parts.length) return "Details changed";
  const shown = parts.slice(0, 3).join(", ");
  const rest = parts.length - 3;
  const text = rest > 0 ? `${shown} and ${rest} more` : shown;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** How a payment reads to one person: "you" for them, first names for everyone else. */
export function paymentSentence(fromId: string, fromName: string, toId: string, toName: string, viewerId: string, amount: string) {
  const from = fromId === viewerId ? "You" : firstName(fromName);
  const to = toId === viewerId ? "you" : firstName(toName);
  return `${from} paid ${to} ${amount}`;
}
