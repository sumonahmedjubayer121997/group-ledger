import { useEffect } from 'react';
import { useBudgetStore } from '@/stores/budgetStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useToast } from '@/hooks/use-toast';

export const useBudgetValidation = (groupId?: string) => {
  const { getAllGroupBudgets, getBudgetUsage } = useBudgetStore();
  const { expenses } = useExpenseStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!groupId) return;

    const groupBudgets = getAllGroupBudgets(groupId);
    const activeBudgets = groupBudgets.filter((budget) => budget.isActive);
    const groupExpenses = expenses.filter((expense) => expense.groupId === groupId);
    const budgetUsages = getBudgetUsage(groupExpenses, undefined, groupId);

    // Check for newly exceeded budgets
    budgetUsages.forEach((usage) => {
      const budget = activeBudgets.find((b) => b.id === usage.budgetId);
      if (!budget) return;

      if (usage.isOverBudget && usage.percentage > 100) {
        const overage = usage.spent - budget.limit;
        toast({
          title: "Budget Exceeded!",
          description: `${budget.name} is over budget by $${overage.toFixed(2)}`,
          variant: "destructive",
        });
      } else if (usage.isNearLimit && usage.percentage >= budget.alertThreshold) {
        const remaining = budget.limit - usage.spent;
        toast({
          title: "Budget Alert",
          description: `${budget.name} is approaching its limit. $${remaining.toFixed(2)} remaining.`,
          variant: "default",
        });
      }
    });
  }, [expenses, groupId, getAllGroupBudgets, getBudgetUsage, toast]);
};