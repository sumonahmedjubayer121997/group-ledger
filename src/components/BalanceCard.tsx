import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LitPanel } from "@/components/fx/LitPanel";
import { glass, glassRow } from "@/components/fx/glass";
import { useAppActions } from "@/app/appActions";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/money";
import { debtAge, isOldDebt } from "@/lib/dates";
import { cn } from "@/lib/utils";
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

type Side = "owed" | "owes" | "other";

/** The other person's initial, ringed green when they owe you and amber when you owe them. */
const PersonMark = ({ person, side }: { person: DebtView["fromPerson"]; side: Side }) => (
  <span
    aria-hidden="true"
    className={cn(
      "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--fx-surface)] text-sm font-medium shadow-[inset_0_1px_0_var(--fx-rim-hi)]",
      side === "owed" ? "border-2 border-settled" : side === "owes" ? "border-2 border-owes" : "border border-[color:var(--fx-rim)]",
      person.isFormer && "border-dashed text-muted-foreground"
    )}
  >
    {(person.name.trim()[0] || "?").toUpperCase()}
  </span>
);

/** Who owes whom, one line per debt, each with "Mark as paid". Sentences about you say "you". */
export const BalanceCard: React.FC<BalanceCardProps> = ({ debts, showGroupName = false, note, bare = false, title = "Balances" }) => {
  const { openSettle } = useAppActions();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const titleId = React.useId();
  const sideOf = (debt: DebtView): Side => (debt.to === user?.uid ? "owed" : debt.from === user?.uid ? "owes" : "other");
  // Seen from your side: green when you're owed, amber when you owe, plain otherwise.
  const toneText: Record<Side, string> = { owed: "text-settled", owes: "text-owes", other: "text-foreground" };

  const list =
    debts.length === 0 ? (
      <div className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground", glass)}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-settled/10 text-settled" aria-hidden="true">
          <Check className="h-4 w-4" />
        </span>
        Everyone's settled up.
      </div>
    ) : (
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {debts.map((debt, i) => {
            const side = sideOf(debt);
            return (
              // A paid debt fades out and the rest close up; new ones slide in.
              <motion.li
                key={`${debt.groupId}-${debt.from}-${debt.to}`}
                layout={reduce ? false : "position"}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                transition={{ duration: 0.28, delay: Math.min(i, 6) * 0.04 }}
              >
                <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:flex-nowrap", glassRow)}>
                  <PersonMark person={side === "owes" ? debt.toPerson : debt.fromPerson} side={side} />
                  <div className="min-w-0 flex-1">
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
                    {/* Which group, and how long it has been open; a month or more is called out. */}
                    {(showGroupName || debt.since) && (
                      <p className="text-xs text-muted-foreground sm:truncate">
                        {showGroupName && debt.groupName}
                        {showGroupName && debt.since && " · "}
                        {debt.since && <span className={isOldDebt(debt.since) ? "text-owes" : undefined}>{debtAge(debt.since)}</span>}
                      </p>
                    )}
                  </div>
                  {/* On phones the amount and button get their own line under the sentence, so it keeps its room. */}
                  <div className="flex w-full items-center justify-between gap-3 pl-12 sm:w-auto sm:shrink-0 sm:pl-0">
                    <span className={cn("money font-medium", toneText[side])}>{formatMoney(debt.cents, debt.currency)}</span>
                    {!debt.fromPerson.isFormer && !debt.toPerson.isFormer && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-3.5"
                        onClick={() => openSettle(debt)}
                        aria-label={`Mark as paid: ${debt.fromPerson.name} paid ${debt.toPerson.name} ${formatMoney(debt.cents, debt.currency)}`}
                      >
                        Mark as paid
                      </Button>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    );

  if (bare) return list;

  // The card takes the colour of your side: amber while you owe anyone, green while you're only owed.
  const tone = debts.some((d) => d.from === user?.uid) ? "owes" : debts.some((d) => d.to === user?.uid) ? "settled" : "plain";
  return (
    <LitPanel tone={tone} light="top-right" aria-labelledby={titleId}>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <CardTitle id={titleId} className="text-xl">
          {title}
        </CardTitle>
        {debts.length > 0 && <span className="text-sm text-muted-foreground">{debts.length} open</span>}
      </div>
      <div className="p-3 pt-4 sm:p-4">
        {list}
        {note && <p className="mt-3 px-2 text-xs text-muted-foreground">{note}</p>}
      </div>
    </LitPanel>
  );
};
