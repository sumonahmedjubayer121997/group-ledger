import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { GroupBudgetsPanel } from "@/components/budgets/GroupBudgetsPanel";
import { PersonalBudgetsPanel } from "@/components/budgets/PersonalBudgetsPanel";
import { LoansPanel } from "@/components/loans/LoansPanel";
import { useExpenseStore } from "@/stores/expenseStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { toCurrencyCode } from "@/lib/money";

const TABS = ["loans", "budgets", "group-budgets"] as const;
type Tab = (typeof TABS)[number];

/** Your own money: loans you gave or took outside groups, your budgets, and your groups' budgets. */
const PersonalPage = () => {
  const groups = useExpenseStore((s) => s.groups);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const budgets = useBudgetStore((s) => s.budgets);
  // The open tab lives in the URL (?tab=budgets), so links and the back button work.
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get("tab")) ?? "loans";
  const setTab = (next: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === "loans") p.delete("tab");
        else p.set("tab", next);
        return p;
      },
      { replace: true }
    );
  // Archived groups only appear here if they still have budgets.
  const shown = groups.filter((g) => !g.isArchived || budgets.some((b) => b.groupId === g.id && b.isActive));

  if (!groupsLoaded) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Personal" description="Money you lent or borrowed, and your budgets." />
      <Tabs value={tab} onValueChange={setTab}>
        {/* Scrolls sideways on the narrowest phones rather than spilling off the screen. */}
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="budgets">My budgets</TabsTrigger>
          <TabsTrigger value="group-budgets">Group budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="mt-6">
          <LoansPanel />
        </TabsContent>

        <TabsContent value="budgets" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <PersonalBudgetsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group-budgets" className="mt-6 space-y-4">
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create a group first; budgets belong to a group.</p>
          ) : (
            shown.map((group) => (
              <Card key={group.id}>
                <CardHeader className="flex flex-row items-baseline justify-between space-y-0 pb-4">
                  <CardTitle className="text-xl">
                    <Link to={`/groups/${group.id}`} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {group.name}
                    </Link>
                    {group.isArchived && <span className="ml-2 font-inter text-xs text-muted-foreground">(archived)</span>}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{toCurrencyCode(group.settings?.currency)}</span>
                </CardHeader>
                <CardContent>
                  <GroupBudgetsPanel group={group} compactEmpty />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default PersonalPage;
