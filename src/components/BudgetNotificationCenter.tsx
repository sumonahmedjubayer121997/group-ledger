import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, DollarSign, Users, Target, User } from 'lucide-react';
import { useBudgetStore } from '@/stores/budgetStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';

interface BudgetNotificationCenterProps {
  groupId?: string;
}

export const BudgetNotificationCenter: React.FC<BudgetNotificationCenterProps> = ({ groupId }) => {
  const { user } = useAuth();
  const { getBudgetUsage, getIndividualBudgets, getAllGroupBudgets } = useBudgetStore();
  const { expenses } = useExpenseStore();

  // Get all relevant budgets
  const individualBudgets = getIndividualBudgets(user?.uid);
  const groupBudgets = groupId ? getAllGroupBudgets(groupId) : [];
  
  // Calculate budget usages
  const individualUsages = getBudgetUsage(expenses, user?.uid);
  const groupUsages = groupId ? getBudgetUsage(expenses, user?.uid, groupId) : [];

  // Filter for warnings and violations
  const individualWarnings = individualUsages.filter(usage => 
    individualBudgets.find(b => b.id === usage.budgetId && b.isActive) &&
    (usage.isOverBudget || usage.isNearLimit)
  );

  const groupWarnings = groupUsages.filter(usage => 
    groupBudgets.find(b => b.id === usage.budgetId && b.isActive) &&
    (usage.isOverBudget || usage.isNearLimit)
  );

  const getBudgetIcon = (budgetType: string) => {
    switch (budgetType) {
      case 'individual': return User;
      case 'group_category': return Target;
      case 'group_overall': return Users;
      case 'user_group': return DollarSign;
      default: return DollarSign;
    }
  };

  const renderWarning = (usage: any, budget: any, type: 'individual' | 'group') => {
    const Icon = getBudgetIcon(budget.type);
    
    return (
      <Alert key={usage.budgetId} className={usage.isOverBudget ? "border-red-500" : "border-yellow-500"}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {budget.name}
          <Badge variant={usage.isOverBudget ? "destructive" : "outline"}>
            {usage.isOverBudget ? "Over Budget" : "Near Limit"}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          <div className="space-y-1">
            <p>
              {budget.type === 'individual' && 'Personal budget'}
              {budget.type === 'group_category' && `Group category: ${budget.category}`}
              {budget.type === 'group_overall' && 'Overall group budget'}
              {budget.type === 'user_group' && 'Personal group spending'}
              {' • '}
              Spent: ${usage.spent.toFixed(2)} of ${budget.limit.toFixed(2)}
            </p>
            {usage.isOverBudget ? (
              <p className="text-red-600 font-medium">
                Over budget by ${(usage.spent - budget.limit).toFixed(2)}
              </p>
            ) : (
              <p className="text-yellow-600 font-medium">
                ${(budget.limit - usage.spent).toFixed(2)} remaining
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  if (individualWarnings.length === 0 && groupWarnings.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Budget Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {individualWarnings.map(usage => {
          const budget = individualBudgets.find(b => b.id === usage.budgetId);
          return budget ? renderWarning(usage, budget, 'individual') : null;
        })}
        
        {groupWarnings.map(usage => {
          const budget = groupBudgets.find(b => b.id === usage.budgetId);
          return budget ? renderWarning(usage, budget, 'group') : null;
        })}
      </CardContent>
    </Card>
  );
};