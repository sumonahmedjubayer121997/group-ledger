import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Trash2, AlertTriangle, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { usePersonalExpenseStore } from '@/stores/personalExpenseStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalExpenseForm } from './PersonalExpenseForm';
import { format } from 'date-fns';

export const PersonalBudgetTracker: React.FC = () => {
  const { user } = useAuth();
  const { 
    personalExpenses, 
    getPersonalExpenses, 
    getTotalPersonalSpending,
    getPersonalSpendingByCategory,
    getPersonalSpendingByPeriod
  } = usePersonalExpenseStore();
  const { 
    getIndividualBudgets, 
    getBudgetUsage 
  } = useBudgetStore();

  if (!user) return null;

  const userPersonalExpenses = getPersonalExpenses(user.uid);
  const personalBudgets = getIndividualBudgets(user.uid);
  const totalSpending = getTotalPersonalSpending(user.uid);
  const spendingByCategory = getPersonalSpendingByCategory(user.uid);
  
  // Calculate budget usage for personal expenses
  const budgetUsages = getBudgetUsage(
    userPersonalExpenses.map(expense => ({
      ...expense,
      paidBy: { id: user.uid },
      groupId: undefined // Personal expenses don't have groupId
    })), 
    user.uid
  );

  const overBudgetUsages = budgetUsages.filter(usage => usage.isOverBudget);
  const nearLimitUsages = budgetUsages.filter(usage => usage.isNearLimit && !usage.isOverBudget);

  const recentExpenses = userPersonalExpenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const monthlySpending = getPersonalSpendingByPeriod(user.uid, 'monthly');
  const weeklySpending = getPersonalSpendingByPeriod(user.uid, 'weekly');

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Total Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">£{totalSpending.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{userPersonalExpenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">£{monthlySpending.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">£{weeklySpending.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {(overBudgetUsages.length > 0 || nearLimitUsages.length > 0) && (
        <div className="space-y-3">
          {overBudgetUsages.map((usage) => {
            const budget = personalBudgets.find(b => b.id === usage.budgetId);
            if (!budget) return null;

            return (
              <Alert key={budget.id} className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{budget.name}</span> is over budget!
                      <br />
                      <span className="text-sm">
                        Spent: £{usage.spent.toFixed(2)} of £{budget.limit.toFixed(2)} 
                        (Over by £{(usage.spent - budget.limit).toFixed(2)})
                      </span>
                    </div>
                    <Badge variant="destructive">
                      {usage.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}

          {nearLimitUsages.map((usage) => {
            const budget = personalBudgets.find(b => b.id === usage.budgetId);
            if (!budget) return null;

            return (
              <Alert key={budget.id} className="border-yellow-200 bg-yellow-50">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{budget.name}</span> is approaching its limit
                      <br />
                      <span className="text-sm">
                        Spent: £{usage.spent.toFixed(2)} of £{budget.limit.toFixed(2)} 
                        (Remaining: £{(budget.limit - usage.spent).toFixed(2)})
                      </span>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {usage.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Add Personal Expense */}
      <Card>
        <CardHeader>
          <CardTitle>Add Personal Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalExpenseForm />
        </CardContent>
      </Card>

      {/* Budget Progress */}
      {personalBudgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {personalBudgets.map((budget) => {
                const usage = budgetUsages.find(u => u.budgetId === budget.id);
                if (!usage) return null;

                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{budget.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          £{usage.spent.toFixed(2)} / £{budget.limit.toFixed(2)}
                        </span>
                        {usage.isOverBudget && (
                          <Badge variant="destructive" className="text-xs">
                            Over Budget
                          </Badge>
                        )}
                        {usage.isNearLimit && !usage.isOverBudget && (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                            Near Limit
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(usage.percentage, 100)} 
                      className={`h-2 ${usage.isOverBudget ? '[&>div]:bg-red-500' : usage.isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Personal Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Personal Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No personal expenses recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.category} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                    </p>
                    {expense.tags && expense.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {expense.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">£{expense.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending by Category */}
      {Object.keys(spendingByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(spendingByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = (amount / totalSpending) * 100;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          £{amount.toFixed(2)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};