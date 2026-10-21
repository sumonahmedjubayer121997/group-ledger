import { useMemo, useState } from "react";
import { ChevronDown, Copy, Download, HandCoins, History, MessageCircle, MoreHorizontal, Pencil, Receipt, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditExpenseForm } from "@/components/EditExpenseForm";
import { ExpenseComments } from "@/components/ExpenseComments";
import { ExportDialog } from "@/components/ExportDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAppActions } from "@/app/appActions";
import { useCategoryStore } from "@/stores/categoryStore";
import { useToast } from "@/hooks/use-toast";
import { useExpenseStore, type Expense } from "@/stores/expenseStore";
import { expenseShares, formatAmount, formatMoney, makeResolver, toCurrencyCode } from "@/lib/money";
import { memberFor } from "@/lib/claims";
import { expenseMoment, formatCalendarDate, formatDate } from "@/lib/dates";
import { deferWithUndo, doneWithUndo, useHidden } from "@/lib/undo";

/** Something that happened in a group, shown as a quiet line between the expenses (a payment, an edit…). */
export type ListEvent = { id: string; at: Date; text: string; kind: "payment" | "change" };

interface ExpenseListProps {
  expenses: Expense[];
  /** Payments and changes to show in date order between the expenses. */
  events?: ListEvent[];
  /** Show which group each expense belongs to (lists that span groups). */
  showGroup?: boolean;
  pageSize?: number;
  emptyText?: string;
  /** Shown under the empty text, e.g. an "Add the first expense" button. */
  emptyAction?: React.ReactNode;
  /** Show checkboxes and a bar to change, export or delete several expenses at once. */
  selecting?: boolean;
  onDoneSelecting?: () => void;
}

const plural = (n: number) => `${n} ${n === 1 ? "expense" : "expenses"}`;

/** Expenses newest first, with your share, and edit / comments / delete for people who can write. */
export function ExpenseList({
  expenses,
  events = [],
  showGroup = false,
  pageSize = 20,
  emptyText = "No expenses yet.",
  emptyAction,
  selecting = false,
  onDoneSelecting,
}: ExpenseListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const groups = useExpenseStore((s) => s.groups);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const logBulkChange = useExpenseStore((s) => s.logBulkChange);
  const { openAddExpense } = useAppActions();
  const getAllAvailableCategories = useCategoryStore((s) => s.getAllAvailableCategories);
  const categories = useMemo(() => [...new Set(user ? getAllAvailableCategories(user.uid) : [])], [user, getAllAvailableCategories]);

  /** Quick add, filled with everything from this expense except the date. */
  const addAgain = (expense: Expense) => {
    const pct = expense.splitType === "percentage" && (expense.splitVersion ?? 0) >= 2 ? expense.splitPercentages : expense.splitData;
    openAddExpense(expense.groupId, "add-again", {
      groupId: expense.groupId,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      paidById: expense.paidBy?.id,
      participantIds: expense.splitAmong?.map((m) => m.id),
      splitType: expense.splitType,
      splitValues: expense.splitType === "equal" ? undefined : expense.splitType === "percentage" ? pct : expense.splitData,
    });
  };

  const changeCategory = async (expense: Expense, category: string) => {
    if (category === expense.category) return;
    try {
      await updateExpense(expense.id, { category });
      toast({ title: "Category changed", description: `"${expense.description}" is now ${category}.` });
    } catch {
      toast({ title: "Couldn't change the category", description: "Please try again.", variant: "destructive" });
    }
  };
  const [shown, setShown] = useState(pageSize);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [commenting, setCommenting] = useState<Expense | null>(null);
  const hidden = useHidden((s) => s.hidden);

  const byGroup = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const sorted = useMemo(
    () =>
      [
        ...expenses
          .filter((e) => !hidden.has(`expense-${e.id}`))
          .map((expense) => ({ kind: "expense" as const, at: expenseMoment(expense.date, expense.createdAt), expense })),
        ...events.filter((event) => !hidden.has(event.id)).map((event) => ({ kind: "event" as const, at: event.at, event })),
      ].sort((a, b) => b.at.getTime() - a.at.getTime()),
    [expenses, events, hidden]
  );

  const rows = useMemo(
    () =>
      sorted.slice(0, shown).map((item) => {
        if (item.kind === "event") return item;
        const { expense } = item;
        const group = byGroup.get(expense.groupId);
        const currency = toCurrencyCode(group?.settings?.currency);
        const resolve = makeResolver(group?.members ?? [], group?.aliases);
        const me = user ? resolve({ id: user.uid, email: user.email }) : null;
        const share = me ? expenseShares(expense, resolve).get(me) ?? 0 : 0;
        const youPaid = !!me && resolve(expense.paidBy) === me;
        const role = group?.members.find((m) => m.id === user?.uid)?.role;
        return { kind: "expense" as const, expense, group, currency, share, youPaid, canEdit: role === "admin" || role === "member" };
      }),
    [sorted, shown, byGroup, user]
  );

  /** Gone at once, with Undo; the real delete happens 8 seconds later. */
  const remove = (expense: Expense) =>
    deferWithUndo({
      id: `expense-${expense.id}`,
      title: `Deleted "${expense.description || "expense"}"`,
      description: "Balances update for everyone in the group.",
      run: () => deleteExpense(expense.id, expense.groupId),
    });

  // ---- Selecting several (Expenses page) ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const visibleExpenses = useMemo(() => sorted.flatMap((item) => (item.kind === "expense" ? [item.expense] : [])), [sorted]);
  const chosen = visibleExpenses.filter((e) => selected.has(e.id));
  const canEditExpense = (e: Expense) => {
    const role = byGroup.get(e.groupId)?.members.find((m) => m.id === user?.uid)?.role;
    return role === "admin" || role === "member";
  };
  const editable = chosen.filter(canEditExpense);
  const viewOnly = chosen.length - editable.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allChosen = visibleExpenses.length > 0 && chosen.length === visibleExpenses.length;
  const skippedNote = viewOnly ? ` Skipped ${plural(viewOnly)} you can only view.` : "";

  /** One line per group in the group's feed, instead of one notification per expense. */
  const logPerGroup = (items: Expense[], type: "expense_updated" | "expense_deleted", what: (n: number) => string) => {
    const counts = new Map<string, number>();
    for (const e of items) counts.set(e.groupId, (counts.get(e.groupId) ?? 0) + 1);
    counts.forEach((n, groupId) => logBulkChange(groupId, type, what(n)));
  };

  const bulkCategory = async (category: string) => {
    const targets = editable.filter((e) => e.category !== category);
    if (targets.length === 0) return;
    const before = targets.map((e) => [e.id, e.category] as const);
    try {
      await Promise.all(targets.map((e) => updateExpense(e.id, { category }, { quiet: true })));
      logPerGroup(targets, "expense_updated", (n) => `moved ${plural(n)} to ${category}`);
      setSelected(new Set());
      doneWithUndo({
        title: `${plural(targets.length)} moved to ${category}`,
        description: skippedNote.trim() || undefined,
        undo: () => Promise.all(before.map(([id, c]) => updateExpense(id, { category: c }, { quiet: true }))),
      });
    } catch {
      toast({ title: "Couldn't change every category", description: "Some may not have changed. Please check and try again.", variant: "destructive" });
    }
  };

  const bulkDelete = () => {
    const targets = editable;
    if (targets.length === 0) return;
    setSelected(new Set());
    deferWithUndo({
      id: `bulk-${targets.map((e) => e.id).join(",")}`,
      hide: targets.map((e) => `expense-${e.id}`),
      title: `Deleted ${plural(targets.length)}`,
      description: `Balances update for everyone in the group.${skippedNote}`,
      run: async () => {
        await Promise.all(targets.map((e) => deleteExpense(e.id, e.groupId, { quiet: true })));
        logPerGroup(targets, "expense_deleted", (n) => `deleted ${plural(n)}`);
      },
    });
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      {selecting && (
        <div
          role="toolbar"
          aria-label="Selected expenses"
          className="sticky top-16 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 text-sm shadow-sm backdrop-blur"
        >
          <Checkbox
            id="select-all-expenses"
            className="ml-1"
            checked={allChosen ? true : chosen.length > 0 ? "indeterminate" : false}
            onCheckedChange={() => setSelected(allChosen ? new Set() : new Set(visibleExpenses.map((e) => e.id)))}
          />
          <label htmlFor="select-all-expenses" className="mr-auto cursor-pointer" aria-live="polite">
            {chosen.length ? `${chosen.length} selected` : `Select all ${visibleExpenses.length}`}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={editable.length === 0}>
                <Tag aria-hidden="true" />
                Category
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              {categories.map((c) => (
                <DropdownMenuItem key={c} onSelect={() => void bulkCategory(c)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ExportDialog onlyIds={chosen.map((e) => e.id)}>
            <Button variant="ghost" size="sm" disabled={chosen.length === 0}>
              <Download aria-hidden="true" />
              Export
            </Button>
          </ExportDialog>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={editable.length === 0} onClick={bulkDelete}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={onDoneSelecting}>
            Done
          </Button>
        </div>
      )}
      <ul className="divide-y">
        {rows.map((row) => {
          if (row.kind === "event") {
            const Icon = row.event.kind === "payment" ? HandCoins : History;
            return (
              <li key={row.event.id} className="flex items-center gap-3 py-2.5 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{row.event.text}</span>
                <time className="shrink-0 text-xs" dateTime={row.event.at.toISOString()}>
                  {formatDate(row.event.at)}
                </time>
              </li>
            );
          }
          const { expense, group, currency, share, youPaid, canEdit } = row;
          return (
          <li key={expense.id} className="flex items-center gap-3 py-3">
            {selecting && (
              <Checkbox
                className="ml-1"
                checked={selected.has(expense.id)}
                onCheckedChange={() => toggle(expense.id)}
                aria-label={`Select ${expense.description || "expense"}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{expense.description || "Expense"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {showGroup && group ? `${group.name} · ` : ""}
                {youPaid ? "You" : memberFor(group, expense.paidBy).name || "Someone"} paid ·{" "}
                <time dateTime={new Date(expense.date).toISOString()} title={formatCalendarDate(expense.date)}>
                  {formatDate(expense.date)}
                </time>
                {!canEdit && expense.category ? ` · ${expense.category}` : ""}
              </p>
              {/* Your share sits on this line, so the amount column stays narrow and descriptions fit. */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Category: ${expense.category || "none"}. Change`}
                  >
                    {expense.category || "No category"}
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                    <DropdownMenuRadioGroup value={expense.category} onValueChange={(c) => void changeCategory(expense, c)}>
                      {categories.map((c) => (
                        <DropdownMenuRadioItem key={c} value={c}>
                          {c}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
                <span className="money text-xs text-muted-foreground">
                  {share > 0 ? `your share ${formatMoney(share, currency)}` : "not involved"}
                </span>
              </div>
            </div>
            <p className="money shrink-0 self-start pt-0.5 text-right font-medium">{formatAmount(expense.amount, currency)}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`More for ${expense.description || "expense"}`}>
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onSelect={() => setEditing(expense)}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canEdit && !group?.isArchived && (
                  <DropdownMenuItem onSelect={() => addAgain(expense)}>
                    <Copy aria-hidden="true" />
                    Add again
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setCommenting(expense)}>
                  <MessageCircle aria-hidden="true" />
                  Comments
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => remove(expense)} className="text-destructive focus:text-destructive">
                      <Trash2 aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
          );
        })}
      </ul>

      {sorted.length > shown && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
          <span>
            Showing {shown} of {sorted.length}
          </span>
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + pageSize)}>
            Show more
          </Button>
        </div>
      )}

      {editing && <EditExpenseForm expense={editing} isOpen={!!editing} onClose={() => setEditing(null)} />}
      {commenting && <ExpenseComments expense={commenting} isOpen={!!commenting} onClose={() => setCommenting(null)} />}

    </>
  );
}
