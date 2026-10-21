import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Archive, ArrowRight, ChevronRight, HandCoins, Plus, QrCode, Receipt, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BalanceCard } from "@/components/BalanceCard";
import { FirstRunChecklist } from "@/components/FirstRunChecklist";
import { VerifyEmailLine } from "@/components/VerifyEmailLine";
import { LoansSummary } from "@/components/loans/LoansSummary";
import { LitPanel } from "@/components/fx/LitPanel";
import { TiltCard } from "@/components/fx/TiltCard";
import { glass, glassRow } from "@/components/fx/glass";
import { InstallBanner } from "@/components/InstallBanner";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppActions } from "@/app/appActions";
import { useExpenseStore, type Group } from "@/stores/expenseStore";
import { useCurrencyOf, useUserBalances } from "@/stores/useLedger";
import { formatAmount, formatMoney, formatTotals } from "@/lib/money";
import { expenseMoment, formatDate, toDate } from "@/lib/dates";
import { memberFor } from "@/lib/claims";
import { changeWords, comparisonSpan, monthlyTrend, periodSpan, sumIn, type MonthBar } from "@/lib/insights";
import { loanTotals } from "@/lib/loans";
import { cn } from "@/lib/utils";
import { useLoanStore } from "@/stores/loanStore";
import { mainCurrencyOf, useSpendRows } from "@/stores/useSpending";

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function GroupRow({ group, net, currency }: { group: Group; net: number; currency: string }) {
  const expenseCount = useExpenseStore((s) => s.expenses.filter((e) => e.groupId === group.id).length);
  const status =
    net > 0
      ? { text: `you're owed ${formatMoney(net, currency)}`, tint: "money text-settled", chip: "bg-settled/10", dot: "bg-settled" }
      : net < 0
        ? { text: `you owe ${formatMoney(-net, currency)}`, tint: "money text-owes", chip: "bg-owes/10", dot: "bg-owes" }
        : { text: "settled up", tint: "text-muted-foreground", chip: "bg-secondary", dot: null };
  return (
    <li>
      <Link
        to={`/groups/${group.id}`}
        className={cn("group/row flex items-center gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", glassRow)}
      >
        <span className="relative shrink-0">
          <Avatar className="h-11 w-11 rounded-xl border border-[color:var(--fx-rim)]">
            <AvatarImage src={group.photo || undefined} alt="" className="object-cover" />
            <AvatarFallback className="rounded-xl bg-[var(--fx-surface)] text-sm font-medium">{initials(group.name)}</AvatarFallback>
          </Avatar>
          {/* Green while you're owed, amber while you owe; the words say it too. */}
          {status.dot && <span aria-hidden="true" className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[var(--fx-surface)]", status.dot)} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{group.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {group.members.length} {group.members.length === 1 ? "person" : "people"} · {expenseCount}{" "}
            {expenseCount === 1 ? "expense" : "expenses"}
          </p>
          <p className={cn("mt-0.5 truncate text-sm sm:hidden", status.tint)}>{status.text}</p>
        </div>
        <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block", status.tint, status.chip)}>{status.text}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/row:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  );
}

type ActivityItem = { id: string; kind: "expense" | "payment"; title: string; detail: string; amount: string; at: Date };

function RecentActivity({ items }: { items: ActivityItem[] }) {
  const reduce = useReducedMotion();
  return (
    <LitPanel light="top" className="h-full" aria-labelledby="activity-title">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <CardTitle id="activity-title" className="text-xl">
          Recent activity
        </CardTitle>
        <Button variant="link" size="sm" asChild className="px-0">
          <Link to="/expenses">All expenses</Link>
        </Button>
      </div>
      <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
        {items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Expenses and payments will show up here.</p>
        ) : (
          // A timeline: one thread through the icons, payments in green.
          <ul className="relative before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-[var(--fx-rim)]">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.035 }}
                className="relative flex items-center gap-3 py-2.5"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-[var(--fx-surface)] shadow-[inset_0_1px_0_var(--fx-rim-hi)]",
                    item.kind === "payment" ? "border-settled/30 text-settled" : "border-[color:var(--fx-rim)] text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {item.kind === "expense" ? <Receipt className="h-4 w-4" /> : <HandCoins className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.detail} · {formatDate(item.at)}
                  </p>
                </div>
                <span className={cn("money shrink-0 text-sm", item.kind === "payment" && "text-settled")}>{item.amount}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </LitPanel>
  );
}

type MonthSummary = { currency: string; spent: number; change: string | null; label: string; bars: MonthBar[] };

/** This month's spending (your share), against last month by this day, with the last six months. */
function ThisMonthCard({ summary }: { summary: MonthSummary }) {
  const reduce = useReducedMotion();
  const { currency, spent, change, label, bars } = summary;
  const more = !!change?.includes("more");
  const less = !!change?.includes("less");
  const tallest = Math.max(...bars.map((b) => b.cents), 1);
  return (
    <TiltCard
      to="/expenses?tab=insights"
      tone={more ? "owes" : less ? "settled" : "plain"}
      light="top-right"
      max={3}
      bodyClassName="mt-0 flex flex-1 flex-col p-4 sm:p-5 md:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">This month</p>
          <p className="money mt-1 font-display text-[30px] leading-tight">{formatMoney(spent, currency)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {change ? `${change.charAt(0).toUpperCase()}${change.slice(1)} ${label}` : "Your share of what your groups spent"}
          </p>
        </div>
        {/* The last six months, this one in colour; decorative, Insights has them in full. */}
        <div aria-hidden="true" className="flex h-12 shrink-0 items-end gap-1 pt-1">
          {bars.map((b, i) => (
            <motion.span
              key={b.key}
              className={cn("w-2 origin-bottom rounded-full", b.current ? (more ? "bg-owes" : "bg-settled") : "bg-muted-foreground/25")}
              style={{ height: `${Math.max(8, (b.cents / tallest) * 100)}%` }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.1 + i * 0.05 }}
            />
          ))}
        </div>
      </div>
      <p className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium">
        See insights
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/fx:translate-x-0.5" aria-hidden="true" />
      </p>
    </TiltCard>
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

  // One line about this month, not a second dashboard: your share in your main currency, against
  // last month up to the same day. Insights has the rest.
  const spendRows = useSpendRows();
  const thisMonth = useMemo(() => {
    const now = new Date();
    const currency = mainCurrencyOf(spendRows);
    const rows = spendRows.filter((r) => r.currency === currency);
    const spent = sumIn(rows, periodSpan("month", now), "mine");
    const cmp = comparisonSpan("month", now)!;
    const before = sumIn(rows, cmp, "mine");
    const { bars } = monthlyTrend(rows, now, "mine");
    return spent > 0 ? { currency, spent, change: changeWords(spent, before), label: cmp.label, bars } : null;
  }, [spendRows]);
  const hasLoans = useLoanStore((s) => loanTotals(s.loans).open > 0);

  const netByGroup = useMemo(() => new Map(balances.perGroup.map((p) => [p.group.id, p])), [balances.perGroup]);
  const active = groups.filter((g) => !g.isArchived);
  const archived = groups.filter((g) => g.isArchived);

  const activity = useMemo<ActivityItem[]>(() => {
    const groupName = new Map(groups.map((g) => [g.id, g.name]));
    const first = (name: string) => name.trim().split(/\s+/)[0] || name;
    const groupOf = (groupId: string) => groups.find((g) => g.id === groupId);
    // "you" or a first name; a claimed name counts as the person who claimed it.
    const nameIn = (groupId: string, person: { id?: string; name?: string } | undefined, fallback = "Someone") => {
      const member = memberFor(groupOf(groupId), person);
      return member.id && member.id === user?.uid ? "you" : first(member.name || fallback);
    };
    const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
    const items: ActivityItem[] = expenses.map((e) => ({
      id: `e-${e.id}`,
      kind: "expense",
      title: e.description || "Expense",
      detail: `${groupName.get(e.groupId) ?? "A group"} · ${nameIn(e.groupId, e.paidBy, "someone")} paid`,
      amount: formatAmount(e.amount, currencyOf(e.groupId)),
      at: expenseMoment(e.date, e.createdAt),
    }));
    for (const [groupId, list] of Object.entries(groupSettlements)) {
      for (const s of list ?? []) {
        items.push({
          id: `s-${s.id}`,
          kind: "payment",
          title: `${cap(nameIn(groupId, { id: s.fromMemberId }))} paid ${nameIn(groupId, { id: s.toMemberId })}`,
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
  const oweText = balances.youOwe.size ? formatTotals(balances.youOwe) : null;
  const openBalances = balances.perGroup.filter((p) => p.net !== 0).length;

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
        description={
          active.length === 0 ? (
            "Three quick steps and you're splitting."
          ) : owedText || oweText ? (
            // The one place the totals are said; To settle below lists who.
            <>
              {owedText && (
                <>
                  You're owed <span className="money font-medium text-settled">{owedText}</span>
                </>
              )}
              {owedText && oweText && " and you owe "}
              {!owedText && oweText && "You owe "}
              {oweText && <span className="money font-medium text-owes">{oweText}</span>}
              {` across ${openBalances} ${openBalances === 1 ? "group" : "groups"}.`}
            </>
          ) : (
            `You're all settled up across your ${active.length} ${active.length === 1 ? "group" : "groups"}.`
          )
        }
      />

      <div className="space-y-6">
        <VerifyEmailLine />
        <InstallBanner />
        <FirstRunChecklist />
        {groups.length > 0 && (
        <>
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

        {/* At a glance: this month and any open loans, side by side when there are both. */}
        {(thisMonth || hasLoans) && (
          <div className={cn("grid gap-3", thisMonth && hasLoans && "sm:grid-cols-2")}>
            {thisMonth && <ThisMonthCard summary={thisMonth} />}
            <LoansSummary />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <LitPanel className="lg:col-span-3" aria-labelledby="groups-title">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <CardTitle id="groups-title" className="text-xl">
                Your groups
              </CardTitle>
              <span className={cn("min-w-7 rounded-full px-2 py-0.5 text-center text-sm tabular-nums text-muted-foreground", glass)}>{active.length}</span>
            </div>
            <div className="p-3 pt-4 sm:p-4">
              {active.length === 0 ? (
                <div className="px-2 py-6">
                  <p className="text-sm text-muted-foreground">No groups yet. Groups keep a running tab for a trip, a flat or a team.</p>
                  <Button className="mt-4" onClick={openNewGroup}>
                    <Plus aria-hidden="true" />
                    New group
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {active.map((group) => {
                    const entry = netByGroup.get(group.id);
                    return <GroupRow key={group.id} group={group} net={entry?.net ?? 0} currency={entry?.currency ?? currencyOf(group.id)} />;
                  })}
                </ul>
              )}
              {archived.length > 0 && (
                <Collapsible className="mt-3 border-t border-[color:var(--fx-rim)] pt-2">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    Archived ({archived.length})
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-2 pt-1">
                      {archived.map((group) => {
                        const entry = netByGroup.get(group.id);
                        return <GroupRow key={group.id} group={group} net={entry?.net ?? 0} currency={entry?.currency ?? currencyOf(group.id)} />;
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </LitPanel>

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
