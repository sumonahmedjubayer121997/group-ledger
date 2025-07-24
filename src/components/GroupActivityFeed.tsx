import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback,AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { Activity, DollarSign, Users, Trash, Edit, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { fetchGroupMembersWithPhotos } from '@/components/firebaseComponents/FetchGroupMembersWithPhotos'; // adjust path


interface GroupActivityFeedProps {
  group: Group;
}

export const GroupActivityFeed: React.FC<GroupActivityFeedProps> = ({ group }) => {
  const { getGroupActivities } = useExpenseStore();
  const activities = getGroupActivities(group.id);
  const [enrichedActivities, setEnrichedActivities] = useState<any[]>([]);

  useEffect(() => {
  const enrichActivities = async () => {
    const members = await fetchGroupMembersWithPhotos(group.id);

    const enriched = activities.map((activity) => {
      const matchedMember = members.find((m) => m.userId === activity.userId);
      return {
        ...activity,
        photoURL: matchedMember?.photoURL || null,
        userName: matchedMember?.name || activity.userName || 'Unknown',
      };
    });

    setEnrichedActivities(enriched);
  };

  enrichActivities();
}, [group.id, activities]);


 const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };


  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'expense_added':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'expense_updated':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'expense_deleted':
        return <Trash className="w-4 h-4 text-red-500" />;
      case 'member_added':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'member_removed':
        return <UserMinus className="w-4 h-4 text-red-500" />;
      case 'settlement_made':
        return <DollarSign className="w-4 h-4 text-purple-500" />;
      case 'group_updated':
        return <Edit className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'expense_added':
        return 'border-green-200 bg-green-50';
      case 'expense_updated':
        return 'border-blue-200 bg-blue-50';
      case 'expense_deleted':
        return 'border-red-200 bg-red-50';
      case 'member_added':
        return 'border-green-200 bg-green-50';
      case 'member_removed':
        return 'border-red-200 bg-red-50';
      case 'settlement_made':
        return 'border-purple-200 bg-purple-50';
      case 'group_updated':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Activity Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No recent activity</p>
            <p className="text-sm text-gray-500">Group activities will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>Activity Feed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {enrichedActivities.map((activity) => (
  <div
    key={activity.id}
    className={`p-4 rounded-lg border-l-4 ${getActivityColor(activity.type)}`}
  >
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center">
          {getActivityIcon(activity.type)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-1 ring-gray-200 shadow-sm">
            <AvatarImage
              src={activity.photoURL || undefined}
              alt={activity.userName}
              className="object-cover"
            />
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(activity.userName || 'U')}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm truncate">{activity.userName}</span>
          <Badge variant="outline" className="text-xs capitalize">
            {activity.type.replace('_', ' ')}
          </Badge>
        </div>

        <p className="text-sm text-gray-700 mt-1">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">
          {format(new Date(activity.timestamp), 'MMM dd, yyyy at h:mm a')}
        </p>
      </div>
    </div>
  </div>
))}

        </div>
      </CardContent>
    </Card>
  );
};