import { lazy, Suspense, useMemo, useState } from "react";
import { startOfMonth, startOfYear, subDays, subMonths, endOfMonth } from "date-fns";
import { Download, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseList } from "@/components/ExpenseList";
import { ExportDialog } from "@/components/ExportDialog";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useAppActions } from "@/app/appActions";
import { useExpenseStore } from "@/stores/expenseStore";
import { useCurrencyOf } from "@/stores/useLedger";
import { formatTotals, toCents } from "@/lib/money";
import { toDate } from "@/lib/dates";

const SpendingInsights = lazy(() => import("@/components/SpendingInsights"));

type Range = "all" | "30d" | "month" | "lastMonth" | "year";

const ranges: { value: Range; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "year", label: "This year" },
];

const rangeBounds = (range: Range, now = new Date()): [Date | null, Date | null] => {
  switch (range) {
    case "30d":
      return [subDays(now, 30), null];
    case "month":
      return [startOfMonth(now), null];
    case "lastMonth": {
      const last = subMonths(now, 1);
      return [startOfMonth(last), endOfMonth(last)];
    }
    case "year":
      return [startOfYear(now), null];
    default:
      return [null, null];
  }
};

const ALL = "all";

/** Every expense across your groups, with search, filters and paging; plus spending insights. */
export default function ExpensesPage() {
  const { openAddExpense } = useAppActions();
  const groups = useExpenseStore((s) => s.groups);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const expenses = useExpenseStore((s) => s.expenses);
  const currencyOf = useCurrencyOf();

  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [person, setPerson] = useState(ALL);
  const [range, setRange] = useState<Range>("all");

  const mine = useMemo(() => {
    const ids = new Set(groups.map((g) => g.id));
    return expenses.filter((e) => ids.has(e.groupId));
  }, [expenses, groups]);

  const categories = useMemo(() => [...new Set(mine.map((e) => e.category).filter(Boolean))].sort(), [mine]);
  const people = useMemo(() => {
    const names = new Map<string, string>();
    for (const g of groups) for (const m of g.members) names.set(m.id, m.name);
    return [...names].sort((a, b) => a[1].localeCompare(b[1]));
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [from, to] = rangeBounds(range);
    return mine.filter((e) => {
      if (groupId !== ALL && e.groupId !== groupId) return false;
      if (category !== ALL && e.category !== category) return false;
      if (person !== ALL && e.paidBy?.id !== person && !e.splitAmong?.some((m) => m.id === person)) return false;
      const date = toDate(e.date);
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;
      if (q && !`${e.description} ${e.category} ${e.paidBy?.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mine, query, groupId, category, person, range]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const e of filtered) t.set(currencyOf(e.groupId), (t.get(currencyOf(e.groupId)) ?? 0) + toCents(e.amount));
    return t;
  }, [filtered, currencyOf]);

  const filtering = query || groupId !== ALL || category !== ALL || person !== ALL || range !== "all";
  const clear = () => {
    setQuery("");
    setGroupId(ALL);
    setCategory(ALL);
    setPerson(ALL);
    setRange("all");
  };

  if (!groupsLoaded) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Expenses"
        description={`${mine.length} ${mine.length === 1 ? "expense" : "expenses"} across ${groups.length} ${groups.length === 1 ? "group" : "groups"}`}
        actions={
          <>
            <ExportDialog>
              <Button variant="outline">
                <Download aria-hidden="true" />
                Export
              </Button>
            </ExportDialog>
            <Button onClick={() => openAddExpense()}>
              <Plus aria-hidden="true" />
              Add expense
            </Button>
          </>
        }
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">All expenses</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-4">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Label htmlFor="expense-search" className="sr-only">
                  Search expenses
                </Label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="expense-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-9" />
              </div>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger aria-label="Group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={person} onValueChange={setPerson}>
                <SelectTrigger aria-label="Person">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Everyone</SelectItem>
                  {people.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                <SelectTrigger aria-label="Dates">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ranges.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            <p className="text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
              {filtered.length > 0 && <span className="money"> · {formatTotals(totals)}</span>}
            </p>
            {filtering && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <X aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <ExpenseList
                key={`${query}|${groupId}|${category}|${person}|${range}`}
                expenses={filtered}
                showGroup
                emptyText={filtering ? "No expenses match these filters." : "No expenses yet. Add one to get started."}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SpendingInsights expenses={mine} currencyOf={currencyOf} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </>
  );
}
