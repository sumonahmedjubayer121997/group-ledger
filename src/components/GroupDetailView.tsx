
import React, { useState,useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import {GroupCommunicationHub} from './GroupCommunicationHub';
import { 
  Users, 
  MessageCircle,
  Settings, 
  BarChart3, 
  Activity, 
  Plus, 
  Crown,
  Eye,
  User,
  MoreVertical,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { GroupSettings } from './GroupSettings';
import { GroupActivityFeed } from './GroupActivityFeed';
import { GroupAnalytics } from './GroupAnalytics';
import { GroupMemberManagement } from './GroupMemberManagement';
import { GroupInviteDialog } from './GroupInviteDialog';
import { ExpenseForm } from './ExpenseForm';
import { RecurringExpenseDialog } from './RecurringExpenseDialog';
import { GroupDetailMobileNav } from './GroupDetailMobileNav';
import { fetchGroupMembersWithPhotos } from '@/components/firebaseComponents/FetchGroupMembersWithPhotos';

interface GroupDetailViewProps {
  group: Group;
  onBack: () => void;
}

type MemberWithPhoto = {
  userId: string;
  name: string;
  photoURL: string | null;
  role?: string;
  email?: string;
  [key: string]: any; // Allow additional properties
};


export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity' | 'members' |'communication'  | 'settings'>('overview');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [groupMembers, setGroupMembers] = useState<MemberWithPhoto[]>([]);
  const [groupId, setGroupId] = useState(group.id || '');

  
 useEffect(() => {
    const loadMembers = async () => {
      if (!groupId) return;
      const members = await fetchGroupMembersWithPhotos(groupId);
      setGroupMembers(members);
    };

    loadMembers();
  }, [groupId]); // 👈 Watch for groupId changes

  const { getGroupExpenses, getBalances, archiveGroup } = useExpenseStore();
  const isMobile = useIsMobile();
  
  const groupExpenses = getGroupExpenses(group.id);
  const balances = getBalances().filter(balance => 
    group.members.some(m => m.id === balance.from.id || m.id === balance.to.id)
  );

  const totalExpenses = groupExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const isUserAdmin = group.members.some(m => m.role === 'admin');

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
    { id: 'communication', label: 'Com', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => setShowExpenseForm(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
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
      )}

      {/* Mobile Group Info */}
      {isMobile && (
        <div className="px-4 py-4 bg-white border-b">
          <div className="flex items-center space-x-3 mb-3">
            {group.photo ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={group.photo} />
                <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{group.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-bold">{group.name}</h1>
              <p className="text-sm text-gray-600 line-clamp-1">{group.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={group.groupType === 'private' ? 'secondary' : 'outline'} className="text-xs">
              {group.groupType}
            </Badge>
            {group.tags?.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`${isMobile ? 'px-4 py-4' : 'py-6'}`}>
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'} gap-4`}>
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
                ${totalExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-gray-600">Total Spent</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-blue-600`}>
                {groupExpenses.length}
              </div>
              <p className="text-xs text-gray-600">Expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-purple-600`}>
                {group.members.length}
              </div>
              <p className="text-xs text-gray-600">Members</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-orange-600`}>
                {balances.length}
              </div>
              <p className="text-xs text-gray-600">Balances</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Navigation */}
      <GroupDetailMobileNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Desktop Navigation Tabs */}
      {!isMobile && (
        <Card className="mx-6">
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
      )}

      {/* Tab Content */}
      <div className={`${isMobile ? 'px-4 py-4' : 'p-6'} space-y-6`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className={isMobile ? 'text-lg' : 'text-xl'}>Recent Members</span>
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
                      {group.members.slice(0, isMobile ? 3 : 5).map(member => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                           <Avatar
                                                 key={member.id}
                                                 className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white"
                                               >
                                                 {member.photoURL ? (
                                                   <AvatarImage src={member.photoURL} alt={member.name} />
                                                 ) : null}
                                                 <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                   {member.name.charAt(0).toUpperCase()}
                                                 </AvatarFallback>
                                               </Avatar>
                            <div>
                              <div className="font-medium text-sm">{member.name}</div>
                              <div className="text-xs text-gray-500">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(member.role)}
                            {!isMobile && getRoleBadge(member.role)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowRecurring(true)}
                        size={isMobile ? "sm" : "default"}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Recurring Expense
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowInvite(true)}
                        size={isMobile ? "sm" : "default"}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Invite Members
                      </Button>
                      {isUserAdmin && (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-red-600 hover:text-red-700"
                          onClick={() => archiveGroup(group.id)}

                          size={isMobile ? "sm" : "default"}
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
            {activeTab === 'communication' && (
              <GroupCommunicationHub group={group} isAdmin />
            )}
            {activeTab === 'settings' && isUserAdmin && <GroupSettings group={group} />}
          </motion.div>
        </AnimatePresence>
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
