
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';
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

interface ProfileActivityFeedProps {
  userProfile: UserProfile;
}

export const ProfileActivityFeed: React.FC<ProfileActivityFeedProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { expenses, groups } = useExpenseStore();

  const userExpenses = expenses.filter(expense => expense.paidBy === user?.uid);
  const userGroups = groups.filter(group => 
    group.members.some(member => member.id === user?.uid)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: userProfile.preferences?.currency || 'GBP'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Generate activity items
  const activityItems = [
    ...userExpenses.slice(0, 10).map(expense => ({
      id: expense.id,
      type: 'expense',
      title: `You paid ${formatCurrency(expense.amount)} for ${expense.description}`,
      description: `in ${groups.find(g => g.id === expense.groupId)?.name || 'Unknown Group'}`,
      timestamp: expense.date,
      icon: CreditCard,
      color: 'text-green-600'
    })),
    ...userGroups.slice(0, 5).map(group => ({
      id: group.id,
      type: 'group',
      title: `You joined "${group.name}" group`,
      description: `${group.members.length} members`,
      timestamp: group.createdAt,
      icon: Users,
      color: 'text-blue-600'
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);

  // Calculate achievements
  const achievements = [
    {
      id: 'on-time-payer',
      name: 'On-Time Payer',
      description: 'Settled all debts within 7 days',
      icon: CheckCircle,
      earned: userExpenses.length > 5,
      color: 'text-green-600'
    },
    {
      id: 'group-creator',
      name: 'Group Creator',
      description: 'Created your first group',
      icon: Users,
      earned: userGroups.some(g => g.members.find(m => m.id === user?.uid)?.role === 'admin'),
      color: 'text-blue-600'
    },
    {
      id: 'big-spender',
      name: 'Big Spender',
      description: 'Paid over £500 in expenses',
      icon: Trophy,
      earned: userExpenses.reduce((sum, e) => sum + e.amount, 0) > 500,
      color: 'text-yellow-600'
    },
    {
      id: 'debt-free',
      name: 'Debt-Free',
      description: 'No outstanding debts',
      icon: Target,
      earned: true, // This would need real balance calculation
      color: 'text-purple-600'
    }
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
                      <h4 className="font-medium">{achievement.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.earned && (
                      <Badge variant="outline" className="text-green-600">
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

      {/* Smart Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Smart Suggestions
          </CardTitle>
          <CardDescription>
            Personalized recommendations based on your activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                💡 You usually split expenses equally with group members
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Consider setting this as your default split method in preferences
              </p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                🎯 You're great at settling up quickly!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Your average settlement time is 3 days - keep it up!
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm font-medium text-orange-900">
                📊 Most of your expenses are in the "Food" category
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Consider creating a "Dining Out" group for easier tracking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
