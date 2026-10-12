import React, { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettlementDialog } from "./SettlementDialog";
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

const nameOf = (person: DebtView["fromPerson"]) => `${person.name}${person.isFormer ? " (left)" : ""}`;

/** Who owes whom, one line per debt, each with a "Settle up" button. */
export const BalanceCard: React.FC<BalanceCardProps> = ({ debts, showGroupName = false, note, bare = false, title = "Balances" }) => {
  const [selected, setSelected] = useState<DebtView | null>(null);
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
                <span className="font-medium">{nameOf(debt.fromPerson)}</span>
                <span className="text-muted-foreground"> owes </span>
                <span className="font-medium">{nameOf(debt.toPerson)}</span>
              </p>
              {showGroupName && <p className="truncate text-xs text-muted-foreground">{debt.groupName}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`money font-medium ${tone(debt)}`}>{formatMoney(debt.cents, debt.currency)}</span>
              {!debt.fromPerson.isFormer && !debt.toPerson.isFormer && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(debt)}
                  aria-label={`Settle up: ${debt.fromPerson.name} pays ${debt.toPerson.name} ${formatMoney(debt.cents, debt.currency)}`}
                >
                  Settle up
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

      {selected && (
        <SettlementDialog
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          fromMember={{ id: selected.from, userId: selected.from, name: selected.fromPerson.name, email: selected.fromPerson.email ?? "" }}
          toMember={{ id: selected.to, userId: selected.to, name: selected.toPerson.name, email: selected.toPerson.email ?? "" }}
          amount={selected.cents / 100}
          currency={selected.currency}
          groupId={selected.groupId}
        />
      )}
    </>
  );
};
