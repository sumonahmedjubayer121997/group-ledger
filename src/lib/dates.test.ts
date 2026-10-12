import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatDate, formatDateTime, toDate } from "./dates";

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
