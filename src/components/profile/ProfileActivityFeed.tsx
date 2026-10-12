
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';
import { useCurrencyOf, useUserBalances } from '@/stores/useLedger';
import { formatAmount } from '@/lib/money';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Activity, 
  Plus, 
  Users, 
  CreditCard, 
  CheckCircle,
  Clock,
  Trophy,
  Target,
  Award
} from 'lucide-react';

import { formatDateTime } from "@/lib/dates";
interface ProfileActivityFeedProps {
  userProfile: UserProfile;
}

export const ProfileActivityFeed: React.FC<ProfileActivityFeedProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { youOwe } = useUserBalances(user?.uid);
  const { expenses, groups } = useExpenseStore();
  const currencyOf = useCurrencyOf();

  const userExpenses = expenses.filter(expense => expense.paidBy.id === user?.uid);
  const userGroups = groups.filter(group => 
    group.members.some(member => member.id === user?.uid)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: userProfile.preferences?.currency || 'GBP'
    }).format(amount);
  };

  const formatDate = (date: Date) => formatDateTime(date);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Generate activity items
  const activityItems = [
    ...userExpenses.slice(0, 10).map(expense => ({
      id: expense.id,
      type: 'expense',
      title: `You paid ${formatAmount(expense.amount, currencyOf(expense.groupId))} for ${expense.description}`,
      description: `in ${groups.find(g => g.id === expense.groupId)?.name || 'Unknown Group'}`,
      timestamp: expense.date,
      icon: CreditCard,
      color: 'text-settled'
    })),
    ...userGroups.slice(0, 5).map(group => ({
      id: group.id,
      type: 'group',
      title: `You joined "${group.name}" group`,
      description: `${group.members.length} members`,
      timestamp: group.createdAt,
      icon: Users,
      color: 'text-muted-foreground'
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

  // Badges, only where the app actually knows the answer.
  const achievements = [
    {
      id: 'group-creator',
      name: 'Group creator',
      description: 'Started a group',
      icon: Users,
      earned: userGroups.some(g => g.createdBy === user?.uid),
      color: 'text-muted-foreground'
    },
    {
      id: 'all-square',
      name: 'All square',
      description: "You don't owe anyone right now",
      icon: CheckCircle,
      earned: youOwe.size === 0,
      color: 'text-settled'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements & Badges
          </CardTitle>
          <CardDescription>
            Your milestones and accomplishments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map(achievement => {
              const Icon = achievement.icon;
              return (
                <div 
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 ${
 achievement.earned 
 ? 'border-primary bg-primary/5' 
 : 'border-muted bg-muted/20'
 }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
 achievement.earned 
 ? 'bg-primary text-primary-foreground' 
 : 'bg-muted text-muted-foreground'
 }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{achievement.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.earned && (
                      <Badge variant="outline" className="text-settled">
                        Earned
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your latest actions and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full bg-muted ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {activityItems.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground">
                  Start by creating a group or adding an expense
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
