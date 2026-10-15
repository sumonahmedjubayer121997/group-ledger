import { splitFieldsToSave } from "@/lib/money";

/**
 * "Try it with a sample trip": a small made-up group so a new person can see balances, splits and
 * settling up before entering anything real. Two placeholder friends, five expenses, one of them
 * split between only two people. Pure data; the dashboard does the saving.
 */

export const SAMPLE_FRIENDS = ["Maya", "Leo"];
export const SAMPLE_GROUP_NAME = "Sample trip: Lisbon";
export const SAMPLE_GROUP_DESCRIPTION = "A made-up trip to try things out. Delete it from Settings when you're done.";

type Person = { id: string; name: string; email: string };

export type SampleExpense<P extends Person = Person> = {
  description: string;
  amount: number;
  category: string;
  paidBy: P;
  splitAmong: P[];
  date: Date;
  splitType: "equal";
} & ReturnType<typeof splitFieldsToSave>;

const daysAgo = (now: Date, n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

/** The expenses for the sample group, given you and the two placeholder friends (in SAMPLE_FRIENDS order). */
export function sampleTripExpenses<P extends Person>(me: P, friends: P[], now = new Date()): SampleExpense<P>[] {
  const [maya, leo] = friends;
  if (!maya || !leo) return [];
  const everyone = [me, maya, leo];
  const rows: [string, number, string, P, P[], number][] = [
    ["Flights", 360, "Travel", me, everyone, 6],
    ["Apartment, 3 nights", 420, "Travel", maya, everyone, 6],
    ["Dinner at the taberna", 96, "Food & Dining", leo, everyone, 4],
    ["Tram passes", 30, "Transportation", me, everyone, 3],
    ["Groceries", 42, "Groceries", maya, [me, maya], 2],
  ];
  return rows.map(([description, amount, category, paidBy, splitAmong, ago]) => ({
    description,
    amount,
    category,
    paidBy,
    splitAmong,
    date: daysAgo(now, ago),
    splitType: "equal" as const,
    ...splitFieldsToSave("equal", amount, {}, splitAmong.map((p) => p.id), paidBy.id),
  }));
}
