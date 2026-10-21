import { ArrowRight, Banknote } from "lucide-react";
import { TiltCard } from "@/components/fx/TiltCard";
import { loanTotals } from "@/lib/loans";
import { formatTotals } from "@/lib/money";
import { useLoanStore } from "@/stores/loanStore";

/** A small card on the overview while any personal loan is still open; it opens Personal. */
export function LoansSummary() {
  const loans = useLoanStore((s) => s.loans);
  const { owedToYou, youOwe, open } = loanTotals(loans);
  if (open === 0) return null;
  return (
    <TiltCard to="/personal" tone={youOwe.size ? "owes" : "settled"} light="top-left" max={3} bodyClassName="mt-0 flex flex-1 flex-col p-4 sm:p-5 md:p-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Banknote className="h-4 w-4" aria-hidden="true" />
        Personal loans
      </p>
      <div className="mt-2 space-y-1">
        {owedToYou.size > 0 && (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="money font-display text-[26px] leading-tight text-settled">{formatTotals(owedToYou)}</span>
            <span className="text-xs text-muted-foreground">people owe you</span>
          </p>
        )}
        {youOwe.size > 0 && (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="money font-display text-[26px] leading-tight text-owes">{formatTotals(youOwe)}</span>
            <span className="text-xs text-muted-foreground">you owe</span>
          </p>
        )}
      </div>
      <p className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium">
        {open} open {open === 1 ? "loan" : "loans"}
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/fx:translate-x-0.5" aria-hidden="true" />
      </p>
    </TiltCard>
  );
}
