import { differenceInCalendarDays, format, isValid } from "date-fns";

type DateLike = Date | string | number | { toDate: () => Date } | null | undefined;

/** Accepts a Date, an ISO string, a timestamp or a Firestore Timestamp. */
export function toDate(value: DateLike): Date | null {
  if (value == null) return null;
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value as string | number);
  return isValid(date) ? date : null;
}

/**
 * When an expense happened, for sorting. Its date has no time of day (forms save noon), so one
 * dated the day it was added sorts by when it was added: the one you just added is on top. One
 * added later for an earlier day keeps its date. Not saved yet (no `createdAt`) counts as now.
 */
export function expenseMoment(date: DateLike, createdAt: DateLike, now: Date = new Date()): Date {
  const day = toDate(date) ?? new Date(0);
  const added = createdAt === null ? now : toDate(createdAt);
  return added && day.toDateString() === added.toDateString() ? added : day;
}

/** How long a debt has been open: "new today", "open 5 days", "open since 3 Oct". */
export function debtAge(since: DateLike, now: Date = new Date()): string {
  const date = toDate(since);
  if (!date) return "";
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return "new today";
  if (days === 1) return "open since yesterday";
  if (days < 14) return `open ${days} days`;
  return `open since ${format(date, date.getFullYear() === now.getFullYear() ? "d MMM" : "d MMM yyyy")}`;
}

/** Old enough to deserve a nudge (a month or more). */
export const isOldDebt = (since: DateLike, now: Date = new Date()) => {
  const date = toDate(since);
  return !!date && differenceInCalendarDays(now, date) >= 30;
};

/**
 * The one way the app shows a date: "Today", "Yesterday" or "3 days ago" within the last week,
 * otherwise "13 Sep 2026".
 */
export function formatDate(value: DateLike, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "";
  const days = differenceInCalendarDays(now, date);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;
  return format(date, "d MMM yyyy");
}

/** Always the calendar date ("13 Sep 2026"), e.g. for tooltips and exports. */
export function formatCalendarDate(value: DateLike): string {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy") : "";
}

/** "13 Sep 2026, 14:05", for things where the time matters (messages, activity). */
export function formatDateTime(value: DateLike, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return "";
  return `${formatDate(date, now)}, ${format(date, "HH:mm")}`;
}
