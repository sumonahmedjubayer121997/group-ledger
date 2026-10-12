
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
import { useUserBalances } from '@/stores/useLedger';
import { formatMoney, formatTotals, toCents, toCurrencyCode } from '@/lib/money';

import { formatCalendarDate } from "@/lib/dates";
interface ProfileFinancialSummaryProps {
  userProfile: UserProfile;
}

const addTo = (totals: Map<string, number>, currency: string, cents: number) =>
  totals.set(currency, (totals.get(currency) ?? 0) + cents);

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** "You're owed £269.46" / "You owe $12.00", one line per currency. */
const BalanceLines: React.FC<{ owedToYou: Map<string, number>; youOwe: Map<string, number> }> = ({ owedToYou, youOwe }) => {
  if (owedToYou.size === 0 && youOwe.size === 0) {
    return (
      <div>
        <p className="text-3xl font-bold text-settled">Settled</p>
        <p className="text-muted-foreground">Nobody owes anything</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {owedToYou.size > 0 && (
        <div>
          <p className="text-2xl font-bold tabular-nums text-settled">{formatTotals(owedToYou)}</p>
          <p className="text-muted-foreground">You're owed</p>
        </div>
      )}
      {youOwe.size > 0 && (
        <div>
          <p className="text-2xl font-bold tabular-nums text-destructive">{formatTotals(youOwe)}</p>
          <p className="text-muted-foreground">You owe</p>
        </div>
      )}
    </div>
  );
};

export const ProfileFinancialSummary: React.FC<ProfileFinancialSummaryProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { expenses, groups } = useExpenseStore();
  const { getTotalPersonalSpending } = usePersonalExpenseStore();
  const { owedToYou, youOwe } = useUserBalances(user?.uid);

  const currencyOfGroup = new Map(groups.map((g) => [g.id, toCurrencyCode(g.settings?.currency)]));
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const personalCurrency = toCurrencyCode(userProfile.preferences?.currency);

  // What you paid in groups, per currency
  const userGroupExpenses = expenses.filter(expense => expense.paidBy.id === user?.uid);
  const groupPaid = new Map<string, number>();
  for (const e of userGroupExpenses) addTo(groupPaid, currencyOfGroup.get(e.groupId) ?? 'USD', toCents(e.amount));

  // Personal expenses use your preferred currency
  const personalCents = toCents(user ? getTotalPersonalSpending(user.uid) : 0);

  const totalSpending = new Map(groupPaid);
  if (personalCents) addTo(totalSpending, personalCurrency, personalCents);

  // Group spending by category, kept per currency
  const categoryRows = new Map<string, { category: string; currency: string; cents: number }>();
  for (const e of userGroupExpenses) {
    const currency = currencyOfGroup.get(e.groupId) ?? 'USD';
    const category = e.category?.trim() || 'Uncategorised';
    const key = `${currency}|${category}`;
    const row = categoryRows.get(key) ?? { category, currency, cents: 0 };
    row.cents += toCents(e.amount);
    categoryRows.set(key, row);
  }
  const topGroupCategories = [...categoryRows.values()].sort((a, b) => b.cents - a.cents).slice(0, 5);
  const largestIn = (currency: string) =>
    Math.max(1, ...topGroupCategories.filter((r) => r.currency === currency).map((r) => r.cents));

  const handleExportGroupData = () => {
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Currency', 'Category', 'Group'],
      ...userGroupExpenses.map(expense => [
        formatCalendarDate(expense.date),
        expense.description,
        (toCents(expense.amount) / 100).toFixed(2),
        currencyOfGroup.get(expense.groupId) ?? '',
        expense.category,
        groupName.get(expense.groupId) ?? expense.groupId,
      ])
    ].map(row => row.map(csvCell).join(',')).join('\n');

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
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
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
                <BalanceLines owedToYou={owedToYou} youOwe={youOwe} />
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
                <p className="text-2xl font-bold tabular-nums">{formatTotals(groupPaid)}</p>
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
                <p className="text-2xl font-bold tabular-nums">{formatMoney(personalCents, personalCurrency)}</p>
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
                <p className="text-2xl font-bold tabular-nums">{formatTotals(totalSpending)}</p>
                <p className="text-muted-foreground">Combined total</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
                <BalanceLines owedToYou={owedToYou} youOwe={youOwe} />
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
                <p className="text-2xl font-bold tabular-nums">{formatTotals(groupPaid)}</p>
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
              {topGroupCategories.map((row) => (
                <div key={`${row.currency}-${row.category}`} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{row.category}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatMoney(row.cents, row.currency)}
                    </span>
                  </div>
                  <Progress value={(row.cents / largestIn(row.currency)) * 100} className="h-2" />
                </div>
              ))}
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
