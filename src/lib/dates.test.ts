import { describe, expect, it } from "vitest";
import { debtAge, expenseMoment, formatCalendarDate, formatDate, formatDateTime, isOldDebt, toDate } from "./dates";

const now = new Date(2026, 9, 12, 15, 30); // 12 Oct 2026, 15:30 local time

describe("formatDate", () => {
  it("is relative within the last week", () => {
    expect(formatDate(new Date(2026, 9, 12, 8, 0), now)).toBe("Today");
    expect(formatDate(new Date(2026, 9, 11, 23, 59), now)).toBe("Yesterday");
    expect(formatDate(new Date(2026, 9, 9), now)).toBe("3 days ago");
    expect(formatDate(new Date(2026, 9, 6), now)).toBe("6 days ago");
  });

  it("shows the calendar date from a week ago, and for future dates", () => {
    expect(formatDate(new Date(2026, 9, 5), now)).toBe("5 Oct 2026");
    expect(formatDate(new Date(2025, 6, 24), now)).toBe("24 Jul 2025");
    expect(formatDate(new Date(2026, 9, 20), now)).toBe("20 Oct 2026");
  });

  it("accepts strings, timestamps and Firestore Timestamps, and ignores bad input", () => {
    expect(formatDate("2026-09-13T10:00:00", now)).toBe("13 Sep 2026");
    expect(formatDate(new Date(2026, 8, 13).getTime(), now)).toBe("13 Sep 2026");
    expect(formatDate({ toDate: () => new Date(2026, 8, 13) }, now)).toBe("13 Sep 2026");
    expect(formatDate(undefined, now)).toBe("");
    expect(formatDate("not a date", now)).toBe("");
    expect(toDate(null)).toBeNull();
  });
});

describe("other formats", () => {
  it("formats calendar dates and date-times", () => {
    expect(formatCalendarDate(new Date(2026, 9, 12))).toBe("12 Oct 2026");
    expect(formatDateTime(new Date(2026, 9, 12, 9, 5), now)).toBe("Today, 09:05");
    expect(formatDateTime(new Date(2026, 8, 1, 18, 0), now)).toBe("1 Sep 2026, 18:00");
  });
});

describe("expenseMoment", () => {
  const noon = new Date("2026-10-20T12:00:00");
  it("uses when it was added for an expense dated that day", () => {
    const added = new Date("2026-10-20T21:54:00");
    expect(expenseMoment(noon, added)).toEqual(added);
    expect(expenseMoment(noon, null, added)).toEqual(added);
  });
  it("keeps the date of one added later for an earlier day", () => {
    expect(expenseMoment(noon, new Date("2026-10-22T09:00:00"))).toEqual(noon);
    expect(expenseMoment(noon, undefined)).toEqual(noon);
  });
});

describe("debtAge", () => {
  const today = new Date(2026, 9, 21, 9);
  it("says how long a debt has been open", () => {
    expect(debtAge(new Date(2026, 9, 21, 8), today)).toBe("new today");
    expect(debtAge(new Date(2026, 9, 20), today)).toBe("open since yesterday");
    expect(debtAge(new Date(2026, 9, 16), today)).toBe("open 5 days");
    expect(debtAge(new Date(2026, 8, 3), today)).toBe("open since 3 Sep");
    expect(debtAge(new Date(2025, 11, 30), today)).toBe("open since 30 Dec 2025");
    expect(debtAge(null, today)).toBe("");
  });
  it("flags debts a month old", () => {
    expect(isOldDebt(new Date(2026, 8, 21), today)).toBe(true);
    expect(isOldDebt(new Date(2026, 9, 1), today)).toBe(false);
  });
});
