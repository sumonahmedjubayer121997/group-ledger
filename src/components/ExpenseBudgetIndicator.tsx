import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useBudgetStore } from '@/stores/budgetStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { AlertTriangle } from 'lucide-react';

interface ExpenseBudgetIndicatorProps {
  expense: any;
}

export const ExpenseBudgetIndicator: React.FC<ExpenseBudgetIndicatorProps> = ({ expense }) => {
  const { getAllGroupBudgets, getBudgetUsage } = useBudgetStore();
  const { expenses } = useExpenseStore();

  // Get budgets for this expense's group
  const groupBudgets = expense.groupId ? getAllGroupBudgets(expense.groupId) : [];
  const activeBudgets = groupBudgets.filter(budget => budget.isActive);

  if (activeBudgets.length === 0) return null;

  // Get expenses up to and including this expense date for budget calculation
  const expenseDate = new Date(expense.date);
  const relevantExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
    return e.groupId === expense.groupId && eDate <= expenseDate;
  });

  const budgetUsages = getBudgetUsage(relevantExpenses, expense.groupId);

  // Check if any budget is over limit
  const overBudgetUsages = budgetUsages.filter(usage => usage.isOverBudget);
  
  // Check for category-specific budget violations
  const categoryBudgetUsage = budgetUsages.find(usage => {
    const budget = activeBudgets.find(b => b.id === usage.budgetId);
    return budget?.category === expense.category && usage.isOverBudget;
  });

  // Check for overall budget violations
  const overallBudgetUsage = budgetUsages.find(usage => {
    const budget = activeBudgets.find(b => b.id === usage.budgetId);
    return (budget?.category === 'overall' || !budget?.category) && usage.isOverBudget;
  });

  if (categoryBudgetUsage || overallBudgetUsage || overBudgetUsages.length > 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Over Budget
      </Badge>
    );
  }

  return null;
};