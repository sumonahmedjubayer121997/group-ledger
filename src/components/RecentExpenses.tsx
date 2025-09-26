import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Expense, useExpenseStore } from "@/stores/expenseStore";
import {
  Receipt,
  Calendar,
  User,
  Tag,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Group,
} from "lucide-react";
import { ExpenseForm } from "./ExpenseForm";
import { EditExpenseForm } from "./EditExpenseForm";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { getGroupName } from "./firebaseComponents/FetchGroupNameUsingId";

interface RecentExpensesProps {
  expenses: Expense[];
}

export const RecentExpenses: React.FC<RecentExpensesProps> = ({ expenses }) => {
  const { deleteExpense } = useExpenseStore();
  const { toast } = useToast();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [groupNames, setGroupNames] = useState<(string | null)[]>([]);
  const [loadingGroupNames, setLoadingGroupNames] = useState(true);

  // Memoize recent expenses to prevent unnecessary re-renders
  const recentExpenses = useMemo(() => {
    return expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [expenses]);

  // Fetch group names when recentExpenses changes
  useEffect(() => {
    const fetchGroupNames = async () => {
      if (recentExpenses.length === 0) {
        setGroupNames([]);
        setLoadingGroupNames(false);
        return;
      }

      setLoadingGroupNames(true);
      const names: (string | null)[] = [];

      // Use a cache to avoid duplicate calls for the same groupId
      const cache: Record<string, string | null> = {};

      for (const expense of recentExpenses) {
        if (cache[expense.groupId] !== undefined) {
          names.push(cache[expense.groupId]);
          continue;
        }

        const name = await getGroupName(expense.groupId);
        cache[expense.groupId] = name;
        names.push(name);
      }

      setGroupNames(names);
      setLoadingGroupNames(false);
    };

    fetchGroupNames();
  }, [recentExpenses]);

  const handleDeleteExpense = async (expense: Expense) => {
    try {
      await deleteExpense(expense.id, expense.groupId);
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  if (recentExpenses.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center space-x-2 text-lg sm:text-2xl text-card-foreground">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span>Recent Expenses</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-4 sm:px-6 sm:pb-6">
          <div className="text-center py-6 sm:py-8">
            <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
            <p className="text-muted-foreground mb-2 text-sm sm:text-base">
              No expenses yet
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground/70">
              Add your first expense to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <span className="text-lg sm:text-2xl text-card-foreground">
              Recent Expenses
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowExpenseForm(true)}
              size="sm"
              variant="outline"
              className="text-green-500 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 dark:text-green-400 dark:border-green-400/30 dark:hover:bg-green-400/10"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 dark:text-blue-400 dark:border-blue-400/30 dark:hover:bg-blue-400/10 hidden sm:flex"
            >
              View All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-0 pb-4 sm:px-6 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          {recentExpenses.map((expense, index) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
            >
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 border border-primary/20">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-card-foreground text-sm sm:text-base truncate">
                    {expense.description}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-muted-foreground space-y-1 sm:space-y-0">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        Paid by {expense.paidBy.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {formatDistanceToNow(new Date(expense.date), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Group className="w-3 h-3 flex-shrink-0" />
                      {loadingGroupNames ? (
                        <span className="text-xs text-muted-foreground">
                          Loading...
                        </span>
                      ) : (
                        <span className="truncate">
                          {groupNames[index] || "Unknown Group"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-card-foreground text-sm sm:text-base">
                    ${expense.amount.toFixed(2)}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-border/50 text-muted-foreground"
                  >
                    {expense.category}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleEditExpense(expense)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this expense? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteExpense(expense)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 sm:hidden">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-blue-500 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50 dark:text-blue-400 dark:border-blue-400/30 dark:hover:bg-blue-400/10"
          >
            View All
          </Button>
        </div>
      </CardContent>

      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
      />

      {editingExpense && (
        <EditExpenseForm
          expense={editingExpense}
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </Card>
  );
};
