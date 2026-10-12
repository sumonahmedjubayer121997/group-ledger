/** The hero's "debt web": four friends after a trip, the debts between them, and the fewest payments that settle them. */

export type PersonId = "tara" | "rafi" | "sumon" | "nadia";
export type Debt = { from: PersonId; to: PersonId; amount: number };
export type Stage = "tangled" | "simplified" | "settled";

export type LabelSide = "top" | "bottom" | "left" | "right";

/** Each name sits on the outside of the web, away from the links. */
export const people: { id: PersonId; name: string; home: [number, number, number]; label: LabelSide }[] = [
  { id: "tara", name: "Tara", home: [2.3, 0.3, 0], label: "right" },
  { id: "rafi", name: "Rafi", home: [-0.1, 1.7, -0.4], label: "top" },
  { id: "sumon", name: "Sumon", home: [-0.3, -1.5, 0.3], label: "bottom" },
  { id: "nadia", name: "Nadia", home: [-2.3, 0.2, 0], label: "left" },
];

export const indexOf = (id: PersonId) => people.findIndex((p) => p.id === id);

/** Every pair owes something: six debts in taka. */
export const rawDebts: Debt[] = [
  { from: "nadia", to: "tara", amount: 900 },
  { from: "sumon", to: "tara", amount: 1200 },
  { from: "rafi", to: "tara", amount: 1350 },
  { from: "nadia", to: "rafi", amount: 900 },
  { from: "sumon", to: "rafi", amount: 300 },
  { from: "nadia", to: "sumon", amount: 750 },
];

export function netBalances(debts: Debt[]): Record<PersonId, number> {
  const nets = Object.fromEntries(people.map((p) => [p.id, 0])) as Record<PersonId, number>;
  for (const d of debts) {
    nets[d.from] -= d.amount;
    nets[d.to] += d.amount;
  }
  return nets;
}

/**
 * Greedy debt simplification: the biggest debtor pays the biggest creditor until one of them is square,
 * then repeat. Settles n people in at most n − 1 payments.
 */
export function simplifyDebts(nets: Record<PersonId, number>): Debt[] {
  const creditors = people
    .map((p) => ({ id: p.id, amount: nets[p.id] }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const debtors = people
    .map((p) => ({ id: p.id, amount: -nets[p.id] }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const payments: Debt[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const pay = Math.min(creditors[c].amount, debtors[d].amount);
    payments.push({ from: debtors[d].id, to: creditors[c].id, amount: pay });
    creditors[c].amount -= pay;
    debtors[d].amount -= pay;
    if (creditors[c].amount === 0) c++;
    if (debtors[d].amount === 0) d++;
  }
  return payments;
}

export const nets = netBalances(rawDebts);
export const simplifiedDebts = simplifyDebts(nets);

export function debtsFor(stage: Stage): Debt[] {
  if (stage === "tangled") return rawDebts;
  if (stage === "simplified") return simplifiedDebts;
  return [];
}

export const pairKey = (a: PersonId, b: PersonId) => [a, b].sort().join("-");

/** Every pair that ever carries a link, so links can morph between stages instead of popping in and out. */
export const pairs: { a: PersonId; b: PersonId; key: string }[] = Array.from(
  new Map([...rawDebts, ...simplifiedDebts].map((d) => [pairKey(d.from, d.to), d])).values(),
).map((d) => ({ a: d.from, b: d.to, key: pairKey(d.from, d.to) }));

/** Where along each link its amount label sits (0 = debtor, 1 = creditor), chosen so labels don't collide. */
export const labelAt: Record<string, number> = {
  [pairKey("nadia", "tara")]: 0.62,
  [pairKey("sumon", "tara")]: 0.5,
  [pairKey("rafi", "tara")]: 0.5,
  [pairKey("nadia", "rafi")]: 0.5,
  [pairKey("sumon", "rafi")]: 0.3,
  [pairKey("nadia", "sumon")]: 0.5,
};

export const maxAmount = Math.max(...rawDebts.map((d) => d.amount), ...simplifiedDebts.map((d) => d.amount));
export const maxNet = Math.max(...people.map((p) => Math.abs(nets[p.id])));

export const debtFor = (stage: Stage, key: string) => debtsFor(stage).find((d) => pairKey(d.from, d.to) === key) ?? null;
