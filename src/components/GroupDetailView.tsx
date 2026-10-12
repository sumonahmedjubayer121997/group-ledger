import { lazy, Suspense, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Plus, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { BalanceCard } from "./BalanceCard";
import { ExpenseList } from "./ExpenseList";
import { ExportDialog } from "./ExportDialog";
import { GroupActivityFeed } from "./GroupActivityFeed";
import { GroupInviteDialog } from "./GroupInviteDialog";
import { GroupLifecycleActions } from "./GroupLifecycleActions";
import { GroupMemberManagement } from "./GroupMemberManagement";
import { GroupSettings } from "./GroupSettings";
import { SettlementSummary } from "./SettlementSummary";
import { GroupBudgetsPanel } from "./budgets/GroupBudgetsPanel";
import { useAppActions, useCurrentGroup } from "@/app/appActions";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberPhotos } from "@/hooks/useMemberPhotos";
import { useExpenseStore, type Group } from "@/stores/expenseStore";
import { useGroupLedger } from "@/stores/useLedger";
import { formatMoney, toCents, toCurrencyCode } from "@/lib/money";

// Charts and chat are the heaviest tabs; they load when opened.
const GroupAnalytics = lazy(() => import("./GroupAnalytics").then((m) => ({ default: m.GroupAnalytics })));
const GroupCommunicationHub = lazy(() => import("./GroupCommunicationHub").then((m) => ({ default: m.GroupCommunicationHub })));

type TabKey = "overview" | "expenses" | "analytics" | "budgets" | "activity" | "members" | "chat" | "settings";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

interface GroupDetailViewProps {
  group: Group;
}

export const GroupDetailView = ({ group }: GroupDetailViewProps) => {
  const { user } = useAuth();
  const { openAddExpense } = useAppActions();
  const unarchiveGroup = useExpenseStore((s) => s.unarchiveGroup);
  const allExpenses = useExpenseStore((s) => s.expenses);
  useCurrentGroup(group.id);

  const role = group.members.find((m) => m.id === user?.uid)?.role;
  const isAdmin = role === "admin";
  const canWrite = isAdmin || role === "member";

  const tabs: { value: TabKey; label: string }[] = [
    { value: "overview", label: "Overview" },
    { value: "expenses", label: "Expenses" },
    { value: "analytics", label: "Analytics" },
    { value: "budgets", label: "Budgets" },
    { value: "activity", label: "Activity" },
    { value: "members", label: "Members" },
    { value: "chat", label: "Chat" },
    ...(isAdmin ? [{ value: "settings" as const, label: "Settings" }] : []),
  ];

  // The open tab lives in the URL (?tab=chat), so links and the back button work.
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: TabKey = tabs.some((t) => t.value === requested) ? (requested as TabKey) : "overview";
  const setTab = (value: string) => setParams(value === "overview" ? {} : { tab: value }, { replace: true });

  // Notifications about new messages ask for the chat tab this way.
  useEffect(() => {
    if (sessionStorage.getItem("openTab") === "chat") {
      sessionStorage.removeItem("openTab");
      setParams({ tab: "chat" }, { replace: true });
    }
  }, [setParams]);

  const ledger = useGroupLedger(group.id);
  const debts = ledger?.debts ?? [];
  const ignored = ledger?.ledger.ignoredSettlements.length ?? 0;
  const currency = toCurrencyCode(group.settings?.currency);
  const expenses = useMemo(() => allExpenses.filter((e) => e.groupId === group.id), [allExpenses, group.id]);
  const recent = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [expenses]
  );
  const totalCents = useMemo(() => expenses.reduce((sum, e) => sum + toCents(e.amount), 0), [expenses]);
  const myNet = (user && ledger?.ledger.nets.get(user.uid)) || 0;
  const photos = useMemberPhotos(group.members.map((m) => m.id));

  const addDisabledReason = group.isArchived ? "Restore the group to add expenses" : !canWrite ? "Viewers can't add expenses" : undefined;

  return (
    <>
      <PageHeader
        back={{ to: "/", label: "Overview" }}
        title={group.name}
        description={
          <>
            {group.members.length} {group.members.length === 1 ? "member" : "members"} · {currency}
            {group.description ? ` · ${group.description}` : ""}
          </>
        }
        actions={
          <>
            <GroupInviteDialog group={group}>
              <Button variant="outline">
                <UserPlus aria-hidden="true" />
                Invite
              </Button>
            </GroupInviteDialog>
            <Button onClick={() => openAddExpense(group.id)} disabled={!!addDisabledReason} title={addDisabledReason}>
              <Plus aria-hidden="true" />
              Add expense
            </Button>
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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total spent</p>
            <p className="money mt-1 font-display text-[26px] leading-tight sm:text-[30px]">{formatMoney(totalCents, currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Your balance</p>
            <p
              className={`money mt-1 font-display text-[26px] leading-tight sm:text-[30px] ${myNet > 0 ? "text-settled" : myNet < 0 ? "text-owes" : "text-muted-foreground"}`}
            >
              {myNet === 0 ? "Settled up" : formatMoney(Math.abs(myNet), currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{myNet > 0 ? "you're owed" : myNet < 0 ? "you owe" : "nothing owed either way"}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Members</p>
            <p className="mt-2 flex -space-x-2">
              {group.members.slice(0, 6).map((m) => (
                <Avatar key={m.id} className="h-9 w-9 border-2 border-card">
                  <AvatarImage src={photos[m.id] || undefined} alt="" />
                  <AvatarFallback className="bg-secondary text-xs">{initials(m.name)}</AvatarFallback>
                </Avatar>
              ))}
            </p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{group.members.map((m) => m.name).join(", ")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <BalanceCard
                debts={debts}
                note={
                  ignored > 0
                    ? `${ignored} recorded ${ignored === 1 ? "payment involves" : "payments involve"} people who aren't in this group, so ${ignored === 1 ? "it isn't" : "they aren't"} counted here.`
                    : undefined
                }
              />
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl">Recent expenses</CardTitle>
                  {expenses.length > recent.length && (
                    <Button variant="link" size="sm" className="px-0" onClick={() => setTab("expenses")}>
                      All {expenses.length}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <ExpenseList expenses={recent} pageSize={5} emptyText="No expenses yet. Add the first one." />
                </CardContent>
              </Card>
              <SettlementSummary groupId={group.id} />
            </div>

            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl">Members</CardTitle>
                  <Button variant="link" size="sm" className="px-0" onClick={() => setTab("members")}>
                    Manage
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {group.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={photos[m.id] || undefined} alt="" />
                          <AvatarFallback className="bg-secondary text-xs">{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {m.name}
                            {m.id === user?.uid && <span className="font-normal text-muted-foreground"> (you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{m.email || "No account yet"}</p>
                        </div>
                        {m.role && m.role !== "member" && <span className="text-xs capitalize text-muted-foreground">{m.role}</span>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Group actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <GroupInviteDialog group={group}>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus aria-hidden="true" />
                      Invite people
                    </Button>
                  </GroupInviteDialog>
                  <ExportDialog groupId={group.id}>
                    <Button variant="outline" className="w-full justify-start">
                      <Download aria-hidden="true" />
                      Export expenses
                    </Button>
                  </ExportDialog>
                  <GroupLifecycleActions group={group} isAdmin={isAdmin} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <ExpenseList expenses={expenses} emptyText="No expenses yet. Add the first one." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <GroupAnalytics group={group} />
          </Suspense>
        </TabsContent>

        <TabsContent value="budgets" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl">Budgets</CardTitle>
              <Button variant="link" size="sm" className="px-0" asChild>
                <Link to="/budgets">All budgets</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <GroupBudgetsPanel group={group} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <GroupActivityFeed group={group} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <GroupMemberManagement group={group} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <GroupCommunicationHub group={group} isAdmin={isAdmin} />
          </Suspense>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="mt-6">
            <GroupSettings group={group} />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
};
