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
  | "app_installed";

type UsageDetails = {
  /** How long the job took, e.g. opening "Add expense" to saving it. */
  durationMs?: number;
  /** How many suggested values the person changed before saving. */
  guessesChanged?: number;
  /** Where the job started: "header", "bottom-bar", "group", "dashboard", "command-bar"… */
  source?: string;
};

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
