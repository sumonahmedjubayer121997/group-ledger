import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/BalanceCard";
import { LoanList } from "@/components/loans/LoanList";
import { useLoanStore } from "@/stores/loanStore";
import { ExpenseList } from "@/components/ExpenseList";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore, type Expense } from "@/stores/expenseStore";
import { useUserBalances } from "@/stores/useLedger";
import { formatMoney } from "@/lib/money";

const involves = (e: Expense, ids: Set<string>) => ids.has(e.paidBy?.id ?? "") || !!e.splitAmong?.some((m) => ids.has(m.id));
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const joinAnd = (parts: string[]) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);

/** Everything between you and one person: what's owed (per currency, never added together), shared groups and expenses. */
export default function PersonPage() {
  const { personId = "" } = useParams();
  const { user } = useAuth();
  const groups = useExpenseStore((s) => s.groups);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const expenses = useExpenseStore((s) => s.expenses);
  const balances = useUserBalances(user?.uid);
  const allLoans = useLoanStore((s) => s.loans);
  const me = user?.uid ?? "";

  const person = useMemo(() => {
    for (const g of groups) {
      const m = g.members.find((x) => x.id === personId);
      if (m) return m;
    }
    return null;
  }, [groups, personId]);
  // The same person can have another id in another group (e.g. added by email before they signed up).
  const ids = useMemo(() => {
    const set = new Set([personId]);
    const email = person?.email?.trim().toLowerCase();
    if (email) for (const g of groups) for (const m of g.members) if (m.email?.trim().toLowerCase() === email && m.id !== me) set.add(m.id);
    return set;
  }, [groups, person, personId, me]);
  const shared = useMemo(
    () => groups.filter((g) => g.members.some((m) => ids.has(m.id)) && g.members.some((m) => m.id === me)),
    [groups, ids, me]
  );

  const debts = useMemo(
    () => balances.debts.filter((d) => (d.from === me && ids.has(d.to)) || (ids.has(d.from) && d.to === me)),
    [balances.debts, me, ids]
  );
  // Per currency: positive means they owe you.
  const nets = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of debts) totals.set(d.currency, (totals.get(d.currency) ?? 0) + (d.to === me ? d.cents : -d.cents));
    return totals;
  }, [debts, me]);

  // Loans you linked to this person (see LoanForm).
  const loans = useMemo(() => allLoans.filter((l) => l.personId && ids.has(l.personId)), [allLoans, ids]);

  const sharedIds = useMemo(() => new Set(shared.map((g) => g.id)), [shared]);
  const between = useMemo(
    () => expenses.filter((e) => sharedIds.has(e.groupId) && involves(e, new Set([me])) && involves(e, ids)),
    [expenses, sharedIds, me, ids]
  );

  if (!groupsLoaded) return <PageSkeleton />;
  if (!person || personId === me) {
    return (
      <>
        <PageHeader back={{ to: "/", label: "Overview" }} title="Not found" />
        <p className="text-sm text-muted-foreground">This person isn't in any of your groups.</p>
      </>
    );
  }

  const name = first(person.name);
  const theyOwe = [...nets].filter(([, c]) => c > 0).map(([cur, c]) => formatMoney(c, cur));
  const youOwe = [...nets].filter(([, c]) => c < 0).map(([cur, c]) => formatMoney(-c, cur));
  const summary =
    theyOwe.length === 0 && youOwe.length === 0
      ? `You're all square with ${name}.`
      : [theyOwe.length ? `${name} owes you ${joinAnd(theyOwe)}` : "", youOwe.length ? `you owe ${name} ${joinAnd(youOwe)}` : ""]
          .filter(Boolean)
          .join("; ")
          .replace(/^./, (c) => c.toUpperCase()) + ".";

  return (
    <>
      <PageHeader
        back={{ to: "/", label: "Overview" }}
        title={person.name.trim()}
        description={`${shared.length} shared ${shared.length === 1 ? "group" : "groups"}${person.email ? ` · ${person.email}` : ""}`}
      />

      <div className="space-y-6">
        <p className="text-[17px]" aria-live="polite">
          {summary}
        </p>

        {debts.length > 0 && <BalanceCard debts={debts} showGroupName title="To settle" />}

        {loans.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Personal loans</CardTitle>
            </CardHeader>
            <CardContent>
              <LoanList loans={loans} emptyText="" />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="min-w-0 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Expenses together</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseList expenses={between} showGroup emptyText={`No expenses with ${name} yet.`} />
            </CardContent>
          </Card>
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Shared groups</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="-mx-2">
                {shared.map((g) => (
                  <li key={g.id}>
                    <Link
                      to={`/groups/${g.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                      {g.isArchived && <span className="text-xs text-muted-foreground">archived</span>}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
