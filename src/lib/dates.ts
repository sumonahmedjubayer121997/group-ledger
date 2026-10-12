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
