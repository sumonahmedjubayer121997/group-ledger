import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppActions } from "@/app/appActions";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/money";
import type { DebtView } from "@/stores/useLedger";

interface BalanceCardProps {
  debts: DebtView[];
  /** On the dashboard, debts come from several groups. */
  showGroupName?: boolean;
  /** Extra line under the list, e.g. settlements that couldn't be counted. */
  note?: string;
  /** Without the card frame, e.g. inside a dialog. */
  bare?: boolean;
  title?: string;
}

const nameOf = (person: DebtView["fromPerson"]) => `${person.name.trim().split(/\s+/)[0] || person.name}${person.isFormer ? " (left)" : ""}`;

/** A name that opens everything between you and that person. */
const PersonName = ({ person }: { person: DebtView["fromPerson"] }) =>
  person.isFormer ? (
    <span className="font-medium">{nameOf(person)}</span>
  ) : (
    <Link to={`/people/${person.id}`} className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {nameOf(person)}
    </Link>
  );

/** Who owes whom, one line per debt, each with "Mark as paid". Sentences about you say "you". */
export const BalanceCard: React.FC<BalanceCardProps> = ({ debts, showGroupName = false, note, bare = false, title = "Balances" }) => {
  const { openSettle } = useAppActions();
  const { user } = useAuth();
  // Seen from your side: green when you're owed, amber when you owe, plain otherwise.
  const tone = (debt: DebtView) => (debt.to === user?.uid ? "text-settled" : debt.from === user?.uid ? "text-owes" : "text-foreground");

  const list =
    debts.length === 0 ? (
      <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-settled/10 text-settled" aria-hidden="true">
          <Check className="h-4 w-4" />
        </span>
        Everyone's settled up.
      </div>
    ) : (
      <ul className="divide-y">
        {debts.map((debt) => (
          <li key={`${debt.groupId}-${debt.from}-${debt.to}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm">
                {debt.from === user?.uid ? (
                  <>
                    You <span className="text-muted-foreground">owe</span> <PersonName person={debt.toPerson} />
                  </>
                ) : (
                  <>
                    <PersonName person={debt.fromPerson} />
                    <span className="text-muted-foreground"> owes </span>
                    {debt.to === user?.uid ? <span className="font-medium">you</span> : <PersonName person={debt.toPerson} />}
                  </>
                )}
              </p>
              {showGroupName && <p className="truncate text-xs text-muted-foreground">{debt.groupName}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`money font-medium ${tone(debt)}`}>{formatMoney(debt.cents, debt.currency)}</span>
              {!debt.fromPerson.isFormer && !debt.toPerson.isFormer && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openSettle(debt)}
                  aria-label={`Mark as paid: ${debt.fromPerson.name} paid ${debt.toPerson.name} ${formatMoney(debt.cents, debt.currency)}`}
                >
                  Mark as paid
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      {bare ? (
        list
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {list}
            {note && <p className="mt-4 text-xs text-muted-foreground">{note}</p>}
          </CardContent>
        </Card>
      )}

    </>
  );
};
