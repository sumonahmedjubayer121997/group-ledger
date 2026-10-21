import { Timestamp, collection, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Polite reminders: the person owed can remind someone in the same group, once a week. Each one
 * writes `nudges/{groupId}_{from}_{to}` and the reminder notification in one batch; the security
 * rules only accept the notification alongside a nudge that's at least 7 days newer than the last.
 */

export const REMINDER_GAP_DAYS = 7;

const nudgeRef = (groupId: string, from: string, to: string) => doc(db, "nudges", `${groupId}_${from}_${to}`);

/** When you last reminded this person in this group, if ever. */
export async function lastReminder(groupId: string, from: string, to: string): Promise<Date | null> {
  const snap = await getDoc(nudgeRef(groupId, from, to)).catch(() => null);
  const at = snap?.data()?.at;
  return at?.toDate ? at.toDate() : null;
}

export async function sendReminder(r: { groupId: string; from: string; to: string; title: string; message: string }) {
  const batch = writeBatch(db);
  batch.set(nudgeRef(r.groupId, r.from, r.to), { groupId: r.groupId, from: r.from, to: r.to, at: serverTimestamp() });
  batch.set(doc(collection(db, "notifications")), {
    to: r.to,
    from: r.from,
    type: "payment_reminder",
    title: r.title,
    message: r.message,
    groupId: r.groupId,
    route: `/groups/${r.groupId}?tab=balances`,
    isRead: false,
    createdAt: Timestamp.now(),
  });
  await batch.commit();
}
