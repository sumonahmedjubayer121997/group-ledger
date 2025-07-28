import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { useBudgetStore } from '../stores/budgetStore';
import { useExpenseStore } from '../stores/expenseStore';

export const BudgetAlerts: React.FC = () => {
  const { getBudgetUsage, budgets } = useBudgetStore();
  const { expenses } = useExpenseStore();

  const budgetUsage = getBudgetUsage(expenses);
  const alerts = budgetUsage.filter(usage => usage.isNearLimit || usage.isOverBudget);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const budget = budgets.find(b => b.id === alert.budgetId);
        if (!budget) return null;

        const isOverBudget = alert.isOverBudget;
        const remaining = budget.limit - alert.spent;

        return (
          <Alert key={alert.budgetId} className={`border-l-4 ${isOverBudget ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
            <AlertTriangle className={`h-4 w-4 ${isOverBudget ? 'text-red-500' : 'text-yellow-500'}`} />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{budget.name}</span>
                  <Badge variant={isOverBudget ? "destructive" : "secondary"}>
                    {isOverBudget ? 'Over Budget' : 'Near Limit'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Spent ${alert.spent.toFixed(2)} of ${budget.limit.toFixed(2)} 
                  {isOverBudget ? (
                    <span className="text-red-600 font-medium"> (${Math.abs(remaining).toFixed(2)} over)</span>
                  ) : (
                    <span> (${remaining.toFixed(2)} remaining)</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-yellow-600'}`}>
                  {alert.percentage.toFixed(0)}%
                </div>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};