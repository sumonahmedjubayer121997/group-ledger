
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

  const userExpenses = expenses.filter(expense => expense.paidBy.id === user.uid);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Full Name</label>
            <p className="text-sm sm:text-lg font-semibold">{userProfile.displayName}</p>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email Address</label>
            <p className="text-sm sm:text-lg truncate">{userProfile.email}</p>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Date Joined</label>
            <p className="text-sm sm:text-lg">{formatDate(userProfile.createdAt)}</p>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Last Activity</label>
            <p className="text-sm sm:text-lg">{formatDate(userProfile.lastLoginAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Overview */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Personal Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-primary">{totalExpensesAdded}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Expenses Added</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-500/10 rounded-lg">
              <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalAmountPaid)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Paid</p>
            </div>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Groups Joined</label>
            <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
              {groups.map(group => (
                <Badge key={group.id} variant="outline" className="cursor-pointer text-xs">
                  {group.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3">
            {userExpenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{expense.description}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatDate(expense.date)}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <p className="font-semibold text-sm sm:text-base">{formatCurrency(expense.amount)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{expense.category}</p>
                </div>
              </div>
            ))}
            {userExpenses.length === 0 && (
              <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                No recent transactions
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
