
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Receipt, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { ExpenseForm } from '@/components/ExpenseForm';
import { GroupForm } from '@/components/GroupForm';
import { BalanceCard } from '@/components/BalanceCard';
import { RecentExpenses } from '@/components/RecentExpenses';
import { ExpenseChart } from '@/components/ExpenseChart';
import { GroupList } from '@/components/GroupList';
import { SettlementHistory } from '@/components/SettlementHistory';
import { useExpenseStore } from '@/stores/expenseStore';

const Index = () => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const { expenses, groups, getTotalExpenses, getBalances } = useExpenseStore();

  const totalExpenses = getTotalExpenses();
  const balances = getBalances();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SplitSmart</h1>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowExpenseForm(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
              <Button
                onClick={() => setShowGroupForm(true)}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Users className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
              <Receipt className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-gray-500">Across {groups.length} groups</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Groups</CardTitle>
              <Users className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{groups.length}</div>
              <p className="text-xs text-gray-500">With {expenses.length} expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">${(totalExpenses * 0.7).toFixed(2)}</div>
              <p className="text-xs text-green-600">+12% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Balances and Groups */}
          <div className="lg:col-span-1 space-y-6">
            <BalanceCard balances={balances} />
            <GroupList groups={groups} />
          </div>

          {/* Right Column - Expenses and Chart */}
          <div className="lg:col-span-2 space-y-6">
            <ExpenseChart expenses={expenses} />
            <RecentExpenses expenses={expenses} />
            <SettlementHistory />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
      />
      <GroupForm
        isOpen={showGroupForm}
        onClose={() => setShowGroupForm(false)}
      />
    </div>
  );
};

export default Index;
