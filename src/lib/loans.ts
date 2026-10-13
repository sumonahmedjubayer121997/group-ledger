/**
 * Personal loans: money you lent to someone or borrowed from someone outside any group. Private to
 * you (users/{uid}/loans). Amounts are whole cents in one currency per loan; paying back can happen
 * in parts.
 */

export type LoanDirection = "lent" | "borrowed";

export type Repayment = { id: string; amountCents: number; date: Date; note: string };

export type Loan = {
  id: string;
  direction: LoanDirection;
  /** Who it's with, as you'd say it ("Rahim", "Mum"). */
  person: string;
  /** Set when that person is in one of your groups, so their page can show the loan too. */
  personId: string | null;
  amountCents: number;
  currency: string;
  date: Date;
  dueDate: Date | null;
  note: string;
  repayments: Repayment[];
};

export type LoanBalance = { repaidCents: number; remainingCents: number; settled: boolean };

export function loanBalance(loan: Pick<Loan, "amountCents" | "repayments">): LoanBalance {
  const repaidCents = loan.repayments.reduce((sum, r) => sum + r.amountCents, 0);
  const remainingCents = Math.max(0, loan.amountCents - repaidCents);
  return { repaidCents, remainingCents, settled: remainingCents === 0 };
}

/** What's still open, per currency (never added across currencies). */
export function loanTotals(loans: Loan[]): { owedToYou: Map<string, number>; youOwe: Map<string, number>; open: number } {
  const owedToYou = new Map<string, number>();
  const youOwe = new Map<string, number>();
  let open = 0;
  for (const loan of loans) {
    const { remainingCents } = loanBalance(loan);
    if (remainingCents === 0) continue;
    open += 1;
    const into = loan.direction === "lent" ? owedToYou : youOwe;
    into.set(loan.currency, (into.get(loan.currency) ?? 0) + remainingCents);
  }
  return { owedToYou, youOwe, open };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Past its due date (the due day itself still counts as on time) and not paid back. */
export const isOverdue = (loan: Loan, now = new Date()) =>
  !!loan.dueDate && !loanBalance(loan).settled && startOfDay(loan.dueDate) < startOfDay(now);

/** Open loans first (soonest due, then newest), then paid-back ones, newest first. */
export function sortLoans(loans: Loan[]): Loan[] {
  const due = (l: Loan) => l.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...loans].sort((a, b) => {
    const sa = loanBalance(a).settled;
    const sb = loanBalance(b).settled;
    if (sa !== sb) return sa ? 1 : -1;
    if (!sa && due(a) !== due(b)) return due(a) - due(b);
    return b.date.getTime() - a.date.getTime();
  });
}
