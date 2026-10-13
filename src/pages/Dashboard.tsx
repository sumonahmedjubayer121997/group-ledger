import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Archive, ChevronRight, HandCoins, Plus, QrCode, Receipt, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BalanceCard } from "@/components/BalanceCard";
import { FirstRunChecklist } from "@/components/FirstRunChecklist";
import { LoansSummary } from "@/components/loans/LoansSummary";
import { InstallBanner } from "@/components/InstallBanner";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppActions } from "@/app/appActions";
import { useExpenseStore, type Group } from "@/stores/expenseStore";
import { useCurrencyOf, useUserBalances } from "@/stores/useLedger";
import { formatAmount, formatMoney, formatTotals } from "@/lib/money";
import { formatDate, toDate } from "@/lib/dates";

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** "You're owed" / "You owe": one line per currency, never added together. */
function BalanceStrip({ owedToYou, youOwe }: { owedToYou: Map<string, number>; youOwe: Map<string, number> }) {
  const tile = (label: string, totals: Map<string, number>, tone: "settled" | "owes", empty: string) => (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        {totals.size === 0 ? (
          <p className="mt-2 font-display text-[28px] leading-tight text-muted-foreground">{empty}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {[...totals].map(([currency, cents]) => (
              <li key={currency} className={`money font-display text-[32px] leading-tight sm:text-[36px] ${tone === "settled" ? "text-settled" : "text-owes"}`}>
                {formatMoney(cents, currency)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
  return (
    <section aria-label="Your balance" className="grid gap-4 sm:grid-cols-2">
      {tile("You're owed", owedToYou, "settled", "Nothing")}
      {tile("You owe", youOwe, "owes", "Nothing")}
    </section>
  );
}

function GroupRow({ group, net, currency }: { group: Group; net: number; currency: string }) {
  const expenseCount = useExpenseStore((s) => s.expenses.filter((e) => e.groupId === group.id).length);
  const status =
    net > 0 ? (
      <span className="money text-settled">you're owed {formatMoney(net, currency)}</span>
    ) : net < 0 ? (
      <span className="money text-owes">you owe {formatMoney(-net, currency)}</span>
    ) : (
      <span className="text-muted-foreground">settled up</span>
    );
  return (
    <li>
      <Link
        to={`/groups/${group.id}`}
        className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="h-10 w-10 rounded-lg">
          <AvatarImage src={group.photo || undefined} alt="" className="object-cover" />
          <AvatarFallback className="rounded-lg bg-secondary text-sm font-medium">{initials(group.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{group.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {group.members.length} {group.members.length === 1 ? "person" : "people"} · {expenseCount}{" "}
            {expenseCount === 1 ? "expense" : "expenses"}
          </p>
        </div>
        <p className="hidden shrink-0 text-right text-sm sm:block">{status}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
      <p className="-mt-2 pb-2 pl-[3.75rem] text-sm sm:hidden">{status}</p>
    </li>
  );
}

type ActivityItem = { id: string; kind: "expense" | "payment"; title: string; detail: string; amount: string; at: Date };

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl">Recent activity</CardTitle>
        <Button variant="link" size="sm" asChild className="px-0">
          <Link to="/expenses">All expenses</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Expenses and payments will show up here.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground" aria-hidden="true">
                  {item.kind === "expense" ? <Receipt className="h-4 w-4" /> : <HandCoins className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.detail} · {formatDate(item.at)}
                  </p>
                </div>
                <span className="money shrink-0 text-sm">{item.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const Dashboard = () => {
  const { user, userProfile } = useAuth();
  const { openAddExpense, openNewGroup, openJoinGroup } = useAppActions();
  const groups = useExpenseStore((s) => s.groups);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const expenses = useExpenseStore((s) => s.expenses);
  const groupSettlements = useExpenseStore((s) => s.groupSettlements);
  const currencyOf = useCurrencyOf();
  const balances = useUserBalances(user?.uid);

  const netByGroup = useMemo(() => new Map(balances.perGroup.map((p) => [p.group.id, p])), [balances.perGroup]);
  const active = groups.filter((g) => !g.isArchived);
  const archived = groups.filter((g) => g.isArchived);

  const activity = useMemo<ActivityItem[]>(() => {
    const groupName = new Map(groups.map((g) => [g.id, g.name]));
    const first = (name: string) => name.trim().split(/\s+/)[0] || name;
    const nameIn = (groupId: string, memberId: string) =>
      memberId === user?.uid
        ? "you"
        : first(groups.find((g) => g.id === groupId)?.members.find((m) => m.id === memberId)?.name ?? "Someone");
    const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
    const items: ActivityItem[] = expenses.map((e) => ({
      id: `e-${e.id}`,
      kind: "expense",
      title: e.description || "Expense",
      detail: `${groupName.get(e.groupId) ?? "A group"} · ${e.paidBy?.id === user?.uid ? "you paid" : `${first(e.paidBy?.name ?? "someone")} paid`}`,
      amount: formatAmount(e.amount, currencyOf(e.groupId)),
      at: toDate(e.date) ?? new Date(0),
    }));
    for (const [groupId, list] of Object.entries(groupSettlements)) {
      for (const s of list ?? []) {
        items.push({
          id: `s-${s.id}`,
          kind: "payment",
          title: `${cap(nameIn(groupId, s.fromMemberId))} paid ${nameIn(groupId, s.toMemberId)}`,
          detail: groupName.get(groupId) ?? "A group",
          amount: formatAmount(s.amount, currencyOf(groupId)),
          at: toDate(s.date) ?? new Date(0),
        });
      }
    }
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8);
  }, [expenses, groups, groupSettlements, currencyOf, user?.uid]);

  if (!groupsLoaded) return <PageSkeleton />;

  const firstName = (userProfile?.name || user?.displayName || "").trim().split(/\s+/)[0];
  const hasDebts = balances.debts.length > 0;
  const owedText = balances.owedToYou.size ? formatTotals(balances.owedToYou) : null;
  const openBalances = balances.perGroup.filter((p) => p.net !== 0).length;

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
        description={
          active.length === 0
            ? "Three quick steps and you're splitting."
            : owedText
              ? `You're owed ${owedText} in ${openBalances} ${openBalances === 1 ? "group" : "groups"}.`
              : `Here's where things stand across your ${active.length} ${active.length === 1 ? "group" : "groups"}.`
        }
      />

      <div className="space-y-6">
        <InstallBanner />
        <FirstRunChecklist />
        {groups.length > 0 && (
        <>
        <BalanceStrip owedToYou={balances.owedToYou} youOwe={balances.youOwe} />

        <section aria-label="Quick actions" className="flex flex-wrap gap-2">
          <Button onClick={() => openAddExpense(undefined, "dashboard")}>
            <Plus aria-hidden="true" />
            Add expense
          </Button>
          <Button variant="outline" onClick={openNewGroup}>
            <Users aria-hidden="true" />
            New group
          </Button>
          <Button variant="outline" onClick={openJoinGroup}>
            <QrCode aria-hidden="true" />
            Join a group
          </Button>
        </section>

        {hasDebts && <BalanceCard debts={balances.debts} showGroupName title="To settle" />}

        <LoansSummary />

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="min-w-0 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl">Your groups</CardTitle>
              <span className="text-sm text-muted-foreground">{active.length}</span>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <div className="py-6">
                  <p className="text-sm text-muted-foreground">No groups yet. Groups keep a running tab for a trip, a flat or a team.</p>
                  <Button className="mt-4" onClick={openNewGroup}>
                    <Plus aria-hidden="true" />
                    New group
                  </Button>
                </div>
              ) : (
                <ul className="-mx-2">
                  {active.map((group) => {
                    const entry = netByGroup.get(group.id);
                    return <GroupRow key={group.id} group={group} net={entry?.net ?? 0} currency={entry?.currency ?? currencyOf(group.id)} />;
                  })}
                </ul>
              )}
              {archived.length > 0 && (
                <Collapsible className="mt-2 border-t pt-2">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Archived ({archived.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="-mx-2">
                      {archived.map((group) => {
                        const entry = netByGroup.get(group.id);
                        return <GroupRow key={group.id} group={group} net={entry?.net ?? 0} currency={entry?.currency ?? currencyOf(group.id)} />;
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          <div className="min-w-0 lg:col-span-2">
            <RecentActivity items={activity} />
          </div>
        </div>
        </>
        )}
      </div>

    </>
  );
};

export default Dashboard;
