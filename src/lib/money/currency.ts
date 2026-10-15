/**
 * Currency helpers. Amounts are stored in Firestore as decimal numbers (e.g. 247.5); all maths in the
 * app happens in integer cents so splits always add up exactly.
 */

export const SUPPORTED_CURRENCIES = [
  { code: "BDT", label: "৳ BDT – Bangladeshi taka" },
  { code: "USD", label: "$ USD – US dollar" },
  { code: "GBP", label: "£ GBP – British pound" },
  { code: "EUR", label: "€ EUR – Euro" },
  { code: "CAD", label: "CA$ CAD – Canadian dollar" },
  { code: "AUD", label: "A$ AUD – Australian dollar" },
  { code: "JPY", label: "¥ JPY – Japanese yen" },
] as const;

// Older groups saved a symbol (or "CAD $") instead of a currency code.
const LEGACY_SYMBOLS: Record<string, string> = {
  $: "USD",
  US$: "USD",
  "£": "GBP",
  "€": "EUR",
  "৳": "BDT",
  "¥": "JPY",
  "₹": "INR",
  "CAD $": "CAD",
  CA$: "CAD",
  "AUS $": "AUD",
  AU$: "AUD",
  A$: "AUD",
};

/** Turns whatever a group stored ("USD", "£", "CAD $") into an ISO 4217 code. Defaults to USD. */
export function toCurrencyCode(stored?: string | null): string {
  const value = (stored ?? "").trim();
  if (/^[A-Za-z]{3}$/.test(value)) return value.toUpperCase();
  return LEGACY_SYMBOLS[value] ?? "USD";
}

/**
 * Decimal amount -> integer cents, rounding half up. Works on the decimal string so values like
 * 1.005 (stored as 1.00499999…) still round the way people expect.
 */
export function toCents(amount: number | string | null | undefined): number {
  const n = typeof amount === "string" ? Number.parseFloat(amount) : Number(amount ?? 0);
  if (!Number.isFinite(n) || n === 0) return 0;
  const sign = n < 0 ? -1 : 1;
  const [whole, fraction = ""] = Math.abs(n).toFixed(6).split(".");
  const cents = Number(whole) * 100 + Number(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1 : 0);
  return sign * cents;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(code: string) {
  let formatter = formatters.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        // "$" alone is ambiguous between USD, CAD and AUD; keep CA$ / A$ for those.
        currencyDisplay: code === "CAD" || code === "AUD" ? "symbol" : "narrowSymbol",
      });
    } catch {
      formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
    formatters.set(code, formatter);
  }
  return formatter;
}

/** Formats integer cents in a currency: formatMoney(24750, "GBP") -> "£247.50". */
export function formatMoney(cents: number, currency: string): string {
  return formatterFor(toCurrencyCode(currency)).format(fromCents(cents));
}

/** Formats a stored decimal amount: formatAmount(247.5, "£") -> "£247.50". */
export function formatAmount(amount: number, currency: string): string {
  return formatMoney(toCents(amount), currency);
}

/** "£1,932.05 · $1,035.00" — one entry per currency, never added together across currencies. */
export function formatTotals(totals: Map<string, number> | Record<string, number>): string {
  const entries = totals instanceof Map ? [...totals.entries()] : Object.entries(totals);
  const nonZero = entries.filter(([, cents]) => cents !== 0);
  if (nonZero.length === 0) return formatMoney(0, entries[0]?.[0] ?? "USD");
  return nonZero.map(([code, cents]) => formatMoney(cents, code)).join(" · ");
}
