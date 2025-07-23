
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { UserProfile } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileFinancialSummaryProps {
  userProfile: UserProfile;
}

export const ProfileFinancialSummary: React.FC<ProfileFinancialSummaryProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { expenses, calculateBalances } = useExpenseStore();

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

  const userExpenses = expenses.filter(expense => expense.paidBy === user?.uid);
  const totalPaid = userExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate spending by category
  const categorySpending = userExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const handleExportData = () => {
    // Create CSV content
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Category', 'Group'],
      ...userExpenses.map(expense => [
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
    a.download = `${userProfile.displayName}_transactions.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
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
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
              <p className="text-muted-foreground">{userExpenses.length} transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Export Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportData} className="w-full" variant="outline">
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
            Spending by Category
          </CardTitle>
          <CardDescription>
            Your top spending categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCategories.map(([category, amount]) => {
              const percentage = (amount / totalPaid) * 100;
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
            {topCategories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No spending data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
