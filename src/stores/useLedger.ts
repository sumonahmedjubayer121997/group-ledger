import { useMemo } from "react";
import { useExpenseStore, type Expense, type Group, type Member, type Settlement } from "./expenseStore";
import { debtsToShow, groupLedger, openSince, toCurrencyCode, type Debt, type GroupLedger } from "@/lib/money";
import { expenseMoment, toDate } from "@/lib/dates";
import { useHidden } from "@/lib/undo";

export type Person = { id: string; name: string; email?: string; isFormer?: boolean };

export type DebtView = Debt & {
  fromPerson: Person;
  toPerson: Person;
  currency: string;
  groupId: string;
  groupName: string;
  /** When this debt started: the later of when the debtor began owing and the creditor began being owed. */
  since: Date | null;
};

export type GroupLedgerView = {
  group: Group;
  currency: string;
  ledger: GroupLedger;
  /** What to list on the group page: simplified when the group's "Simplify debts" setting is on. */
  debts: DebtView[];
  person: (id: string) => Person;
};

/** Builds the ledger for one group from its expenses and its Firestore settlements. */
export function buildGroupLedger(group: Group, allExpenses: Expense[], allSettlements: Settlement[], hidden?: Set<string>): GroupLedgerView {
  // Items deleted a moment ago (still undoable) no longer count.
  const expenses = hidden?.size ? allExpenses.filter((e) => !hidden.has(`expense-${e.id}`)) : allExpenses;
  const settlements = hidden?.size ? allSettlements.filter((s) => !hidden.has(`payment-${s.id}`)) : allSettlements;
  const members = group.members.map((m) => ({ id: m.id, email: m.email, name: m.name }));
  const input = { members, expenses, settlements, aliases: group.aliases };
  const ledger = groupLedger(input);
  const currency = toCurrencyCode(group.settings?.currency);

  const byId = new Map<string, Person>(group.members.map((m: Member) => [m.id, { id: m.id, name: m.name, email: m.email }]));
  const person = (id: string): Person => {
    const member = byId.get(group.aliases?.[id] ?? id) ?? byId.get(id);
    if (member) return member;
    for (const e of expenses) {
      const ref = e.paidBy?.id === id ? e.paidBy : e.splitAmong?.find((p) => p.id === id);
      if (ref) return { id, name: ref.name || "Former member", email: ref.email, isFormer: true };
    }
    return { id, name: "Former member", isFormer: true };
  };

  // How long each debt has been open (see openSince), worked out once per person.
  const when = (item: object) =>
    "date" in item && "paidBy" in item
      ? expenseMoment((item as Expense).date, (item as Expense).createdAt)
      : toDate((item as Settlement).date);
  const sinceCache = new Map<string, Date | null>();
  const sinceOf = (id: string) => {
    if (!sinceCache.has(id)) sinceCache.set(id, openSince(input, id, when));
    return sinceCache.get(id) ?? null;
  };
  const debts = debtsToShow(ledger, group.settings?.simplifyDebts ?? true).map((d) => {
    const a = sinceOf(d.from);
    const b = sinceOf(d.to);
    return {
      ...d,
      fromPerson: person(d.from),
      toPerson: person(d.to),
      currency,
      groupId: group.id,
      groupName: group.name,
      since: a && b ? (a > b ? a : b) : a ?? b,
    };
  });

  return { group, currency, ledger, debts, person };
}

/** The ledger for one group, recalculated whenever its expenses or settlements change. */
export function useGroupLedger(groupId: string | undefined): GroupLedgerView | null {
  const group = useExpenseStore((s) => s.groups.find((g) => g.id === groupId));
  const expenses = useExpenseStore((s) => s.expenses);
  const settlements = useExpenseStore((s) => (groupId ? s.groupSettlements[groupId] : undefined));
  const hidden = useHidden((s) => s.hidden);

  return useMemo(() => {
    if (!group) return null;
    return buildGroupLedger(
      group,
      expenses.filter((e) => e.groupId === group.id),
      settlements ?? [],
      hidden,
    );
  }, [group, expenses, settlements, hidden]);
}

export type UserBalances = {
  perGroup: { group: Group; currency: string; net: number; debts: DebtView[] }[];
  /** Debts in any group that involve this person. */
  debts: DebtView[];
  /** Per currency, in cents. */
  owedToYou: Map<string, number>;
  youOwe: Map<string, number>;
};

/** This person's position in every group, totalled per currency (never mixed). */
export function useUserBalances(userId: string | undefined): UserBalances {
  const groups = useExpenseStore((s) => s.groups);
  const expenses = useExpenseStore((s) => s.expenses);
  const groupSettlements = useExpenseStore((s) => s.groupSettlements);
  const hidden = useHidden((s) => s.hidden);

  return useMemo(() => {
    const owedToYou = new Map<string, number>();
    const youOwe = new Map<string, number>();
    const perGroup: UserBalances["perGroup"] = [];
    const debts: DebtView[] = [];
    if (!userId) return { perGroup, debts, owedToYou, youOwe };

    for (const group of groups) {
      if (!group.members.some((m) => m.id === userId)) continue;
      const view = buildGroupLedger(
        group,
        expenses.filter((e) => e.groupId === group.id),
        groupSettlements[group.id] ?? [],
        hidden,
      );
      const net = view.ledger.nets.get(userId) ?? 0;
      const mine = view.debts.filter((d) => d.from === userId || d.to === userId);
      perGroup.push({ group, currency: view.currency, net, debts: mine });
      debts.push(...mine);
      if (net > 0) owedToYou.set(view.currency, (owedToYou.get(view.currency) ?? 0) + net);
      if (net < 0) youOwe.set(view.currency, (youOwe.get(view.currency) ?? 0) - net);
    }
    return { perGroup, debts, owedToYou, youOwe };
  }, [userId, groups, expenses, groupSettlements, hidden]);
}

/** Currency code for any group in the store, e.g. currencyOf(expense.groupId) -> "GBP". */
export function useCurrencyOf(): (groupId: string | undefined) => string {
  const groups = useExpenseStore((s) => s.groups);
  return useMemo(() => {
    const byId = new Map(groups.map((g) => [g.id, toCurrencyCode(g.settings?.currency)]));
    return (groupId) => (groupId && byId.get(groupId)) || "USD";
  }, [groups]);
}
