
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Group } from '@/stores/expenseStore';
import { Users, Calendar, User } from 'lucide-react';

interface GroupListProps {
  groups: Group[];
}

export const GroupList: React.FC<GroupListProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-green-500" />
            <span>Groups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No groups yet</p>
            <p className="text-sm text-gray-500">Create your first group to start tracking shared expenses!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-green-500" />
            <span>Groups</span>
          </div>
          <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{group.name}</h4>
                <div className="flex -space-x-2">
                  {group.members.slice(0, 3).map((member, index) => (
                    <div
                      key={member.id}
                      className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white"
                    >
                      <span className="text-blue-600 font-medium text-xs">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  ))}
                  {group.members.length > 3 && (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
                      <span className="text-gray-600 font-medium text-xs">
                        +{group.members.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{group.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{group.members.length} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
