import { toCurrencyCode } from "@/lib/money";

const LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  paypal: "PayPal",
  bkash: "bKash",
  nagad: "Nagad",
  monzo: "Monzo",
  revolut: "Revolut",
  venmo: "Venmo",
  zelle: "Zelle",
  interac: "Interac e-Transfer",
  payid: "PayID",
  paypay: "PayPay",
  other: "Other",
};

// The ways people usually pay each other back where each currency is used, most common first.
const BY_CURRENCY: Record<string, string[]> = {
  BDT: ["cash", "bkash", "nagad", "bank_transfer", "other"],
  GBP: ["bank_transfer", "cash", "monzo", "revolut", "paypal", "other"],
  EUR: ["bank_transfer", "cash", "revolut", "paypal", "other"],
  USD: ["cash", "venmo", "zelle", "paypal", "bank_transfer", "other"],
  CAD: ["interac", "cash", "bank_transfer", "paypal", "other"],
  AUD: ["payid", "bank_transfer", "cash", "paypal", "other"],
  JPY: ["cash", "paypay", "bank_transfer", "other"],
};
const DEFAULT = ["cash", "bank_transfer", "paypal", "other"];

export const methodLabel = (value: string) => LABELS[value] ?? value;

/** The payment methods offered for a group's currency. */
export function methodsFor(currency: string | undefined) {
  return (BY_CURRENCY[toCurrencyCode(currency)] ?? DEFAULT).map((value) => ({ value, label: LABELS[value] }));
}

const key = (currency: string) => `splitwize:last-payment-method:${toCurrencyCode(currency)}`;

/** The method last used for this currency, if it's still offered; else the most common one. */
export function lastMethod(currency: string | undefined): string {
  const offered = methodsFor(currency).map((m) => m.value);
  try {
    const saved = localStorage.getItem(key(currency ?? ""));
    if (saved && offered.includes(saved)) return saved;
  } catch {
    /* no storage: use the default */
  }
  return offered[0];
}

export function rememberMethod(currency: string | undefined, method: string) {
  try {
    localStorage.setItem(key(currency ?? ""), method);
  } catch {
    /* it just won't be remembered */
  }
}
