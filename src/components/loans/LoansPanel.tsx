import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loanTotals } from "@/lib/loans";
import { formatMoney } from "@/lib/money";
import { useHidden } from "@/lib/undo";
import { useLoanStore } from "@/stores/loanStore";
import { LoanForm } from "./LoanForm";
import { LoanList } from "./LoanList";

function Totals({ label, totals, tone }: { label: string; totals: Map<string, number>; tone: "settled" | "owes" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        {totals.size === 0 ? (
          <p className="mt-1 font-display text-[28px] leading-tight text-muted-foreground">Nothing</p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {[...totals].map(([currency, cents]) => (
              <li key={currency} className={`money font-display text-[28px] leading-tight ${tone === "settled" ? "text-settled" : "text-owes"}`}>
                {formatMoney(cents, currency)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Money you lent or borrowed outside your groups: what's still owed each way, and every loan. */
export function LoansPanel() {
  const loans = useLoanStore((s) => s.loans);
  const loaded = useLoanStore((s) => s.loaded);
  const failed = useLoanStore((s) => s.failed);
  const hidden = useHidden((s) => s.hidden);
  const [adding, setAdding] = useState(false);
  const [params, setParams] = useSearchParams();

  // ?add=loan (from the command bar) opens the form once.
  useEffect(() => {
    if (params.get("add") !== "loan") return;
    setAdding(true);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("add");
        return next;
      },
      { replace: true }
    );
  }, [params, setParams]);

  const totals = loanTotals(loans.filter((l) => !hidden.has(`loan-${l.id}`)));

  return (
    <div className="space-y-6">
      <section aria-label="Loan totals" className="grid gap-4 sm:grid-cols-2">
        <Totals label="People owe you" totals={totals.owedToYou} tone="settled" />
        <Totals label="You owe" totals={totals.youOwe} tone="owes" />
      </section>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-display text-[22px] leading-tight">Loans</h2>
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" />
              Add loan
            </Button>
          </div>
          {!loaded ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : failed ? (
            <p className="py-6 text-sm text-destructive">Couldn't load your loans. Check your connection and reload.</p>
          ) : (
            <LoanList loans={loans} emptyText="No loans yet. Keep track of money you lend or borrow outside your groups; only you can see them." />
          )}
        </CardContent>
      </Card>

      {adding && <LoanForm open={adding} onOpenChange={setAdding} />}
    </div>
  );
}
