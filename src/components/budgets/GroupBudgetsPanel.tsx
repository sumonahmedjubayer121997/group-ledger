import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import { GroupBudgetManagement } from "@/components/GroupBudgetManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBudgetStore, type Budget } from "@/stores/budgetStore";
import { useExpenseStore, type Group } from "@/stores/expenseStore";
import { toCents, toCurrencyCode } from "@/lib/money";
import { BudgetCard } from "./BudgetCard";

/** A group's budgets, in the group's currency. Used on the group page and the Budgets page. */
export function GroupBudgetsPanel({ group, compactEmpty = false }: { group: Group; compactEmpty?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const budgets = useBudgetStore((s) => s.budgets);
  const getBudgetUsage = useBudgetStore((s) => s.getBudgetUsage);
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const expenses = useExpenseStore((s) => s.expenses);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const currency = toCurrencyCode(group.settings?.currency);
  const role = group.members.find((m) => m.id === user?.uid)?.role;
  const canWrite = role === "admin" || role === "member";
  const active = budgets.filter((b) => b.groupId === group.id && b.isActive);
  const usage = useMemo(
    () =>
      new Map(
        getBudgetUsage(
          expenses.filter((e) => e.groupId === group.id),
          undefined,
          group.id
        ).map((u) => [u.budgetId, toCents(u.spent)])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, group.id, budgets, getBudgetUsage]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteBudget(deleting.id, user?.uid || "", group.id);
      toast({ title: "Budget deleted", description: `"${deleting.name}" was removed.` });
    } catch {
      toast({ title: "Couldn't delete the budget", description: "Please try again.", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const addButton = canWrite && (
    <GroupBudgetManagement group={group}>
      <Button variant="outline" size="sm">
        <Plus aria-hidden="true" />
        Add budget
      </Button>
    </GroupBudgetManagement>
  );

  return (
    <div>
      {active.length === 0 ? (
        <div className={compactEmpty ? "flex items-center justify-between gap-3" : "py-6"}>
          <p className="text-sm text-muted-foreground">No budgets for this group yet.</p>
          <div className={compactEmpty ? "" : "mt-3"}>{addButton}</div>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {active.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                spentCents={usage.get(budget.id) ?? 0}
                currency={currency}
                detail={`${budget.type === "group_category" && budget.category ? budget.category : "Whole group"} · ${budget.period}`}
                onEdit={canWrite ? () => setEditing(budget) : undefined}
                onDelete={canWrite ? () => setDeleting(budget) : undefined}
              />
            ))}
          </ul>
          {addButton && <div className="mt-3">{addButton}</div>}
        </>
      )}

      {editing && (
        <GroupBudgetManagement group={group} editBudget={editing} onBudgetEdited={() => setEditing(null)}>
          <span hidden />
        </GroupBudgetManagement>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>The budget is removed for everyone in {group.name}. Expenses aren't affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
