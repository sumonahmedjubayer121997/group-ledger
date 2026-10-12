import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { GroupBudgetsPanel } from "@/components/budgets/GroupBudgetsPanel";
import { PersonalBudgetsPanel } from "@/components/budgets/PersonalBudgetsPanel";
import { useExpenseStore } from "@/stores/expenseStore";
import { useBudgetStore } from "@/stores/budgetStore";
import { toCurrencyCode } from "@/lib/money";

/** The one place for budgets: each group's shared budgets, and your personal ones. */
const BudgetsPage = () => {
  const groups = useExpenseStore((s) => s.groups);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const budgets = useBudgetStore((s) => s.budgets);
  // Archived groups only appear here if they still have budgets.
  const shown = groups.filter((g) => !g.isArchived || budgets.some((b) => b.groupId === g.id && b.isActive));

  if (!groupsLoaded) return <PageSkeleton />;

  return (
    <>
      <PageHeader title="Budgets" description="Spending limits for your groups, and for yourself." />
      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">Group budgets</TabsTrigger>
          <TabsTrigger value="personal">Personal budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6 space-y-4">
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

        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <PersonalBudgetsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default BudgetsPage;
