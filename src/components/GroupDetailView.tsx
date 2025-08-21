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
  TrendingUp,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Share2,
  Bell,
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
import { GroupBudgetList } from "./GroupBudgetList";
import { fetchGroupMembersWithPhotos } from "@/components/firebaseComponents/FetchGroupMembersWithPhotos";
import { useBudgetValidation } from "@/hooks/useBudgetValidation";
import { useBudgetStore } from "@/stores/budgetStore";

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
  const [editingBudget, setEditingBudget] = useState<any>(null);
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

  // Initialize budget store for this group
  const { initializeFirebaseSync } = useBudgetStore();
  
  useEffect(() => {
    if (user?.uid && group.id) {
      console.log("Initializing budget sync for group:", group.id);
      initializeFirebaseSync(user.uid, [group]);
    }
  }, [user?.uid, group.id, initializeFirebaseSync]);

  // Enable budget validation for real-time alerts
  useBudgetValidation(group.id);

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
    {
      id: "overview",
      label: isMobile ? "Home" : "Overview",
      icon: BarChart3,
      description: "Group summary and recent activity",
    },
    {
      id: "analytics",
      label: isMobile ? "Analytics" : "Analytics",
      icon: TrendingUp,
      description: "Detailed spending insights and trends",
    },
    {
      id: "budgets",
      label: isMobile ? "Budget" : "Budgets",
      icon: Target,
      description: "Manage group spending limits",
    },
    {
      id: "activity",
      label: isMobile ? "Activity" : "Activity Feed",
      icon: Activity,
      description: "Recent group activities and updates",
    },
    {
      id: "members",
      label: isMobile ? "Members" : "Members",
      icon: Users,
      description: "Group member management",
    },
    {
      id: "communication",
      label: isMobile ? "Chat" : "Communication",
      icon: MessageCircle,
      description: "Group chat and discussions",
    },
    {
      id: "settings",
      label: isMobile ? "Settings" : "Settings",
      icon: Settings,
      description: "Group configuration and preferences",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
      {/* Enhanced Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-9 px-3 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 dark:text-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Back</span>
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => setShowInvite(true)}
                variant="outline"
                className="h-9 px-3 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-200"
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExpenseForm(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-9 px-4 shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Add</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Desktop Header */}
      {!isMobile && (
        <div className="relative">
          {/* Cover Image with Overlay */}
          <div className="relative h-48 overflow-hidden">
            {group.coverImage ? (
              <>
                <img
                  src={group.coverImage}
                  alt="Group cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-indigo-900 dark:to-slate-900">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            )}

            {/* Header Actions Overlay */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={onBack}
                className="bg-white/10 dark:bg-slate-900/20 backdrop-blur-md text-white hover:bg-white/20 dark:hover:bg-slate-900/30 border border-white/20 dark:border-slate-700/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  className="bg-white/10 dark:bg-slate-900/20 backdrop-blur-md text-white hover:bg-white/20 dark:hover:bg-slate-900/30 border border-white/20 dark:border-slate-700/50"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="bg-white/10 dark:bg-slate-900/20 backdrop-blur-md text-white hover:bg-white/20 dark:hover:bg-slate-900/30 border border-white/20 dark:border-slate-700/50"
                >
                  <Bell className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="bg-white/10 dark:bg-slate-900/20 backdrop-blur-md text-white hover:bg-white/20 dark:hover:bg-slate-900/30 border border-white/20 dark:border-slate-700/50"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Group Info Card with Negative Margin */}
          <div className="relative -mt-20 mx-6 mb-6">
            <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-0 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Group Avatar */}
                    <div className="relative">
                      {group.photo ? (
                        <Avatar className="w-16 h-16 ring-4 ring-white dark:ring-slate-800 shadow-lg">
                          <AvatarImage src={group.photo} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold">
                            {group.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow-lg">
                          <span className="text-white font-bold text-xl">
                            {group.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {group.groupType === "private" && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Group Details */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                        {group.name}
                      </h1>
                      {group.description && (
                        <p className="text-gray-600 dark:text-slate-300 text-lg mb-3 max-w-2xl">
                          {group.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        <Badge
                          variant={
                            group.groupType === "private"
                              ? "default"
                              : "secondary"
                          }
                          className={`px-3 py-1 text-sm font-medium ${
                            group.groupType === "private"
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                              : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                          }`}
                        >
                          {group.groupType}
                        </Badge>
                        {group.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="px-3 py-1 text-sm border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => setShowExpenseForm(true)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg px-6"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>

                    <GroupInviteDialog group={group}>
                      <Button
                        variant="outline"
                        className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-200 px-6"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Invite
                      </Button>
                    </GroupInviteDialog>

                    <GroupBudgetManagement 
                      group={group}
                      editBudget={editingBudget}
                      onBudgetEdited={() => {
                        setEditingBudget(null);
                        setShowBudgetManagement(false);
                      }}
                    >
                      <Button
                        variant="outline"
                        className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-200 px-6"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Budgets
                      </Button>
                    </GroupBudgetManagement>

                    {isUserAdmin && (
                      <Button
                        variant="outline"
                        onClick={() => setShowSettings(true)}
                        className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-slate-200"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Mobile Group Info */}
      {isMobile && (
        <div className="mx-3 my-4">
          <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl border-0 overflow-hidden">
            <CardContent className="p-4">
              {/* Cover Image */}
              {group.coverImage && (
                <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-xl mb-4 overflow-hidden relative">
                  <img
                    src={group.coverImage}
                    alt="Group cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              <div className="flex items-start space-x-4">
                <div className="relative">
                  {group.photo ? (
                    <Avatar className="w-14 h-14 ring-3 ring-white dark:ring-slate-800 shadow-lg">
                      <AvatarImage src={group.photo} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                        {group.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ring-3 ring-white dark:ring-slate-800 shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {group.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {group.groupType === "private" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate mb-1">
                    {group.name}
                  </h1>
                  {group.description && (
                    <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-2 mb-3">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <Badge
                      variant={
                        group.groupType === "private" ? "default" : "secondary"
                      }
                      className={`text-xs px-2 py-1 font-medium ${
                        group.groupType === "private"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      {group.groupType}
                    </Badge>
                    {group.tags?.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs px-2 py-1 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {group.tags && group.tags.length > 2 && (
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-1 border-gray-200 text-gray-600"
                      >
                        +{group.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div className={`${isMobile ? "px-3 py-2" : "mx-6 mb-6"}`}>
        <div
          className={`grid ${
            isMobile ? "grid-cols-2 gap-3" : "grid-cols-1 md:grid-cols-4 gap-6"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className={`${
                isMobile ? "shadow-lg" : "shadow-xl"
              } border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-emerald-900/20 dark:to-green-900/20 hover:shadow-2xl transition-all duration-300`}
            >
              <CardContent
                className={`${isMobile ? "p-4" : "p-6"} text-center`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div
                  className={`${
                    isMobile ? "text-lg" : "text-3xl"
                  } font-bold text-green-700 dark:text-green-400 mb-1`}
                >
                  {group.settings.currency} {totalExpenses.toFixed(0)}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Total Spent
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card
              className={`${
                isMobile ? "shadow-lg" : "shadow-xl"
              } border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-2xl transition-all duration-300`}
            >
              <CardContent
                className={`${isMobile ? "p-4" : "p-6"} text-center`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div
                  className={`${
                    isMobile ? "text-lg" : "text-3xl"
                  } font-bold text-blue-700 dark:text-blue-400 mb-1`}
                >
                  {groupExpenses.length}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Expenses
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className={`${
                isMobile ? "shadow-lg" : "shadow-xl"
              } border-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 hover:shadow-2xl transition-all duration-300`}
            >
              <CardContent
                className={`${isMobile ? "p-4" : "p-6"} text-center`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div
                  className={`${
                    isMobile ? "text-lg" : "text-3xl"
                  } font-bold text-purple-700 dark:text-purple-400 mb-1`}
                >
                  {group.members.length}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  Members
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card
              className={`${
                isMobile ? "shadow-lg" : "shadow-xl"
              } border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:shadow-2xl transition-all duration-300`}
            >
              <CardContent
                className={`${isMobile ? "p-4" : "p-6"} text-center`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                    <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div
                  className={`${
                    isMobile ? "text-lg" : "text-3xl"
                  } font-bold text-orange-700 dark:text-orange-400 mb-1`}
                >
                  {balances.length}
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Balances
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Desktop Navigation Tabs */}
      {!isMobile && (
        <div className="mx-6 mb-8">
          {/* Navigation Container with Glass Effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10 rounded-2xl blur-3xl"></div>

            <Card className="relative shadow-2xl border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl overflow-hidden rounded-2xl ring-1 ring-white/20 dark:ring-slate-700/30">
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  {/* Tab Navigation */}
                  <div className="flex items-center space-x-1 p-1 bg-gray-100/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm">
                    {tabs.map((tab, index) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <motion.div
                          key={tab.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: index * 0.05,
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                          className="relative"
                        >
                          {/* Active Background */}
                          {isActive && (
                            <motion.div
                              layoutId="activeTabBg"
                              className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                              initial={false}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}

                          <Button
                            variant="ghost"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`relative z-10 flex items-center space-x-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg border-0 ${
                              isActive
                                ? "text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 transition-colors ${
                                isActive
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-gray-500 dark:text-slate-500"
                              }`}
                            />
                            <span>{tab.label}</span>

                            {/* Active indicator dot */}
                            {isActive && (
                              <motion.div
                                layoutId="activeTabDot"
                                className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 600,
                                  damping: 30,
                                }}
                              />
                            )}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Tab Actions */}
                  {/* <div className="flex items-center space-x-2">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center space-x-1"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div> */}
                </div>

                {/* Tab Description */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 px-4 pb-1"
                  >
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      {tabs.find((tab) => tab.id === activeTab)?.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Tab Content */}
      <div
        className={`${isMobile ? "px-3 py-2 pb-24" : "mx-6 pb-6"} space-y-6`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Budget Alerts */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <GroupBudgetAlerts
                    group={group}
                    onManageBudgets={() => setShowBudgetManagement(true)}
                  />
                </motion.div>

                {/* Recent Expenses */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <GroupExpensesList
                    group={group}
                    expenses={expenses}
                    maxExpenses={isMobile ? 3 : 5}
                  />
                </motion.div>

                {/* Members and Quick Actions */}
                <div
                  className={`grid ${
                    isMobile
                      ? "grid-cols-1 gap-6"
                      : "grid-cols-1 lg:grid-cols-2 gap-8"
                  }`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card
                      className={`${
                        isMobile ? "shadow-lg" : "shadow-xl"
                      } border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl`}
                    >
                      <CardHeader className={isMobile ? "pb-3" : "pb-4"}>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span
                              className={`${
                                isMobile ? "text-lg" : "text-xl"
                              } font-bold text-gray-900 dark:text-slate-100`}
                            >
                              Members
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab("members")}
                            className={`${
                              isMobile ? "h-8 px-3 text-xs" : "h-9 px-4"
                            } border-gray-200 hover:bg-gray-50`}
                          >
                            View All
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={isMobile ? "pt-0" : ""}>
                        <div className="space-y-3">
                          {group.members
                            .slice(0, isMobile ? 3 : 5)
                            .map((member, index) => (
                              <motion.div
                                key={member.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-white shadow-sm">
                                    {member.photoURL ? (
                                      <AvatarImage
                                        src={member.photoURL}
                                        alt={member.name}
                                      />
                                    ) : null}
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                                      {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate">
                                      {member.name}
                                    </div>
                                    {!isMobile && (
                                      <div className="text-xs text-gray-500 truncate">
                                        {member.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  {getRoleIcon(member.role)}
                                  {!isMobile && getRoleBadge(member.role)}
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card
                      className={`${
                        isMobile ? "shadow-lg" : "shadow-xl"
                      } border-0 bg-white/95 backdrop-blur-xl`}
                    >
                      <CardHeader className={isMobile ? "pb-3" : "pb-4"}>
                        <CardTitle className="flex items-center space-x-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Activity className="w-5 h-5 text-green-600" />
                          </div>
                          <span
                            className={`${
                              isMobile ? "text-lg" : "text-xl"
                            } font-bold text-gray-900`}
                          >
                            Quick Actions
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className={isMobile ? "pt-0" : ""}>
                        <div className="space-y-3">
                          <Button
                            variant="outline"
                            className="w-full justify-start h-12 text-left border-gray-200 hover:bg-green-50 hover:border-green-200 transition-all"
                            onClick={() => setShowRecurring(true)}
                            size={isMobile ? "sm" : "default"}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Plus className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <div
                                  className={`${
                                    isMobile ? "text-sm" : ""
                                  } font-medium text-gray-900`}
                                >
                                  Add Recurring Expense
                                </div>
                                <div className="text-xs text-gray-500">
                                  Set up automatic expenses
                                </div>
                              </div>
                            </div>
                          </Button>

                          <Button
                            variant="outline"
                            className="w-full justify-start h-12 text-left border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all"
                            onClick={() => setShowInvite(true)}
                            size={isMobile ? "sm" : "default"}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div
                                  className={`${
                                    isMobile ? "text-sm" : ""
                                  } font-medium text-gray-900`}
                                >
                                  Invite Members
                                </div>
                                <div className="text-xs text-gray-500">
                                  Add people to your group
                                </div>
                              </div>
                            </div>
                          </Button>

                          {isUserAdmin && (
                            <Button
                              variant="outline"
                              className="w-full justify-start text-red-600 hover:text-red-700 h-12 text-left border-gray-200 hover:bg-red-50 hover:border-red-200 transition-all"
                              onClick={() => archiveGroup(group.id)}
                              size={isMobile ? "sm" : "default"}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                  <Archive className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                  <div
                                    className={`${
                                      isMobile ? "text-sm" : ""
                                    } font-medium`}
                                  >
                                    Archive Group
                                  </div>
                                  <div className="text-xs text-red-500">
                                    Permanently remove group
                                  </div>
                                </div>
                              </div>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GroupAnalytics group={group} />
              </motion.div>
            )}

            {activeTab === "budgets" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <GroupBudgetAlerts
                  group={group}
                  onManageBudgets={() => setShowBudgetManagement(true)}
                />

                {/* Enhanced Budget List with Edit/Delete functionality */}
                <GroupBudgetList
                  group={group}
                  onEditBudget={(budget) => {
                    console.log("Setting budget for editing:", budget);
                    setEditingBudget(budget);
                    setShowBudgetManagement(true);
                  }}
                />

                <Card className="shadow-xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                  <CardContent className="p-8 text-center">
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4">
                      <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                      Manage Group Budgets
                    </h3>
                    <p className="text-gray-600 dark:text-slate-300 mb-6">
                      Set spending limits and track your group's financial goals
                    </p>
                    <GroupBudgetManagement 
                      group={group}
                      editBudget={editingBudget}
                      onBudgetEdited={() => {
                        setEditingBudget(null);
                        setShowBudgetManagement(false);
                      }}
                    >
                      <Button
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3"
                        size={isMobile ? "sm" : "default"}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        <span className={isMobile ? "text-sm" : ""}>
                          Manage Budgets
                        </span>
                      </Button>
                    </GroupBudgetManagement>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GroupActivityFeed group={group} />
              </motion.div>
            )}

            {activeTab === "members" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GroupMemberManagement group={group} />
              </motion.div>
            )}

            {activeTab === "communication" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GroupCommunicationHub group={group} isAdmin />
              </motion.div>
            )}

            {activeTab === "settings" && isUserAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GroupSettings group={group} />
              </motion.div>
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

      {/* Mobile Bottom Tab Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 safe-area-pb">
          {/* Quick Action Button */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                onClick={() => setShowExpenseForm(true)}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl border-4 border-white dark:border-slate-900"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </motion.div>
          </div>

          {/* Tab Navigation - Show only main 5 tabs */}
          <div className="flex items-center justify-around px-1 py-2">
            {tabs.slice(0, 5).map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 flex-1 max-w-[70px] relative ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Tab Icon */}
                  <Icon
                    className={`w-5 h-5 mb-1 transition-colors duration-200 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  />

                  {/* Tab Label */}
                  <span
                    className={`text-[10px] font-medium transition-colors duration-200 text-center leading-tight ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </span>

                  {/* Active Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="bottomTabIndicator"
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-b-full"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}

            {/* More button for additional tabs */}
            <motion.button
              onClick={() => {
                // You can implement a sheet/modal for additional tabs
                // For now, let's cycle through the remaining tabs
                const remainingTabs = tabs.slice(5);
                const currentRemaining = remainingTabs.find(
                  (tab) => tab.id === activeTab
                );
                const nextTab = currentRemaining
                  ? remainingTabs[
                      (remainingTabs.indexOf(currentRemaining) + 1) %
                        remainingTabs.length
                    ]
                  : remainingTabs[0];
                if (nextTab) setActiveTab(nextTab.id as any);
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 flex-1 max-w-[70px] relative ${
                tabs.slice(5).some((tab) => tab.id === activeTab)
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Show active tab icon if it's from remaining tabs, otherwise show More icon */}
              {(() => {
                const activeRemainingTab = tabs
                  .slice(5)
                  .find((tab) => tab.id === activeTab);
                if (activeRemainingTab) {
                  const Icon = activeRemainingTab.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 mb-1 text-blue-600 dark:text-blue-400" />
                      <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 text-center leading-tight">
                        {activeRemainingTab.label}
                      </span>
                      <motion.div
                        layoutId="bottomTabIndicator"
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-b-full"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    </>
                  );
                } else {
                  return (
                    <>
                      <MoreHorizontal className="w-5 h-5 mb-1 transition-colors duration-200 text-gray-500 dark:text-slate-400" />
                      <span className="text-[10px] font-medium transition-colors duration-200 text-gray-500 dark:text-slate-400 text-center leading-tight">
                        More
                      </span>
                    </>
                  );
                }
              })()}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
