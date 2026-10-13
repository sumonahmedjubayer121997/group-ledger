import { Link } from "react-router-dom";
import { Banknote, ChevronRight } from "lucide-react";
import { loanTotals } from "@/lib/loans";
import { formatTotals } from "@/lib/money";
import { useLoanStore } from "@/stores/loanStore";

/** One line on the overview while any personal loan is still open. */
export function LoansSummary() {
  const loans = useLoanStore((s) => s.loans);
  const { owedToYou, youOwe, open } = loanTotals(loans);
  if (open === 0) return null;
  const parts = [
    owedToYou.size ? `people owe you ${formatTotals(owedToYou)}` : "",
    youOwe.size ? `you owe ${formatTotals(youOwe)}` : "",
  ].filter(Boolean);
  const text = parts.join("; ");
  return (
    <Link
      to="/personal"
      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">Personal loans:</span> <span className="money">{text.charAt(0).toUpperCase() + text.slice(1)}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
