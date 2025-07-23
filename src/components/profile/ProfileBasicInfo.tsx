
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Clock, TrendingUp } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';

interface ProfileBasicInfoProps {
  user: User;
  userProfile: UserProfile;
}

export const ProfileBasicInfo: React.FC<ProfileBasicInfoProps> = ({ user, userProfile }) => {
  const { groups, expenses } = useExpenseStore();

  const userExpenses = expenses.filter(expense => expense.paidBy === user.uid);
  const totalExpensesAdded = userExpenses.length;
  const totalAmountPaid = userExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: userProfile.preferences?.currency || 'GBP'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <p className="text-lg font-semibold">{userProfile.displayName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
            <p className="text-lg">{userProfile.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Date Joined</label>
            <p className="text-lg">{formatDate(userProfile.createdAt)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Activity</label>
            <p className="text-lg">{formatDate(userProfile.lastLoginAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Personal Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold text-primary">{totalExpensesAdded}</p>
              <p className="text-sm text-muted-foreground">Expenses Added</p>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmountPaid)}</p>
              <p className="text-sm text-muted-foreground">Total Paid</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Groups Joined</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {groups.map(group => (
                <Badge key={group.id} variant="outline" className="cursor-pointer">
                  {group.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userExpenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                  <p className="text-sm text-muted-foreground">{expense.category}</p>
                </div>
              </div>
            ))}
            {userExpenses.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No recent transactions
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
