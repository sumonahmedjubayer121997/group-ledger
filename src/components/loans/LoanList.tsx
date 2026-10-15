import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, CircleCheck, History, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/dates";
import { isOverdue, loanBalance, sortLoans, type Loan } from "@/lib/loans";
import { formatMoney } from "@/lib/money";
import { deferWithUndo, doneWithUndo, useHidden } from "@/lib/undo";
import { cn } from "@/lib/utils";
import { deleteLoan, saveLoan } from "@/services/loans";
import { LoanForm } from "./LoanForm";
import { RepaymentDialog } from "./RepaymentDialog";

const Who = ({ loan }: { loan: Loan }) =>
  loan.personId ? (
    <Link to={`/people/${loan.personId}`} className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {loan.person}
    </Link>
  ) : (
    <span className="font-medium">{loan.person}</span>
  );

/** One sentence from your side: "Rahim owes you ৳3,000", "You owe Anik £200", "Rahim paid you back ৳5,000". */
function Headline({ loan }: { loan: Loan }) {
  const { remainingCents, settled } = loanBalance(loan);
  const money = (cents: number, tone?: string) => <span className={cn("money font-medium", tone)}>{formatMoney(cents, loan.currency)}</span>;
  if (loan.direction === "lent") {
    return settled ? (
      <>
        <Who loan={loan} /> paid you back {money(loan.amountCents)}
      </>
    ) : (
      <>
        <Who loan={loan} /> owes you {money(remainingCents, "text-settled")}
      </>
    );
  }
  return settled ? (
    <>
      You paid <Who loan={loan} /> back {money(loan.amountCents)}
    </>
  ) : (
    <>
      You owe <Who loan={loan} /> {money(remainingCents, "text-owes")}
    </>
  );
}

function LoanRow({ loan }: { loan: Loan }) {
  const { user } = useAuth();
  const [repaying, setRepaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { repaidCents, remainingCents, settled } = loanBalance(loan);
  const overdue = isOverdue(loan);
  const { id, ...rest } = loan;

  const details = [
    `${loan.direction === "lent" ? "Lent" : "Borrowed"} ${formatMoney(loan.amountCents, loan.currency)} · ${formatDate(loan.date)}`,
    !settled && repaidCents > 0 ? `${formatMoney(repaidCents, loan.currency)} paid back` : "",
    !settled && loan.dueDate && !overdue ? `due ${formatDate(loan.dueDate)}` : "",
  ].filter(Boolean);

  const paidInFull = () => {
    if (!user) return;
    const before = loan.repayments;
    void saveLoan(user.uid, id, {
      ...rest,
      repayments: [...before, { id: crypto.randomUUID(), amountCents: remainingCents, date: new Date(), note: "" }],
    })
      .then(() =>
        doneWithUndo({
          title: loan.direction === "lent" ? `${loan.person} paid you back` : `You paid ${loan.person} back`,
          description: "Marked as paid back in full.",
          undo: () => saveLoan(user.uid, id, { ...rest, repayments: before }),
        })
      )
      .catch(() => undefined);
  };

  const removeRepayment = (repaymentId: string) => {
    if (!user) return;
    const before = loan.repayments;
    void saveLoan(user.uid, id, { ...rest, repayments: before.filter((r) => r.id !== repaymentId) })
      .then(() =>
        doneWithUndo({ title: "Payment removed", undo: () => saveLoan(user.uid, id, { ...rest, repayments: before }) })
      )
      .catch(() => undefined);
  };

  const remove = () => {
    if (!user) return;
    deferWithUndo({
      id: `loan-${id}`,
      title: `Deleted the loan with ${loan.person}`,
      run: () => deleteLoan(user.uid, id),
    });
  };

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[15px]", settled && "text-muted-foreground")}>
            <Headline loan={loan} />
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {details.join(" · ")}
            {overdue && loan.dueDate && <span className="text-owes"> · overdue since {formatDate(loan.dueDate)}</span>}
          </p>
          {loan.note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{loan.note}</p>}
        </div>
        {!settled && (
          <Button size="sm" variant="outline" onClick={() => setRepaying(true)}>
            Paid back
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={`More for the loan with ${loan.person}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!settled && (
              <DropdownMenuItem onSelect={paidInFull}>
                <CircleCheck aria-hidden="true" />
                Paid back in full
              </DropdownMenuItem>
            )}
            {loan.repayments.length > 0 && (
              <DropdownMenuItem onSelect={() => setHistoryOpen((v) => !v)}>
                <History aria-hidden="true" />
                {historyOpen ? "Hide payments" : `Payments (${loan.repayments.length})`}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={remove} className="text-destructive focus:text-destructive">
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {historyOpen && loan.repayments.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg bg-secondary/50 p-2 text-sm" aria-label={`Payments for the loan with ${loan.person}`}>
          {[...loan.repayments]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="money font-medium">{formatMoney(r.amountCents, loan.currency)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {formatDate(r.date)}
                  {r.note ? ` · ${r.note}` : ""}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => removeRepayment(r.id)}
                  aria-label={`Remove the ${formatMoney(r.amountCents, loan.currency)} payment`}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
        </ul>
      )}

      {repaying && <RepaymentDialog loan={loan} open={repaying} onOpenChange={setRepaying} />}
      {editing && <LoanForm loan={loan} open={editing} onOpenChange={setEditing} />}
    </li>
  );
}

/** Open loans, then the paid-back ones folded away. */
export function LoanList({ loans, emptyText }: { loans: Loan[]; emptyText: string }) {
  const hidden = useHidden((s) => s.hidden);
  const visible = sortLoans(loans.filter((l) => !hidden.has(`loan-${l.id}`)));
  const open = visible.filter((l) => !loanBalance(l).settled);
  const done = visible.filter((l) => loanBalance(l).settled);

  if (visible.length === 0) return <p className="py-6 text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div>
      {open.length > 0 ? (
        <ul className="divide-y">
          {open.map((loan) => (
            <LoanRow key={loan.id} loan={loan} />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-sm text-muted-foreground">Everything's been paid back.</p>
      )}
      {done.length > 0 && (
        <Collapsible className="mt-2 border-t pt-2">
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
            Paid back ({done.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y">
              {done.map((loan) => (
                <LoanRow key={loan.id} loan={loan} />
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
