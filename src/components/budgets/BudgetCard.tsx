import { motion, useReducedMotion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { glassRow } from "@/components/fx/glass";
import { Button } from "@/components/ui/button";
import { formatMoney, toCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Budget } from "@/stores/budgetStore";

export type BudgetStatus = "on-track" | "near" | "over";

export const budgetStatus = (spentCents: number, budget: Budget): BudgetStatus => {
  const limit = toCents(budget.limit);
  if (limit > 0 && spentCents > limit) return "over";
  if (limit > 0 && (spentCents / limit) * 100 >= (budget.alertThreshold || 80)) return "near";
  return "on-track";
};

const statusLabel: Record<BudgetStatus, string> = { "on-track": "On track", near: "Near limit", over: "Over budget" };
const statusTone: Record<BudgetStatus, string> = {
  "on-track": "bg-settled/10 text-settled",
  near: "bg-owes/10 text-owes",
  over: "bg-destructive/10 text-destructive",
};
const barTone: Record<BudgetStatus, string> = { "on-track": "bg-settled", near: "bg-owes", over: "bg-destructive" };

interface BudgetCardProps {
  budget: Budget;
  spentCents: number;
  currency: string;
  /** Under the name, e.g. "Groceries · monthly" or "Your share in GBP groups". */
  detail: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** One budget: how much is spent of the limit, with a status and a progress bar. */
export function BudgetCard({ budget, spentCents, currency, detail, onEdit, onDelete }: BudgetCardProps) {
  const limit = toCents(budget.limit);
  const status = budgetStatus(spentCents, budget);
  const percent = limit > 0 ? Math.round((spentCents / limit) * 100) : 0;
  const left = limit - spentCents;
  const reduce = useReducedMotion();

  return (
    <li className={cn("p-4", glassRow)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{budget.name}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusTone[status])}>{statusLabel[status]}</span>
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={`Edit ${budget.name}`}>
              <Pencil aria-hidden="true" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} aria-label={`Delete ${budget.name}`}>
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
        <span className="money">
          <span className="font-medium">{formatMoney(spentCents, currency)}</span>
          <span className="text-muted-foreground"> of {formatMoney(limit, currency)}</span>
        </span>
        <span className={cn("money text-xs", left < 0 ? "text-destructive" : "text-muted-foreground")}>
          {left < 0 ? `${formatMoney(-left, currency)} over` : `${formatMoney(left, currency)} left`}
        </span>
      </div>
      <div
        className="mt-2 h-2 rounded-full bg-secondary"
        role="progressbar"
        aria-label={`${budget.name}: ${percent}% used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
      >
        {/* Fills to the amount spent when it first shows. */}
        <motion.div
          className={cn("h-2 rounded-full", barTone[status])}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(percent, 2))}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      </div>
    </li>
  );
}
