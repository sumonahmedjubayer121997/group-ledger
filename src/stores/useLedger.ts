import { useMemo } from "react";
import { useExpenseStore, type Expense, type Group, type Member, type Settlement } from "./expenseStore";
import { debtsToShow, groupLedger, toCurrencyCode, type Debt, type GroupLedger } from "@/lib/money";

export type Person = { id: string; name: string; email?: string; isFormer?: boolean };

export type DebtView = Debt & {
  fromPerson: Person;
  toPerson: Person;
  currency: string;
  groupId: string;
  groupName: string;
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
export function buildGroupLedger(group: Group, expenses: Expense[], settlements: Settlement[]): GroupLedgerView {
  const members = group.members.map((m) => ({ id: m.id, email: m.email, name: m.name }));
  const ledger = groupLedger({ members, expenses, settlements });
  const currency = toCurrencyCode(group.settings?.currency);

  const byId = new Map<string, Person>(group.members.map((m: Member) => [m.id, { id: m.id, name: m.name, email: m.email }]));
  const person = (id: string): Person => {
    const member = byId.get(id);
    if (member) return member;
    for (const e of expenses) {
      const ref = e.paidBy?.id === id ? e.paidBy : e.splitAmong?.find((p) => p.id === id);
      if (ref) return { id, name: ref.name || "Former member", email: ref.email, isFormer: true };
    }
    return { id, name: "Former member", isFormer: true };
  };

  const debts = debtsToShow(ledger, group.settings?.simplifyDebts ?? true).map((d) => ({
    ...d,
    fromPerson: person(d.from),
    toPerson: person(d.to),
    currency,
    groupId: group.id,
    groupName: group.name,
  }));

  return { group, currency, ledger, debts, person };
}

/** The ledger for one group, recalculated whenever its expenses or settlements change. */
export function useGroupLedger(groupId: string | undefined): GroupLedgerView | null {
  const group = useExpenseStore((s) => s.groups.find((g) => g.id === groupId));
  const expenses = useExpenseStore((s) => s.expenses);
  const settlements = useExpenseStore((s) => (groupId ? s.groupSettlements[groupId] : undefined));

  return useMemo(() => {
    if (!group) return null;
    return buildGroupLedger(
      group,
      expenses.filter((e) => e.groupId === group.id),
      settlements ?? [],
    );
  }, [group, expenses, settlements]);
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
      );
      const net = view.ledger.nets.get(userId) ?? 0;
      const mine = view.debts.filter((d) => d.from === userId || d.to === userId);
      perGroup.push({ group, currency: view.currency, net, debts: mine });
      debts.push(...mine);
      if (net > 0) owedToYou.set(view.currency, (owedToYou.get(view.currency) ?? 0) + net);
      if (net < 0) youOwe.set(view.currency, (youOwe.get(view.currency) ?? 0) - net);
    }
    return { perGroup, debts, owedToYou, youOwe };
  }, [userId, groups, expenses, groupSettlements]);
}

/** Currency code for any group in the store, e.g. currencyOf(expense.groupId) -> "GBP". */
export function useCurrencyOf(): (groupId: string | undefined) => string {
  const groups = useExpenseStore((s) => s.groups);
  return useMemo(() => {
    const byId = new Map(groups.map((g) => [g.id, toCurrencyCode(g.settings?.currency)]));
    return (groupId) => (groupId && byId.get(groupId)) || "USD";
  }, [groups]);
}
