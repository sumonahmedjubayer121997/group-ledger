import { simplifyDebts } from "@/lib/money/ledger";

/**
 * The hero's sample trip: four friends after a weekend in Sylhet, the debts between them, and the
 * fewest payments that settle them, worked out by the app's own engine (simplifyDebts).
 */

export type PersonId = "laili" | "happy" | "sumon" | "popy";
export type HeroDebt = { from: PersonId; to: PersonId; amount: number };
export type Stage = "tangled" | "simplified" | "settled";

/** Where each person sits in the drawing (a 320×206 box), and where their name goes. */
export const people: { id: PersonId; name: string; x: number; y: number; nameAt: "above" | "below" }[] = [
  { id: "happy", name: "Happy", x: 160, y: 40, nameAt: "above" },
  { id: "laili", name: "Laili", x: 262, y: 104, nameAt: "below" },
  { id: "sumon", name: "Sumon", x: 160, y: 166, nameAt: "below" },
  { id: "popy", name: "Popy", x: 58, y: 104, nameAt: "below" },
];

export const personOf = (id: PersonId) => people.find((p) => p.id === id)!;

/** Every pair owes something: six debts in taka. */
export const rawDebts: HeroDebt[] = [
  { from: "popy", to: "laili", amount: 900 },
  { from: "sumon", to: "laili", amount: 1200 },
  { from: "happy", to: "laili", amount: 1350 },
  { from: "popy", to: "happy", amount: 900 },
  { from: "sumon", to: "happy", amount: 300 },
  { from: "popy", to: "sumon", amount: 750 },
];

const nets = new Map<string, number>(people.map((p) => [p.id, 0]));
for (const d of rawDebts) {
  nets.set(d.from, (nets.get(d.from) ?? 0) - d.amount);
  nets.set(d.to, (nets.get(d.to) ?? 0) + d.amount);
}
/** Positive: owed money. Negative: owes. */
export const netOf = (id: PersonId) => nets.get(id) ?? 0;

/** The fewest payments that settle everyone (three, all to Laili). */
export const payments: HeroDebt[] = simplifyDebts(nets).map((d) => ({ from: d.from as PersonId, to: d.to as PersonId, amount: d.cents }));

export const debtsFor = (stage: Stage): HeroDebt[] => (stage === "tangled" ? rawDebts : stage === "simplified" ? payments : []);

export const pairKey = (a: PersonId, b: PersonId) => [a, b].sort().join("-");

/** Where along each line its amount sits (0 = debtor, 1 = creditor), so the labels don't collide. */
export const labelAt: Record<string, number> = {
  [pairKey("popy", "laili")]: 0.7,
  [pairKey("sumon", "laili")]: 0.55,
  [pairKey("happy", "laili")]: 0.5,
  [pairKey("popy", "happy")]: 0.5,
  [pairKey("sumon", "happy")]: 0.28,
  [pairKey("popy", "sumon")]: 0.5,
};

/** This month against last, per person (made up, for the dial). Negative: spent less. */
export const spending: Record<PersonId, number> = { laili: -21, happy: 8, popy: -34, sumon: 12 };
