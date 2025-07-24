import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
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
  Archive,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';
import { GroupSettings } from './GroupSettings';
import { GroupActivityFeed } from './GroupActivityFeed';
import { GroupAnalytics } from './GroupAnalytics';
import { GroupMemberManagement } from './GroupMemberManagement';
import { GroupInviteDialog } from './GroupInviteDialog';
import { ExpenseForm } from './ExpenseForm';
import { RecurringExpenseDialog } from './RecurringExpenseDialog';
import { GroupDetailMobileNav } from './GroupDetailMobileNav';
import { GroupCommunicationHub } from './GroupCommunicationHub';

interface GroupDetailViewProps {
  group: Group;
  onBack: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity' | 'members' | 'settings' | 'communication'>('overview');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  
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
    { id: 'communication', label: 'Communication', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
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
        <div className="px-3 py-3 bg-white border-b">
          <div className="flex items-center space-x-3 mb-3">
            {group.photo ? (
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={group.photo} />
                <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{group.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-gray-600 truncate">{group.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={group.groupType === 'private' ? 'secondary' : 'outline'} className="text-xs px-2 py-1">
              {group.groupType}
            </Badge>
            {group.tags?.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs px-2 py-1">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`${isMobile ? 'px-3 py-3' : 'py-6'}`}>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-4 gap-4'}`}>
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold text-green-600 truncate`}>
                ${totalExpenses.toFixed(2)}
              </div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>Total Spent</p>
            </CardContent>
          </Card>
          
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold text-blue-600`}>
                {groupExpenses.length}
              </div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>Expenses</p>
            </CardContent>
          </Card>
          
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold text-purple-600`}>
                {group.members.length}
              </div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>Members</p>
            </CardContent>
          </Card>
          
          <Card className={isMobile ? 'shadow-sm' : ''}>
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'} text-center`}>
              <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold text-orange-600`}>
                {balances.length}
              </div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>Balances</p>
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
      <div className={`${isMobile ? 'px-3 py-3' : 'p-6'} ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                <Card className={isMobile ? 'shadow-sm' : ''}>
                  <CardHeader className={isMobile ? 'pb-3' : ''}>
                    <CardTitle className="flex items-center justify-between">
                      <span className={`${isMobile ? 'text-base' : 'text-xl'} font-semibold`}>Recent Members</span>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('members')}
                        className={isMobile ? 'text-xs px-2 py-1 h-7' : ''}
                      >
                        View All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={isMobile ? 'pt-0' : ''}>
                    <div className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                      {group.members.slice(0, isMobile ? 3 : 5).map(member => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Avatar className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0`}>
                              {member.photoURL ? (
                                <AvatarImage src={member.photoURL} alt={member.name} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium truncate`}>{member.name}</div>
                              <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 truncate`}>{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {getRoleIcon(member.role)}
                            {!isMobile && getRoleBadge(member.role)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={isMobile ? 'shadow-sm' : ''}>
                  <CardHeader className={isMobile ? 'pb-3' : ''}>
                    <CardTitle className={`${isMobile ? 'text-base' : 'text-xl'} font-semibold`}>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className={isMobile ? 'pt-0' : ''}>
                    <div className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left"
                        onClick={() => setShowRecurring(true)}
                        size={isMobile ? "sm" : "default"}
                      >
                        <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Add Recurring Expense</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left"
                        onClick={() => setShowInvite(true)}
                        size={isMobile ? "sm" : "default"}
                      >
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Invite Members</span>
                      </Button>
                      {isUserAdmin && (
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left text-red-600 hover:text-red-700"
                          onClick={() => archiveGroup(group.id)}
                          size={isMobile ? "sm" : "default"}
                        >
                          <Archive className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">Archive Group</span>
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
              <GroupCommunicationHub group={group} isAdmin={isUserAdmin} />
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
