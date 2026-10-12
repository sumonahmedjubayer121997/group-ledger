export type CurrencyCode = "BDT" | "USD" | "EUR" | "GBP";

export const CURRENCIES: CurrencyCode[] = ["BDT", "USD", "EUR", "GBP"];

/** Visitors in Bangladesh see taka by default; everyone else starts in dollars. */
export function defaultCurrency(): CurrencyCode {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Dhaka" ? "BDT" : "USD";
  } catch {
    return "USD";
  }
}

export function formatMoney(cents: number, currency: CurrencyCode, fractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

/**
 * Splits `totalCents` by integer weights, handing leftover cents out one at a time
 * so the parts always add up exactly to the total.
 */
export function splitByWeights(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || totalCents <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (totalCents * w) / sum);
  const parts = raw.map(Math.floor);
  let left = totalCents - parts.reduce((s, p) => s + p, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) parts[order[k].i] += 1;
  return parts;
}
