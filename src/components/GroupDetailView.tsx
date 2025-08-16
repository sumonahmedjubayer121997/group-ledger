import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useExpenseStore, Group } from "@/stores/expenseStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { GroupCommunicationHub } from "./GroupCommunicationHub";
import { fetchGroupById } from "@/services/firebaseService";
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
  Archive,
  ArrowLeft,
  Target,
} from "lucide-react";
import { GroupSettings } from "./GroupSettings";
import { GroupActivityFeed } from "./GroupActivityFeed";
import { GroupAnalytics } from "./GroupAnalytics";
import { GroupMemberManagement } from "./GroupMemberManagement";
import { GroupInviteDialog } from "./GroupInviteDialog";
import { ExpenseForm } from "./ExpenseForm";
import { RecurringExpenseDialog } from "./RecurringExpenseDialog";
import { GroupDetailMobileNav } from "./GroupDetailMobileNav";
import { GroupExpensesList } from "./GroupExpensesList";
import { GroupBudgetManagement } from "./GroupBudgetManagement";
import { GroupBudgetAlerts } from "./GroupBudgetAlerts";
import { fetchGroupMembersWithPhotos } from "@/components/firebaseComponents/FetchGroupMembersWithPhotos";

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
  [key: string]: any;
};

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  group: initialGroup,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "analytics"
    | "activity"
    | "members"
    | "communication"
    | "settings"
    | "budgets"
  >("overview");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);
  const [groupMembers, setGroupMembers] = useState<MemberWithPhoto[]>([]);
  const [group, setGroup] = useState<Group>(initialGroup);

  // Always fetch the latest group data from Firestore
  useEffect(() => {
    const fetchLatestGroup = async () => {
      const freshGroup = await fetchGroupById(initialGroup.id);
      if (freshGroup) setGroup(freshGroup);
      else console.error("Group not found:", initialGroup.id);
    };
    fetchLatestGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroup.id]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!group.id) return;
      const members = await fetchGroupMembersWithPhotos(group.id);
      setGroupMembers(members);
    };
    loadMembers();
  }, [group.id]);

  useEffect(() => {
    const openTab = sessionStorage.getItem("openTab");
    if (openTab === "chat") {
      setActiveTab("communication");
      sessionStorage.removeItem("openTab");
    }
  }, []);

  const { getGroupExpenses, getBalances, archiveGroup, expenses } =
    useExpenseStore();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const groupExpenses = getGroupExpenses(group.id);
  const balances = getBalances().filter((balance) =>
    group.members.some(
      (m) => m.id === balance.from.id || m.id === balance.to.id
    )
  );

  const totalExpenses = groupExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const isUserAdmin =
    user &&
    group.members.some((m) => m.email === user.email && m.role === "admin");

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case "viewer":
        return <Eye className="w-3 h-3 text-gray-500" />;
      default:
        return <User className="w-3 h-3 text-blue-500" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="secondary" className="text-yellow-600 bg-yellow-50">
            Admin
          </Badge>
        );
      case "viewer":
        return (
          <Badge variant="outline" className="text-gray-600">
            Viewer
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-blue-600">
            Member
          </Badge>
        );
    }
  };

  const tabs = [
    { id: "overview", label: isMobile ? "Home" : "Overview", icon: BarChart3 },
    {
      id: "analytics",
      label: isMobile ? "Stats" : "Analytics",
      icon: BarChart3,
    },
    { id: "budgets", label: isMobile ? "Budget" : "Budgets", icon: Target },
    { id: "activity", label: isMobile ? "Feed" : "Activity", icon: Activity },
    { id: "members", label: isMobile ? "People" : "Members", icon: Users },
    { id: "settings", label: isMobile ? "Config" : "Settings", icon: Settings },
    {
      id: "communication",
      label: isMobile ? "Chat" : "Communication",
      icon: MessageCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-x-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b shadow-sm">
          <div className="flex items-center justify-between px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm">Back</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => setShowInvite(true)}
                variant="outline"
                className="h-8 px-2"
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExpenseForm(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-8 px-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-sm">Add</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="relative">
          {group.coverImage && (
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mb-4">
              <img
                src={group.coverImage}
                alt="Group cover"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}

          <Card className="bg-white shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" onClick={onBack}>
                    ← Back
                  </Button>
                  <div className="flex items-center space-x-3">
                    {group.photo ? (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={group.photo} />
                        <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {group.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold">{group.name}</h1>
                      <p className="text-gray-600">{group.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant={
                            group.groupType === "private"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {group.groupType}
                        </Badge>
                        {group.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
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

                  <GroupBudgetManagement group={group}>
                    <Button variant="outline">
                      <Target className="w-4 h-4 mr-2" />
                      Budgets
                    </Button>
                  </GroupBudgetManagement>

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
        <div className="px-3 py-3 bg-white">
          {/* Cover Image */}
          {group.coverImage && (
            <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mb-3 overflow-hidden">
              <img
                src={group.coverImage}
                alt="Group cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-start space-x-3 mb-3">
            {group.photo ? (
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={group.photo} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
                  {group.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {group.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {group.description}
                </p>
              )}
              <div className="flex items-center space-x-1 mt-2 flex-wrap gap-1">
                <Badge
                  variant={
                    group.groupType === "private" ? "secondary" : "outline"
                  }
                  className="text-xs px-2 py-0.5"
                >
                  {group.groupType}
                </Badge>
                {group.tags?.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
                {group.tags && group.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    +{group.tags.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`${isMobile ? "px-3 py-2" : "py-6"}`}>
        <div
          className={`grid ${
            isMobile ? "grid-cols-2 gap-2" : "grid-cols-1 md:grid-cols-4 gap-4"
          }`}
        >
          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={`${isMobile ? "p-3" : "p-4"} text-center`}>
              <div
                className={`${
                  isMobile ? "text-base" : "text-2xl"
                } font-bold text-green-600 truncate`}
              >
                {group.settings.currency} {totalExpenses.toFixed(0)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Total Spent</p>
            </CardContent>
          </Card>

          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={`${isMobile ? "p-3" : "p-4"} text-center`}>
              <div
                className={`${
                  isMobile ? "text-base" : "text-2xl"
                } font-bold text-blue-600`}
              >
                {groupExpenses.length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Expenses</p>
            </CardContent>
          </Card>

          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={`${isMobile ? "p-3" : "p-4"} text-center`}>
              <div
                className={`${
                  isMobile ? "text-base" : "text-2xl"
                } font-bold text-purple-600`}
              >
                {group.members.length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Members</p>
            </CardContent>
          </Card>

          <Card className={isMobile ? "shadow-sm" : ""}>
            <CardContent className={`${isMobile ? "p-3" : "p-4"} text-center`}>
              <div
                className={`${
                  isMobile ? "text-base" : "text-2xl"
                } font-bold text-orange-600`}
              >
                {balances.length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Balances</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      {!isMobile && (
        <Card className="mx-6">
          <CardHeader>
            <div className="flex space-x-1">
              {tabs.map((tab) => {
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
      <div className={`${isMobile ? "px-3 py-2 pb-20" : "p-6"} space-y-4`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Budget Alerts */}
                <GroupBudgetAlerts
                  group={group}
                  onManageBudgets={() => setShowBudgetManagement(true)}
                />

                {/* Recent Expenses */}
                <GroupExpensesList
                  group={group}
                  expenses={expenses}
                  maxExpenses={isMobile ? 3 : 5}
                />

                {/* Members and Quick Actions */}
                <div
                  className={`grid ${
                    isMobile
                      ? "grid-cols-1 gap-4"
                      : "grid-cols-1 lg:grid-cols-2 gap-6"
                  }`}
                >
                  <Card className={isMobile ? "shadow-sm" : ""}>
                    <CardHeader className={isMobile ? "pb-2" : ""}>
                      <CardTitle className="flex items-center justify-between">
                        <span className={isMobile ? "text-base" : "text-xl"}>
                          Members
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab("members")}
                          className={isMobile ? "h-7 px-2 text-xs" : ""}
                        >
                          View All
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={isMobile ? "pt-0" : ""}>
                      <div className="space-y-2">
                        {group.members
                          .slice(0, isMobile ? 3 : 5)
                          .map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between py-1"
                            >
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <Avatar className="w-6 h-6 flex-shrink-0">
                                  {member.photoURL ? (
                                    <AvatarImage
                                      src={member.photoURL}
                                      alt={member.name}
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {member.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {member.name}
                                  </div>
                                  {!isMobile && (
                                    <div className="text-xs text-gray-500 truncate">
                                      {member.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                {getRoleIcon(member.role)}
                                {!isMobile && getRoleBadge(member.role)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={isMobile ? "shadow-sm" : ""}>
                    <CardHeader className={isMobile ? "pb-2" : ""}>
                      <CardTitle className={isMobile ? "text-base" : "text-xl"}>
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={isMobile ? "pt-0" : ""}>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start h-10 text-left"
                          onClick={() => setShowRecurring(true)}
                          size={isMobile ? "sm" : "default"}
                        >
                          <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span
                            className={`${isMobile ? "text-sm" : ""} truncate`}
                          >
                            Add Recurring Expense
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start h-10 text-left"
                          onClick={() => setShowInvite(true)}
                          size={isMobile ? "sm" : "default"}
                        >
                          <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span
                            className={`${isMobile ? "text-sm" : ""} truncate`}
                          >
                            Invite Members
                          </span>
                        </Button>
                        {isUserAdmin && (
                          <Button
                            variant="outline"
                            className="w-full justify-start text-red-600 hover:text-red-700 h-10 text-left"
                            onClick={() => archiveGroup(group.id)}
                            size={isMobile ? "sm" : "default"}
                          >
                            <Archive className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span
                              className={`${
                                isMobile ? "text-sm" : ""
                              } truncate`}
                            >
                              Archive Group
                            </span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "analytics" && <GroupAnalytics group={group} />}
            {activeTab === "budgets" && (
              <div className="space-y-4">
                <GroupBudgetAlerts
                  group={group}
                  onManageBudgets={() => setShowBudgetManagement(true)}
                />
                <GroupBudgetManagement group={group}>
                  <Button className="w-full" size={isMobile ? "sm" : "default"}>
                    <Target className="w-4 h-4 mr-2" />
                    <span className={isMobile ? "text-sm" : ""}>
                      Manage Group Budgets
                    </span>
                  </Button>
                </GroupBudgetManagement>
              </div>
            )}
            {activeTab === "activity" && <GroupActivityFeed group={group} />}
            {activeTab === "members" && <GroupMemberManagement group={group} />}
            {activeTab === "communication" && (
              <GroupCommunicationHub group={group} isAdmin />
            )}
            {activeTab === "settings" && isUserAdmin && (
              <GroupSettings group={group} />
            )}
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

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t shadow-lg">
          <div className="px-2 py-2">
            <GroupDetailMobileNav
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId as any)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
