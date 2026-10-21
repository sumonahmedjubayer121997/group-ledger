import type { SUPPORTED_CURRENCIES } from "./currency";

type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

const EURO = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
const BY_REGION: Record<string, CurrencyCode> = {
  BD: "BDT",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
  ...Object.fromEntries(EURO.map((r) => [r, "EUR" as CurrencyCode])),
};

// Many phones in Bangladesh or the UK are set to US English; the time zone says where they are.
const BY_TIME_ZONE: Record<string, CurrencyCode> = {
  "Asia/Dhaka": "BDT",
  "Europe/London": "GBP",
  "Asia/Tokyo": "JPY",
};

const regionOf = (tag: string) => {
  try {
    const locale = new Intl.Locale(tag);
    return locale.region ?? locale.maximize().region;
  } catch {
    return undefined;
  }
};

/**
 * A new account's default currency, guessed from where the phone is: its time zone for a few
 * places where people often use US English, then the region of its languages ("en-GB" → GBP,
 * "bn" → BDT). US dollars when nothing matches.
 */
export function currencyForDevice(languages: readonly string[], timeZone?: string): CurrencyCode {
  if (timeZone && BY_TIME_ZONE[timeZone]) return BY_TIME_ZONE[timeZone];
  if (timeZone?.startsWith("Australia/")) return "AUD";
  for (const tag of languages) {
    const region = regionOf(tag);
    if (region && BY_REGION[region]) return BY_REGION[region];
  }
  return "USD";
}

/** The guess for this browser. */
export function guessCurrency(): CurrencyCode {
  try {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
    return currencyForDevice(languages, Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "USD";
  }
}
