
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, PieChart, TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react';
import { UserProfile } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';
import { usePersonalExpenseStore } from '@/stores/personalExpenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { PersonalBudgetTracker } from '@/components/PersonalBudgetTracker';

interface ProfileFinancialSummaryProps {
  userProfile: UserProfile;
}

export const ProfileFinancialSummary: React.FC<ProfileFinancialSummaryProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { expenses, calculateBalances } = useExpenseStore();
  const { getTotalPersonalSpending, getPersonalSpendingByCategory } = usePersonalExpenseStore();

  const balances = calculateBalances();
  const userBalance = balances[user?.uid || ''] || 0;
  const isOwed = userBalance > 0;
  const owes = userBalance < 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: userProfile.preferences?.currency || 'GBP'
    }).format(Math.abs(amount));
  };

  // Group expenses (existing functionality)
  const userGroupExpenses = expenses.filter(expense => expense.paidBy.id === user?.uid);
  const totalGroupPaid = userGroupExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Personal expenses (new functionality)
  const totalPersonalSpending = user ? getTotalPersonalSpending(user.uid) : 0;
  const personalSpendingByCategory = user ? getPersonalSpendingByCategory(user.uid) : {};

  // Calculate spending by category for group expenses
  const groupCategorySpending = userGroupExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const topGroupCategories = Object.entries(groupCategorySpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topPersonalCategories = Object.entries(personalSpendingByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const handleExportGroupData = () => {
    // Create CSV content for group expenses
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Category', 'Group'],
      ...userGroupExpenses.map(expense => [
        expense.date.toLocaleDateString(),
        expense.description,
        expense.amount.toString(),
        expense.category,
        expense.groupId
      ])
    ].map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userProfile.displayName}_group_transactions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="personal">Personal Budget</TabsTrigger>
        <TabsTrigger value="groups">Group Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Combined Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {userBalance === 0 ? (
                  <div>
                    <p className="text-3xl font-bold text-green-600">£0.00</p>
                    <p className="text-muted-foreground">All settled up!</p>
                  </div>
                ) : isOwed ? (
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      +{formatCurrency(userBalance)}
                    </p>
                    <p className="text-muted-foreground">You're owed</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      -{formatCurrency(userBalance)}
                    </p>
                    <p className="text-muted-foreground">You owe</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Group Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold">{formatCurrency(totalGroupPaid)}</p>
                <p className="text-muted-foreground">{userGroupExpenses.length} transactions</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Personal Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold">{formatCurrency(totalPersonalSpending)}</p>
                <p className="text-muted-foreground">Personal budget</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold">{formatCurrency(totalGroupPaid + totalPersonalSpending)}</p>
                <p className="text-muted-foreground">Combined total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="personal" className="space-y-6">
        <PersonalBudgetTracker />
      </TabsContent>

      <TabsContent value="groups" className="space-y-6">
        {/* Group Activity Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {userBalance === 0 ? (
                  <div>
                    <p className="text-3xl font-bold text-green-600">£0.00</p>
                    <p className="text-muted-foreground">All settled up!</p>
                  </div>
                ) : isOwed ? (
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      +{formatCurrency(userBalance)}
                    </p>
                    <p className="text-muted-foreground">You're owed</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      -{formatCurrency(userBalance)}
                    </p>
                    <p className="text-muted-foreground">You owe</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Group Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold">{formatCurrency(totalGroupPaid)}</p>
                <p className="text-muted-foreground">{userGroupExpenses.length} transactions</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Export Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportGroupData} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Group Spending by Category
            </CardTitle>
            <CardDescription>
              Your top spending categories in groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topGroupCategories.map(([category, amount]) => {
                const percentage = (amount / totalGroupPaid) * 100;
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
              {topGroupCategories.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No group spending data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
