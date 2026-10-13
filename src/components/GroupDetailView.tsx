import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BarChart3, Download, MoreHorizontal, Plus, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { BalanceCard } from "./BalanceCard";
import { ExpenseList, type ListEvent } from "./ExpenseList";
import { ExportDialog } from "./ExportDialog";
import { GroupInviteDialog } from "./GroupInviteDialog";
import { GroupLifecycleActions } from "./GroupLifecycleActions";
import { GroupMemberManagement } from "./GroupMemberManagement";
import { GroupSettings } from "./GroupSettings";
import { SettlementSummary } from "./SettlementSummary";
import { GroupBudgetsPanel } from "./budgets/GroupBudgetsPanel";
import { budgetStatus } from "./budgets/BudgetCard";
import { useAppActions, useCurrentGroup } from "@/app/appActions";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberPhotos } from "@/hooks/useMemberPhotos";
import { ensureInviteLink, subscribeToGroupActivities, type GroupActivityRecord } from "@/services/firebaseService";
import { useBudgetStore } from "@/stores/budgetStore";
import { useExpenseStore, type Group } from "@/stores/expenseStore";
import { useGroupLedger, type DebtView } from "@/stores/useLedger";
import { formatMoney, toCents, toCurrencyCode } from "@/lib/money";
import { toDate } from "@/lib/dates";
import { useHidden } from "@/lib/undo";

// Charts and chat are the heaviest parts; they load when opened.
const SpendingInsights = lazy(() => import("./SpendingInsights"));
const GroupCommunicationHub = lazy(() => import("./GroupCommunicationHub").then((m) => ({ default: m.GroupCommunicationHub })));

type TabKey = "expenses" | "balances" | "chat" | "settings";

/** Old links (?tab=analytics, ?tab=members…) still land somewhere sensible. */
const legacyTab: Record<string, { tab: TabKey; charts?: boolean; section?: string }> = {
  overview: { tab: "expenses" },
  activity: { tab: "expenses" },
  analytics: { tab: "expenses", charts: true },
  budgets: { tab: "settings", section: "budgets" },
  members: { tab: "settings", section: "members" },
  communication: { tab: "chat" },
};

/** "Anik" from " Anik Mahmud" (some stored names have stray spaces). */
const firstName = (name?: string) => name?.trim().split(/\s+/)[0] || "Someone";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** Your own position in the group, said to you, with the action next to it. */
function YourBalance({ debts, userId, currency }: { debts: DebtView[]; userId?: string; currency: string }) {
  const { openSettle } = useAppActions();
  const mine = debts.filter((d) => d.from === userId || d.to === userId);
  if (mine.length === 0) {
    return <p className="mb-6 text-sm text-muted-foreground">You're all square in this group.</p>;
  }
  return (
    <section aria-label="Your balance" className="mb-6 space-y-2">
      {mine.map((d) => {
        const owedToYou = d.to === userId;
        const other = owedToYou ? d.fromPerson : d.toPerson;
        const first = firstName(other.name);
        return (
          <div
            key={`${d.from}-${d.to}`}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 ${owedToYou ? "border-settled/30 bg-settled/5" : "border-owes/30 bg-owes/5"}`}
          >
            <p className="text-[15px]">
              {owedToYou ? (
                <>
                  <span className="font-medium">{first}</span> owes you{" "}
                  <span className="money font-medium text-settled">{formatMoney(d.cents, currency)}</span>
                </>
              ) : (
                <>
                  You owe <span className="font-medium">{first}</span>{" "}
                  <span className="money font-medium text-owes">{formatMoney(d.cents, currency)}</span>
                </>
              )}
            </p>
            {!other.isFormer && (
              <Button size="sm" variant="outline" onClick={() => openSettle(d)}>
                Mark as paid
              </Button>
            )}
          </div>
        );
      })}
    </section>
  );
}

interface GroupDetailViewProps {
  group: Group;
}

export const GroupDetailView = ({ group }: GroupDetailViewProps) => {
  const { user } = useAuth();
  const { openAddExpense } = useAppActions();
  const unarchiveGroup = useExpenseStore((s) => s.unarchiveGroup);
  const allExpenses = useExpenseStore((s) => s.expenses);
  const settlements = useExpenseStore((s) => s.groupSettlements[group.id]);
  const budgets = useBudgetStore((s) => s.budgets);
  const getBudgetUsage = useBudgetStore((s) => s.getBudgetUsage);
  useCurrentGroup(group.id);

  const role = group.members.find((m) => m.id === user?.uid)?.role;
  const isAdmin = role === "admin";
  const canWrite = isAdmin || role === "member";

  // The open tab lives in the URL (?tab=chat), so links and the back button work.
  const [params, setParams] = useSearchParams();
  // ?invite=1 (from the command bar) opens the invite dialog once.
  const [inviteOpen, setInviteOpen] = useState(false);
  useEffect(() => {
    if (params.get("invite") !== "1") return;
    setInviteOpen(true);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("invite");
        return next;
      },
      { replace: true }
    );
  }, [params, setParams]);
  const requested = params.get("tab") ?? "expenses";
  const legacy = legacyTab[requested];
  const tab: TabKey = legacy?.tab ?? (["expenses", "balances", "chat", "settings"].includes(requested) ? (requested as TabKey) : "expenses");
  const [showCharts, setShowCharts] = useState(!!legacy?.charts);
  const setTab = (value: string) => setParams(value === "expenses" ? {} : { tab: value }, { replace: true });

  /** Opens Settings at one of its sections (members, budgets). */
  const openSection = (section: string) => {
    setParams({ tab: "settings" }, { replace: true });
    window.setTimeout(() => document.getElementById(`group-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  useEffect(() => {
    if (legacy?.section) openSection(legacy.section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacy?.section]);

  // Notifications about new messages ask for the chat tab this way.
  useEffect(() => {
    if (sessionStorage.getItem("openTab") === "chat") {
      sessionStorage.removeItem("openTab");
      setParams({ tab: "chat" }, { replace: true });
    }
  }, [setParams]);

  // Keep the invite link ready, so Invite shows its QR code straight away.
  const linkReady = group.groupType === "public" && (group.inviteCode?.length ?? 0) >= 16;
  useEffect(() => {
    if (linkReady && canWrite) void ensureInviteLink(group).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkReady, canWrite, group.id, group.name, group.inviteCode]);

  // The group's change log (edits, deletions, member changes) shows inline in the expense list.
  const [activity, setActivity] = useState<GroupActivityRecord[]>([]);
  useEffect(() => subscribeToGroupActivities(group.id, setActivity), [group.id]);

  const ledger = useGroupLedger(group.id);
  const debts = ledger?.debts ?? [];
  const ignored = ledger?.ledger.ignoredSettlements.length ?? 0;
  const currency = toCurrencyCode(group.settings?.currency);
  const expenses = useMemo(() => allExpenses.filter((e) => e.groupId === group.id), [allExpenses, group.id]);
  const hidden = useHidden((s) => s.hidden);
  const totalCents = useMemo(
    () => expenses.reduce((sum, e) => sum + (hidden.has(`expense-${e.id}`) ? 0 : toCents(e.amount)), 0),
    [expenses, hidden]
  );
  const photos = useMemberPhotos(group.members.map((m) => m.id));

  const events = useMemo<ListEvent[]>(() => {
    const nameOf = (id: string) => (id === user?.uid ? "you" : firstName(ledger?.person(id).name) ?? "someone");
    const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
    const payments: ListEvent[] = (settlements ?? []).map((s) => ({
      id: `payment-${s.id}`,
      kind: "payment",
      at: toDate(s.date) ?? new Date(0),
      text: `${cap(nameOf(s.fromMemberId))} paid ${nameOf(s.toMemberId)} ${formatMoney(toCents(s.amount), currency)}`,
    }));
    const changes: ListEvent[] = activity.map((a) => ({
      id: `change-${a.id}`,
      kind: "change",
      at: a.createdAt,
      text: `${a.actorId === user?.uid ? "You" : firstName(a.actorName)} ${a.description}`,
    }));
    return [...payments, ...changes];
  }, [settlements, activity, ledger, user?.uid, currency]);

  // One quiet line on the Expenses tab when a budget needs attention.
  const budgetAlerts = useMemo(() => {
    const usage = new Map(getBudgetUsage(expenses, undefined, group.id).map((u) => [u.budgetId, toCents(u.spent)]));
    return budgets
      .filter((b) => b.groupId === group.id && b.isActive)
      .map((b) => ({ budget: b, spent: usage.get(b.id) ?? 0 }))
      .filter(({ budget, spent }) => budgetStatus(spent, budget) !== "on-track");
  }, [budgets, expenses, group.id, getBudgetUsage]);

  const addDisabledReason = group.isArchived ? "Restore the group to add expenses" : !canWrite ? "Viewers can't add expenses" : undefined;

  return (
    <>
      <PageHeader
        back={{ to: "/", label: "Overview" }}
        title={group.name}
        description={
          <>
            {group.members.length} {group.members.length === 1 ? "person" : "people"} · {currency}
            {group.description ? ` · ${group.description}` : ""}
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => openSection("members")}
              className="mr-1 flex -space-x-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${group.members.length} people: ${group.members.map((m) => m.name).join(", ")}. Open members`}
            >
              {group.members.slice(0, 4).map((m) => (
                <Avatar key={m.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={photos[m.id] || undefined} alt="" />
                  <AvatarFallback className="bg-secondary text-[11px]">{initials(m.name)}</AvatarFallback>
                </Avatar>
              ))}
            </button>
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus aria-hidden="true" />
              Invite
            </Button>
            <GroupInviteDialog group={group} open={inviteOpen} onOpenChange={setInviteOpen} />
            {/* Phones use the + in the bottom bar, which also starts in this group (see useCurrentGroup). */}
            <Button className="max-md:hidden" onClick={() => openAddExpense(group.id, "group")} disabled={!!addDisabledReason} title={addDisabledReason}>
              <Plus aria-hidden="true" />
              Add expense
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More group actions">
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ExportDialog groupId={group.id}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Download aria-hidden="true" />
                    Export expenses
                  </DropdownMenuItem>
                </ExportDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {group.isArchived && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-owes/40 bg-owes/10 p-4 text-sm">
          <span>This group is archived. Its history is kept; restore it to add expenses again.</span>
          <Button size="sm" variant="outline" onClick={() => unarchiveGroup(group.id)}>
            Restore group
          </Button>
        </div>
      )}

      <YourBalance debts={debts} userId={user?.uid} currency={currency} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="money text-sm text-muted-foreground">
              {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} · {formatMoney(totalCents, currency)} in total
            </p>
            <Button variant={showCharts ? "default" : "outline"} size="sm" aria-pressed={showCharts} onClick={() => setShowCharts(!showCharts)}>
              <BarChart3 aria-hidden="true" />
              Charts
            </Button>
          </div>
          {budgetAlerts.map(({ budget, spent }) => (
            <p key={budget.id} className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="money text-owes">
                {budget.name}: {formatMoney(spent, currency)} of {formatMoney(toCents(budget.limit), currency)} spent ({budget.period})
              </span>
              <button
                type="button"
                onClick={() => openSection("budgets")}
                className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                See budgets
              </button>
            </p>
          ))}
          {showCharts ? (
            <Suspense fallback={<Skeleton className="h-96" />}>
              <SpendingInsights expenses={expenses} currencyOf={() => currency} />
            </Suspense>
          ) : (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <ExpenseList expenses={expenses} events={events} emptyText="No expenses yet. Add the first one." />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="balances" className="mt-6 space-y-6">
          <BalanceCard
            debts={debts}
            title="Who owes whom"
            note={
              ignored > 0
                ? `${ignored} recorded ${ignored === 1 ? "payment involves" : "payments involve"} people who aren't in this group, so ${ignored === 1 ? "it isn't" : "they aren't"} counted here.`
                : undefined
            }
          />
          <SettlementSummary groupId={group.id} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <GroupCommunicationHub group={group} isAdmin={isAdmin} />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <section id="group-members" className="scroll-mt-24">
            <GroupMemberManagement group={group} />
          </section>

          <section id="group-budgets" className="scroll-mt-24">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl">Budgets</CardTitle>
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link to="/personal?tab=group-budgets">All budgets</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <GroupBudgetsPanel group={group} />
              </CardContent>
            </Card>
          </section>

          {isAdmin ? (
            <GroupSettings group={group} />
          ) : (
            <p className="text-sm text-muted-foreground">Only admins can change the group's name, currency and invite link.</p>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{group.isArchived ? "Restore or delete" : "Archive or delete"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:max-w-xs">
              <GroupLifecycleActions group={group} isAdmin={isAdmin} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};
