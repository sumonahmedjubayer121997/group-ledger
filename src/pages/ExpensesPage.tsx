import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addMonths, format, startOfMonth, startOfYear, subDays, subMonths, endOfMonth } from "date-fns";
import { CheckSquare, Download, Plus, Search, SlidersHorizontal, X } from "lucide-react";
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
import { memberFor } from "@/lib/claims";
import { cn } from "@/lib/utils";

const SpendingInsights = lazy(() => import("@/components/SpendingInsights"));

// A fixed range, or one month ("2026-08", from a bar in Insights).
type Range = "all" | "30d" | "month" | "lastMonth" | "3m" | "year" | `${number}-${number}`;

const ranges: { value: Range; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "year", label: "This year" },
];

const isMonthKey = (value: string | null) => !!value && /^\d{4}-\d{2}$/.test(value);
const monthStart = (key: string) => new Date(`${key}-01T00:00:00`);
const rangeLabel = (range: Range) => ranges.find((r) => r.value === range)?.label ?? (isMonthKey(range) ? format(monthStart(range), "MMMM yyyy") : "Dates");

const rangeBounds = (range: Range, now = new Date()): [Date | null, Date | null] => {
  if (isMonthKey(range)) return [monthStart(range), new Date(addMonths(monthStart(range), 1).getTime() - 1)];
  switch (range) {
    case "30d":
      return [subDays(now, 30), null];
    case "month":
      return [startOfMonth(now), null];
    case "lastMonth": {
      const last = subMonths(now, 1);
      return [startOfMonth(last), endOfMonth(last)];
    }
    case "3m":
      return [startOfMonth(subMonths(now, 2)), null];
    case "year":
      return [startOfYear(now), null];
    default:
      return [null, null];
  }
};

const ALL = "all";
const asRange = (value: string | null): Range => (ranges.some((r) => r.value === value) || isMonthKey(value) ? (value as Range) : "all");

/** Every expense across your groups, with search, filters and paging; plus spending insights. */
export default function ExpensesPage() {
  const { openAddExpense } = useAppActions();
  const groups = useExpenseStore((s) => s.groups);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const expenses = useExpenseStore((s) => s.expenses);
  const currencyOf = useCurrencyOf();

  // Links (the command bar, Insights) can start the page filtered:
  // ?q=rice&group=<id>&person=<id>&category=Food&range=month.
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [groupId, setGroupId] = useState(params.get("group") ?? ALL);
  const [category, setCategory] = useState(params.get("category") ?? ALL);
  const [person, setPerson] = useState(params.get("person") ?? ALL);
  const [range, setRange] = useState<Range>(asRange(params.get("range")));
  // Only from links (Insights shows one currency at a time); shown as a chip you can remove.
  const [currency, setCurrency] = useState(params.get("currency") ?? ALL);
  const [selecting, setSelecting] = useState(false);
  // A link from Insights (a bar, a name) lands on the list with its filters set.
  const [tab, setTab] = useState(params.get("tab") === "insights" ? "insights" : "list");
  useEffect(() => {
    setTab(params.get("tab") === "insights" ? "insights" : "list");
    setQuery(params.get("q") ?? "");
    setGroupId(params.get("group") ?? ALL);
    setPerson(params.get("person") ?? ALL);
    setCategory(params.get("category") ?? ALL);
    setRange(asRange(params.get("range")));
    setCurrency(params.get("currency") ?? ALL);
  }, [params]);
  // On phones the four filters wait behind one button, so the list starts near the top.
  const activeFilters = [groupId !== ALL, person !== ALL, category !== ALL, range !== "all"].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = useState(activeFilters > 0);

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

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [from, to] = rangeBounds(range);
    return mine.filter((e) => {
      if (groupId !== ALL && e.groupId !== groupId) return false;
      if (currency !== ALL && currencyOf(e.groupId) !== currency) return false;
      if (category !== ALL && e.category !== category) return false;
      if (person !== ALL) {
        // A claimed name counts as the person who claimed it.
        const g = groupById.get(e.groupId);
        const isPerson = (p?: { id?: string }) => memberFor(g, p).id === person;
        if (!isPerson(e.paidBy) && !e.splitAmong?.some(isPerson)) return false;
      }
      const date = toDate(e.date);
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;
      if (q && !`${e.description} ${e.category} ${e.paidBy?.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mine, query, groupId, category, person, range, groupById, currency, currencyOf]);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const e of filtered) t.set(currencyOf(e.groupId), (t.get(currencyOf(e.groupId)) ?? 0) + toCents(e.amount));
    return t;
  }, [filtered, currencyOf]);

  const filtering = query || groupId !== ALL || category !== ALL || person !== ALL || range !== "all" || currency !== ALL;
  const clear = () => {
    setCurrency(ALL);
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
            {/* Phones have the + in the bottom bar. */}
            <Button className="max-md:hidden" onClick={() => openAddExpense(undefined, "expenses")}>
              <Plus aria-hidden="true" />
              Add expense
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">All expenses</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-4">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                <div className="relative min-w-0 flex-1">
                  <Label htmlFor="expense-search" className="sr-only">
                    Search expenses
                  </Label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="expense-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-9" />
                </div>
                <Button
                  variant={activeFilters ? "default" : "outline"}
                  className="shrink-0 sm:hidden"
                  aria-expanded={filtersOpen}
                  aria-controls="expense-filters"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Filters{activeFilters ? ` · ${activeFilters}` : ""}
                </Button>
              </div>
              {((!filtersOpen && activeFilters > 0) || currency !== ALL) && (
                <ul className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5" aria-label="Active filters">
                  {/* On phones, chips stand in for the folded-away filters; the currency has no box of its own anywhere. */}
                  {[
                    currency !== ALL && { label: `Only ${currency}`, clear: () => setCurrency(ALL), always: true },
                    !filtersOpen && groupId !== ALL && { label: groups.find((g) => g.id === groupId)?.name ?? "Group", clear: () => setGroupId(ALL) },
                    !filtersOpen && person !== ALL && { label: people.find(([id]) => id === person)?.[1] ?? "Person", clear: () => setPerson(ALL) },
                    !filtersOpen && category !== ALL && { label: category, clear: () => setCategory(ALL) },
                    !filtersOpen && range !== "all" && { label: rangeLabel(range), clear: () => setRange("all") },
                  ]
                    .filter((chip) => !!chip)
                    .map((chip) => chip as { label: string; clear: () => void; always?: boolean })
                    .map((chip) => (
                      <li key={chip.label} className={chip.always ? undefined : "sm:hidden"}>
                        <button
                          type="button"
                          onClick={chip.clear}
                          className="inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Remove filter: ${chip.label}`}
                        >
                          {chip.label}
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              <div id="expense-filters" className={cn("contents", !filtersOpen && "max-sm:hidden")}>
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
                  {isMonthKey(range) && <SelectItem value={range}>{rangeLabel(range)}</SelectItem>}
                </SelectContent>
              </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            <p className="text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
              {filtered.length > 0 && <span className="money"> · {formatTotals(totals)}</span>}
            </p>
            <div className="flex items-center gap-1">
              {filtering && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <X aria-hidden="true" />
                  Clear filters
                </Button>
              )}
              {!selecting && filtered.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelecting(true)}>
                  <CheckSquare aria-hidden="true" />
                  Select
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <ExpenseList
                key={`${query}|${groupId}|${category}|${person}|${range}`}
                expenses={filtered}
                showGroup
                selecting={selecting}
                onDoneSelecting={() => setSelecting(false)}
                emptyText={filtering ? "No expenses match these filters." : "No expenses yet. Add one to get started."}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SpendingInsights expenses={mine} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </>
  );
}
