/**
 * Guesses an expense's category from its description: first from what this person chose for the
 * same words before, then from a short keyword list. Only returns categories they have.
 */

type Past = { description?: string; category?: string };

const KEYWORDS: [RegExp, string][] = [
  [/\b(gas bill|electric(ity)?|water bill|internet|wi-?fi|broadband|council tax|phone bill|rent|bills?)\b/, "Bills & Utilities"],
  [/\b(tesco|lidl|aldi|asda|sainsbury'?s?|morrisons|co-?op|waitrose|iceland|baraka|grocer(y|ies)?|supermarket|swapno|chaldal|milk|bread|eggs?|rice|onions?|vegetables?|fruit)\b/, "Groceries"],
  [/\b(restaurant|cafe|coffee|lunch|dinner|breakfast|pizza|burger|biryani|kebab|kfc|mcdonald'?s?|takeaway|deliveroo|ubereats|just ?eat|foodpanda)\b/, "Food & Dining"],
  [/\b(uber|bolt|taxi|cab|train|tube|bus|metro|oyster|pathao|parking)\b/, "Transportation"],
  [/\b(petrol|fuel|diesel)\b/, "Gas"],
  [/\b(netflix|spotify|disney|cinema|movie|concert|gig|games?)\b/, "Entertainment"],
  [/\b(flights?|hotel|airbnb|booking|holiday|hostel|trip)\b/, "Travel"],
  [/\b(gym|pharmacy|doctor|medicine|dentist|chemist)\b/, "Health & Fitness"],
  [/\b(course|books?|tuition|school|udemy|exam)\b/, "Education"],
  [/\b(amazon|clothes|shoes|ikea|furniture|curtains?|mirror)\b/, "Shopping"],
];

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);

export function suggestCategory(description: string, history: Past[], available: string[]): string | null {
  const text = description.trim().toLowerCase();
  if (!text) return null;
  const have = new Set(available);
  const ok = (category?: string) => (category && have.has(category) ? category : null);

  // 1. The same description as before (newest first in `history`).
  const same = history.find((p) => p.description?.trim().toLowerCase() === text && ok(p.category));
  if (same) return same.category!;

  // 2. Shared words: each past expense votes for its category by how many words it shares.
  const mine = new Set(words(text));
  const votes = new Map<string, number>();
  for (const p of history) {
    const category = ok(p.category);
    if (!category || !p.description) continue;
    const shared = words(p.description).filter((w) => mine.has(w)).length;
    if (shared > 0) votes.set(category, (votes.get(category) ?? 0) + shared);
  }
  const best = [...votes].sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];

  // 3. A keyword list for people with no history yet.
  for (const [pattern, category] of KEYWORDS) if (pattern.test(text) && ok(category)) return category;
  return null;
}
