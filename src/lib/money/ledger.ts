import { toCents } from "./currency";

/**
 * One balance engine for the whole app. Every screen that shows who owes whom (dashboard, group page,
 * group analytics, profile) goes through these functions, so they can't disagree.
 * All amounts here are integer cents.
 */

export type PersonRef = { id: string; email?: string | null; name?: string | null };

export type LedgerExpense = {
  amount: number; // decimal, as stored
  paidBy: PersonRef;
  splitAmong?: PersonRef[];
  splitType?: "equal" | "exact" | "percentage" | string;
  /** exact: amount per person. percentage (version 2+): amount per person. Older percentage expenses: percent per person. */
  splitData?: Record<string, number>;
  splitPercentages?: Record<string, number>;
  splitVersion?: number;
};

export type LedgerSettlement = {
  fromMemberId: string;
  toMemberId: string;
  amount: number; // decimal, as stored
  status?: string;
};

export type Debt = { from: string; to: string; cents: number };

export type LedgerMember = { id: string; email?: string | null; name?: string | null };

/**
 * Maps the people an expense refers to onto current members: by id, or by email for placeholders
 * that were later merged into a real account. Unknown people keep their id ("former member").
 */
export function makeResolver(members: LedgerMember[]) {
  const ids = new Set(members.map((m) => m.id));
  const byEmail = new Map(
    members.filter((m) => m.email).map((m) => [String(m.email).trim().toLowerCase(), m.id]),
  );
  return (person: PersonRef | null | undefined): string | null => {
    if (!person?.id) return null;
    if (ids.has(person.id)) return person.id;
    const viaEmail = person.email ? byEmail.get(person.email.trim().toLowerCase()) : undefined;
    return viaEmail ?? person.id;
  };
}

type Resolver = ReturnType<typeof makeResolver>;

/** Spreads `remainder` cents one at a time over `order`, so shares always sum to the total. */
function hand(remainder: number, order: string[], shares: Map<string, number>) {
  for (let i = 0; remainder > 0 && order.length > 0; i++, remainder--) {
    const id = order[i % order.length];
    shares.set(id, (shares.get(id) ?? 0) + 1);
  }
}

/**
 * How much each participant's share of one expense is, in cents.
 * Leftover cents from rounding go to the payer when they're part of the split.
 */
export function expenseShares(expense: LedgerExpense, resolve: Resolver = (p) => p?.id ?? null): Map<string, number> {
  const total = toCents(expense.amount);
  const payer = resolve(expense.paidBy);
  const rawParticipants = (expense.splitAmong ?? []).map((p) => ({ id: resolve(p), raw: p.id }));
  const participants = [...new Set(rawParticipants.map((p) => p.id).filter((id): id is string => !!id))];
  if (participants.length === 0 && payer) participants.push(payer);

  // splitData is keyed by the id the expense was saved with; look values up by either id.
  const valueFor = (data: Record<string, number> | undefined, id: string) => {
    if (!data) return 0;
    if (id in data) return Number(data[id]) || 0;
    const raw = rawParticipants.find((p) => p.id === id)?.raw;
    return raw && raw in data ? Number(data[raw]) || 0 : 0;
  };

  const shares = new Map<string, number>();
  const leftoverOrder = payer && participants.includes(payer) ? [payer] : participants;

  if (expense.splitType === "exact" || (expense.splitType === "percentage" && (expense.splitVersion ?? 1) >= 2)) {
    for (const id of participants) shares.set(id, toCents(valueFor(expense.splitData, id)));
    return shares;
  }

  if (expense.splitType === "percentage") {
    // Older expenses stored percentages in splitData.
    const percents = expense.splitPercentages ?? expense.splitData;
    let assigned = 0;
    for (const id of participants) {
      const cents = Math.floor((total * valueFor(percents, id)) / 100);
      shares.set(id, cents);
      assigned += cents;
    }
    const percentSum = participants.reduce((s, id) => s + valueFor(percents, id), 0);
    // Only hand out rounding leftovers when the percentages really add up to 100.
    if (Math.abs(percentSum - 100) < 0.001) hand(total - assigned, leftoverOrder, shares);
    return shares;
  }

  // equal (and anything unknown)
  const base = Math.floor(total / participants.length);
  for (const id of participants) shares.set(id, base);
  hand(total - base * participants.length, leftoverOrder, shares);
  return shares;
}

/** Signed amounts per pair: "a owes b" is positive in pair (a, b). */
class PairBook {
  private book = new Map<string, number>();

  add(from: string, to: string, cents: number) {
    if (from === to || cents === 0) return;
    const [a, b] = from < to ? [from, to] : [to, from];
    const key = `${a}\u0000${b}`;
    const signed = from === a ? cents : -cents;
    this.book.set(key, (this.book.get(key) ?? 0) + signed);
  }

  debts(): Debt[] {
    const out: Debt[] = [];
    for (const [key, value] of this.book) {
      if (value === 0) continue;
      const [a, b] = key.split("\u0000");
      out.push(value > 0 ? { from: a, to: b, cents: value } : { from: b, to: a, cents: -value });
    }
    return out.sort((x, y) => y.cents - x.cents);
  }
}

export type GroupLedgerInput = {
  members: LedgerMember[];
  expenses: LedgerExpense[];
  settlements: LedgerSettlement[];
};

export type GroupLedger = {
  /** Positive: this person is owed money. Negative: they owe. Sums to zero. */
  nets: Map<string, number>;
  /** Who owes whom, each pair netted (A→B and B→A collapse into one line). */
  pairwise: Debt[];
  /** The fewest payments that settle everyone. */
  simplified: Debt[];
  /** Settlements whose people aren't in this group (recorded against the wrong group). */
  ignoredSettlements: LedgerSettlement[];
  /** People who appear in expenses but are no longer members. */
  formerMembers: string[];
};

export function groupLedger({ members, expenses, settlements }: GroupLedgerInput): GroupLedger {
  const resolve = makeResolver(members);
  const memberIds = new Set(members.map((m) => m.id));
  const nets = new Map<string, number>(members.map((m) => [m.id, 0]));
  const pairs = new PairBook();
  const former = new Set<string>();
  const bump = (id: string, cents: number) => nets.set(id, (nets.get(id) ?? 0) + cents);

  for (const expense of expenses) {
    const payer = resolve(expense.paidBy);
    if (!payer) continue;
    if (!memberIds.has(payer)) former.add(payer);
    for (const [id, share] of expenseShares(expense, resolve)) {
      if (!memberIds.has(id)) former.add(id);
      if (id === payer || share === 0) continue;
      bump(id, -share);
      bump(payer, share);
      pairs.add(id, payer, share);
    }
  }

  const ignoredSettlements: LedgerSettlement[] = [];
  for (const s of settlements) {
    if (s.status && s.status !== "confirmed") continue;
    if (!memberIds.has(s.fromMemberId) || !memberIds.has(s.toMemberId)) {
      ignoredSettlements.push(s);
      continue;
    }
    const cents = toCents(s.amount);
    // "from" paid "to": from's debt shrinks.
    bump(s.fromMemberId, cents);
    bump(s.toMemberId, -cents);
    pairs.add(s.fromMemberId, s.toMemberId, -cents);
  }

  return {
    nets,
    pairwise: pairs.debts(),
    simplified: simplifyDebts(nets),
    ignoredSettlements,
    formerMembers: [...former],
  };
}

/**
 * Greedy debt simplification: the biggest debtor pays the biggest creditor until one is square.
 * Settles n people in at most n − 1 payments.
 */
export function simplifyDebts(nets: Map<string, number>): Debt[] {
  const creditors = [...nets].filter(([, c]) => c > 0).map(([id, c]) => ({ id, c })).sort((a, b) => b.c - a.c || a.id.localeCompare(b.id));
  const debtors = [...nets].filter(([, c]) => c < 0).map(([id, c]) => ({ id, c: -c })).sort((a, b) => b.c - a.c || a.id.localeCompare(b.id));
  const out: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].c, creditors[j].c);
    if (pay > 0) out.push({ from: debtors[i].id, to: creditors[j].id, cents: pay });
    debtors[i].c -= pay;
    creditors[j].c -= pay;
    if (debtors[i].c === 0) i++;
    if (creditors[j].c === 0) j++;
  }
  return out;
}

/** What the group page should list: simplified when the group's "Simplify debts" setting is on. */
export function debtsToShow(ledger: GroupLedger, simplify: boolean): Debt[] {
  return simplify ? ledger.simplified : ledger.pairwise;
}
