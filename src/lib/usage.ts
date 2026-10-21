import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * A few anonymous usage events, to tell whether the core jobs got faster. Stored in Firestore
 * (no cookies, no third party), with counts and timings only: never amounts, descriptions, names
 * or user ids. The security rules only allow these fields.
 */
export type UsageEvent =
  | "quick_add_opened"
  | "expense_saved"
  | "payment_confirmed"
  | "invite_shared"
  | "undo_used"
  | "command_bar_opened"
  | "app_installed"
  | "app_opened";

type UsageDetails = {
  /** How long the job took, e.g. opening "Add expense" to saving it. */
  durationMs?: number;
  /** How many suggested values the person changed before saving. */
  guessesChanged?: number;
  /** Where the job started: "header", "bottom-bar", "group", "dashboard", "command-bar"… */
  source?: string;
};

/**
 * Which week since this device first opened the app: "first" the first time, then "week0" (the
 * rest of the first week), "week1", … up to "week8+". Pure, for testing.
 */
export function openBucket(firstOpen: number | null, now: number): string {
  if (firstOpen == null) return "first";
  const week = Math.floor((now - firstOpen) / (7 * 24 * 60 * 60 * 1000));
  return week >= 8 ? "week8+" : `week${Math.max(0, week)}`;
}

const FIRST_OPEN_KEY = "splitwize:first-open";
const OPENS_SENT_KEY = "splitwize:opens-sent";

/**
 * Counts the app being opened, once per week-since-first-open per device, so week-1 and week-4
 * return rates can be read off the counts ("week1" against "first"). Nothing identifies the person
 * or the device; the dates stay on the device.
 */
export function trackAppOpened(now = Date.now()) {
  try {
    const saved = localStorage.getItem(FIRST_OPEN_KEY);
    const firstOpen = saved ? Number(saved) : null;
    const bucket = openBucket(firstOpen, now);
    const sent: string[] = JSON.parse(localStorage.getItem(OPENS_SENT_KEY) || "[]");
    if (sent.includes(bucket)) return;
    if (firstOpen == null) localStorage.setItem(FIRST_OPEN_KEY, String(now));
    localStorage.setItem(OPENS_SENT_KEY, JSON.stringify([...sent, bucket]));
    track("app_opened", { source: bucket });
  } catch {
    /* no storage, no count */
  }
}

export function track(event: UsageEvent, details: UsageDetails = {}) {
  const data: Record<string, unknown> = { event, at: serverTimestamp(), v: 1 };
  if (typeof details.durationMs === "number" && Number.isFinite(details.durationMs)) {
    data.durationMs = Math.max(0, Math.round(details.durationMs));
  }
  if (typeof details.guessesChanged === "number") data.guessesChanged = details.guessesChanged;
  if (details.source) data.source = details.source.slice(0, 30);
  // Never let measuring get in the way of the job itself.
  void addDoc(collection(db, "usageEvents"), data).catch(() => undefined);
}
