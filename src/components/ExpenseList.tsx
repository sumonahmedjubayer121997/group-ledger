import { useMemo, useState } from "react";
import { MessageCircle, MoreHorizontal, Pencil, Receipt, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditExpenseForm } from "@/components/EditExpenseForm";
import { ExpenseComments } from "@/components/ExpenseComments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useExpenseStore, type Expense } from "@/stores/expenseStore";
import { expenseShares, formatAmount, formatMoney, makeResolver, toCurrencyCode } from "@/lib/money";
import { formatCalendarDate, formatDate } from "@/lib/dates";

interface ExpenseListProps {
  expenses: Expense[];
  /** Show which group each expense belongs to (lists that span groups). */
  showGroup?: boolean;
  pageSize?: number;
  emptyText?: string;
}

/** Expenses newest first, with your share, and edit / comments / delete for people who can write. */
export function ExpenseList({ expenses, showGroup = false, pageSize = 20, emptyText = "No expenses yet." }: ExpenseListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const groups = useExpenseStore((s) => s.groups);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const [shown, setShown] = useState(pageSize);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [commenting, setCommenting] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const byGroup = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const sorted = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

  const rows = useMemo(
    () =>
      sorted.slice(0, shown).map((expense) => {
        const group = byGroup.get(expense.groupId);
        const currency = toCurrencyCode(group?.settings?.currency);
        const resolve = makeResolver(group?.members ?? []);
        const me = user ? resolve({ id: user.uid, email: user.email }) : null;
        const share = me ? expenseShares(expense, resolve).get(me) ?? 0 : 0;
        const role = group?.members.find((m) => m.id === user?.uid)?.role;
        return { expense, group, currency, share, canEdit: role === "admin" || role === "member" };
      }),
    [sorted, shown, byGroup, user]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteExpense(deleting.id, deleting.groupId);
      toast({ title: "Expense deleted", description: `"${deleting.description}" was removed.` });
    } catch {
      toast({ title: "Couldn't delete the expense", description: "Please try again.", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y">
        {rows.map(({ expense, group, currency, share, canEdit }) => (
          <li key={expense.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{expense.description || "Expense"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {showGroup && group ? `${group.name} · ` : ""}
                {expense.paidBy?.name ?? "Someone"} paid ·{" "}
                <time dateTime={new Date(expense.date).toISOString()} title={formatCalendarDate(expense.date)}>
                  {formatDate(expense.date)}
                </time>
                {expense.category ? ` · ${expense.category}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="money font-medium">{formatAmount(expense.amount, currency)}</p>
              <p className="money text-xs text-muted-foreground">
                {share > 0 ? `your share ${formatMoney(share, currency)}` : "not involved"}
              </p>
            </div>
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
                <DropdownMenuItem onSelect={() => setCommenting(expense)}>
                  <MessageCircle aria-hidden="true" />
                  Comments
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setDeleting(expense)} className="text-destructive focus:text-destructive">
                      <Trash2 aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
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

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.description}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The expense is removed for everyone in the group and balances are recalculated. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
