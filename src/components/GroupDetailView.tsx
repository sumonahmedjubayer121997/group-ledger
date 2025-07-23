import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Activity, 
  Plus, 
  Crown,
  Eye,
  User,
  MoreVertical,
  Archive
} from 'lucide-react';
import { GroupSettings } from './GroupSettings';
import { GroupActivityFeed } from './GroupActivityFeed';
import { GroupAnalytics } from './GroupAnalytics';
import { GroupMemberManagement } from './GroupMemberManagement';
import { GroupInviteDialog } from './GroupInviteDialog';
import { ExpenseForm } from './ExpenseForm';
import { RecurringExpenseDialog } from './RecurringExpenseDialog';

interface GroupDetailViewProps {
  group: Group;
  onBack: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity' | 'members' | 'settings'>('overview');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  
  const { getGroupExpenses, getBalances, archiveGroup } = useExpenseStore();
  
  const groupExpenses = getGroupExpenses(group.id);
  const balances = getBalances().filter(balance => 
    group.members.some(m => m.id === balance.from.id || m.id === balance.to.id)
  );

  const totalExpenses = groupExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const isUserAdmin = group.members.some(m => m.role === 'admin'); // This would be based on current user

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'viewer': return <Eye className="w-3 h-3 text-gray-500" />;
      default: return <User className="w-3 h-3 text-blue-500" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin': return <Badge variant="secondary" className="text-yellow-600 bg-yellow-50">Admin</Badge>;
      case 'viewer': return <Badge variant="outline" className="text-gray-600">Viewer</Badge>;
      default: return <Badge variant="outline" className="text-blue-600">Member</Badge>;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        {group.coverImage && (
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mb-4">
            <img src={group.coverImage} alt="Group cover" className="w-full h-full object-cover rounded-lg" />
          </div>
        )}
        
        <Card className="bg-white shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={onBack}>← Back</Button>
                <div className="flex items-center space-x-3">
                  {group.photo ? (
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={group.photo} />
                      <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{group.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    <p className="text-gray-600">{group.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={group.groupType === 'private' ? 'secondary' : 'outline'}>
                        {group.groupType}
                      </Badge>
                      {group.tags?.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
                
                <GroupInviteDialog group={group}>
                  <Button variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </GroupInviteDialog>
                
                {isUserAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">${totalExpenses.toFixed(2)}</div>
            <p className="text-sm text-gray-600">Total Spent</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{groupExpenses.length}</div>
            <p className="text-sm text-gray-600">Expenses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{group.members.length}</div>
            <p className="text-sm text-gray-600">Members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{balances.length}</div>
            <p className="text-sm text-gray-600">Pending Balances</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardHeader>
          <div className="flex space-x-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Members</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setActiveTab('members')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.members.slice(0, 5).map(member => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(member.role)}
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowRecurring(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Recurring Expense
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowInvite(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Invite Members
                  </Button>
                  {isUserAdmin && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={() => archiveGroup(group.id)}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Group
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && <GroupAnalytics group={group} />}
        {activeTab === 'activity' && <GroupActivityFeed group={group} />}
        {activeTab === 'members' && <GroupMemberManagement group={group} />}
        {activeTab === 'settings' && isUserAdmin && <GroupSettings group={group} />}
      </div>

      {/* Modals */}
      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
      />
      
      <RecurringExpenseDialog group={group}>
        <div />
      </RecurringExpenseDialog>
    </div>
  );
};