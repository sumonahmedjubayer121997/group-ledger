import { toCents } from "./currency";

/**
 * Checks and prepares what the add/edit expense forms save, so a split always adds up to the bill.
 */

export type SplitMode = "equal" | "exact" | "percentage";

export type SplitCheck = { ok: boolean; message?: string };

export function checkSplit(
  mode: SplitMode,
  amount: number,
  values: Record<string, number>,
  participantIds: string[],
): SplitCheck {
  const total = toCents(amount);
  if (total <= 0) return { ok: false, message: "Enter an amount greater than zero." };
  if (participantIds.length === 0) return { ok: false, message: "Choose at least one person to split with." };
  if (mode === "equal") return { ok: true };

  if (mode === "percentage") {
    const sum = participantIds.reduce((s, id) => s + (Number(values[id]) || 0), 0);
    if (Math.abs(sum - 100) > 0.001) {
      return { ok: false, message: `Percentages add up to ${Number(sum.toFixed(2))}%. They need to make 100%.` };
    }
    return { ok: true };
  }

  const sum = participantIds.reduce((s, id) => s + toCents(values[id] ?? 0), 0);
  if (sum !== total) {
    const diff = Math.abs(total - sum) / 100;
    return {
      ok: false,
      message: sum < total ? `${diff.toFixed(2)} still to assign.` : `${diff.toFixed(2)} more than the bill.`,
    };
  }
  return { ok: true };
}

/**
 * What to store for a split. Percent splits are saved as amounts (version 2) plus the percentages for
 * display, so the balance engine never has to guess whether a number is a percent or money.
 */
export function splitFieldsToSave(
  mode: SplitMode,
  amount: number,
  values: Record<string, number>,
  participantIds: string[],
  payerId: string,
): { splitData?: Record<string, number>; splitPercentages?: Record<string, number>; splitVersion?: number } {
  if (mode === "equal") return {};
  if (mode === "exact") {
    return {
      splitData: Object.fromEntries(participantIds.map((id) => [id, toCents(values[id] ?? 0) / 100])),
      splitVersion: 2,
    };
  }
  const total = toCents(amount);
  const cents = new Map(participantIds.map((id) => [id, Math.floor((total * (Number(values[id]) || 0)) / 100)]));
  let left = total - [...cents.values()].reduce((s, c) => s + c, 0);
  const order = participantIds.includes(payerId) ? [payerId] : participantIds;
  for (let i = 0; left > 0 && order.length > 0; i++, left--) {
    const id = order[i % order.length];
    cents.set(id, (cents.get(id) ?? 0) + 1);
  }
  return {
    splitData: Object.fromEntries([...cents].map(([id, c]) => [id, c / 100])),
    splitPercentages: Object.fromEntries(participantIds.map((id) => [id, Number(values[id]) || 0])),
    splitVersion: 2,
  };
}
