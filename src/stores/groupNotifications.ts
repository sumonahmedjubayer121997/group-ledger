import { notificationFirebaseService, type FirebaseNotification } from "@/services/notificationFirebaseService";
import { expenseShares, formatMoney, makeResolver, toCents, toCurrencyCode } from "@/lib/money";
import { describeExpenseChanges, firstName, paymentSentence } from "@/lib/notificationText";
import type { Expense, Group, Settlement } from "./expenseStore";

/**
 * Notifications about a group's expenses and payments. Each names who did it and what changed
 * ("Alice edited "Dinner": amount $50.00 → $60.00"), goes only to people with an account (not
 * names added without one), and respects the group's Notifications setting. Sending never throws.
 */

type Message = Pick<FirebaseNotification, "type" | "title" | "message" | "route"> & { expenseId?: string };

const recipients = (group: Group, actorId: string, only?: string[]) =>
  group.settings?.notifications === false
    ? []
    : group.members.filter((m) => m.id !== actorId && !m.isTemporary && (!only || only.includes(m.id)));

const actorName = (group: Group, actorId: string) => firstName(group.members.find((m) => m.id === actorId)?.name);

async function send(group: Group, actorId: string, build: (memberId: string) => Message | null, only?: string[]) {
  const ids = await Promise.all(
    recipients(group, actorId, only).map((member) => {
      const message = build(member.id);
      return message ? notificationFirebaseService.send({ ...message, to: member.id, from: actorId, groupId: group.id }) : null;
    })
  );
  return ids.filter((id): id is string => !!id);
}

const money = (group: Group, amount: number) => formatMoney(toCents(amount), toCurrencyCode(group.settings?.currency));

export function notifyExpenseAdded(group: Group, actorId: string, expense: Expense) {
  const resolve = makeResolver(group.members, group.aliases);
  const shares = expenseShares(expense, resolve);
  const currency = toCurrencyCode(group.settings?.currency);
  return send(group, actorId, (memberId) => {
    const share = shares.get(memberId) ?? 0;
    return {
      type: "expense_added",
      title: `${actorName(group, actorId)} added "${expense.description}"`,
      message: `${money(group, expense.amount)}${share > 0 ? ` · your share ${formatMoney(share, currency)}` : ""} · ${group.name}`,
      route: `/groups/${group.id}`,
      expenseId: expense.id,
    };
  });
}

export function notifyExpenseEdited(group: Group, actorId: string, before: Expense, changes: Partial<Expense>) {
  const what = describeExpenseChanges(before, changes, toCurrencyCode(group.settings?.currency));
  return send(group, actorId, () => ({
    type: "expense_edited",
    title: `${actorName(group, actorId)} edited "${changes.description ?? before.description}"`,
    message: `${what} · ${group.name}`,
    route: `/groups/${group.id}`,
    expenseId: before.id,
  }));
}

export function notifyExpenseDeleted(group: Group, actorId: string, expense: Expense) {
  return send(group, actorId, () => ({
    type: "expense_deleted",
    title: `${actorName(group, actorId)} deleted "${expense.description}"`,
    message: `${money(group, expense.amount)} · ${group.name}`,
    route: `/groups/${group.id}`,
  }));
}

const nameOf = (group: Group, id: string) => group.members.find((m) => m.id === id)?.name ?? "Someone";

/**
 * Tells the two people in a payment (except whoever recorded it): "Bob paid you $20.00", or to the
 * payer when the other person recorded it, "Alice confirmed your $20.00 payment". Returns the ids,
 * so Undo can take them back.
 */
export function notifyPaymentRecorded(group: Group, actorId: string, s: Settlement) {
  const amount = money(group, s.amount);
  const actor = actorName(group, actorId);
  return send(
    group,
    actorId,
    (memberId) => {
      const sentence = paymentSentence(s.fromMemberId, nameOf(group, s.fromMemberId), s.toMemberId, nameOf(group, s.toMemberId), memberId, amount);
      const title =
        actorId === s.toMemberId
          ? `${actor} confirmed your ${amount} payment`
          : actorId === s.fromMemberId
            ? sentence
            : `${actor} recorded: ${sentence}`;
      return { type: "settlement_made", title, message: group.name, route: `/groups/${group.id}?tab=balances` };
    },
    [s.fromMemberId, s.toMemberId]
  );
}

export function notifyPaymentRemoved(group: Group, actorId: string, s: Settlement) {
  const amount = money(group, s.amount);
  return send(
    group,
    actorId,
    (memberId) => ({
      type: "settlement_removed",
      title: `${actorName(group, actorId)} removed a payment`,
      message: `${paymentSentence(s.fromMemberId, nameOf(group, s.fromMemberId), s.toMemberId, nameOf(group, s.toMemberId), memberId, amount)} · ${group.name}`,
      route: `/groups/${group.id}?tab=balances`,
    }),
    [s.fromMemberId, s.toMemberId]
  );
}
