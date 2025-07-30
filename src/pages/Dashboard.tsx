import { useState, useEffect } from "react";
import { Plus, Users, Receipt, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { GroupForm } from "@/components/GroupForm";
import { GroupList } from "@/components/GroupList";
import { ExpenseForm } from "@/components/ExpenseForm";
import { RecentExpenses } from "@/components/RecentExpenses";
import { BalanceCard } from "@/components/BalanceCard";
import { ExpenseChart } from "@/components/ExpenseChart";
import SpendingTrends from "@/components/SpendingTrends";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { GroupDetailMobileNav } from "@/components/GroupDetailMobileNav";
import { fetchGroupMembersWithPhotos } from "@/components/firebaseComponents/FetchGroupMembersWithPhotos";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, userProfile } = useAuth();
  const { groups, expenses, setSelectedGroup, getBalances, initializeFirebaseSync } = useExpenseStore();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();
  const [enrichedGroups, setEnrichedGroups] = useState([]);
  const navigate = useNavigate();

  // Initialize Firebase sync when user is authenticated
  useEffect(() => {
    console.log('Dashboard useEffect - user:', user?.uid, 'groups length:', groups.length);
    if (user?.uid) {
      console.log('Initializing Firebase sync for user:', user.uid);
      initializeFirebaseSync(user.uid);
    }
  }, [user?.uid, initializeFirebaseSync]);

  useEffect(() => {
    const loadGroupsWithMembers = async () => {
      if (!user?.uid) return;

      // Already syncing groups from Firestore
      await initializeFirebaseSync(user.uid); 

      // After syncing, enrich each group with member details
      const enriched = await Promise.all(
        groups.map(async (group) => {
          const members = await fetchGroupMembersWithPhotos(group.id);
          return { ...group, members };
        })
      );

      setEnrichedGroups(enriched);
    };

    loadGroupsWithMembers();
  }, [user?.uid, initializeFirebaseSync, groups]);

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    navigate(`/groups/${group.id}`);
  };

  const balances = getBalances();

  const tabItems = [
    { value: "overview", id: "overview", label: "Overview", icon: BarChart3 },
    { value: "groups", id: "groups", label: "Groups", icon: Users },
    { value: "expenses", id: "expenses", label: "Expenses", icon: Receipt },
    { value: "analytics", id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Message */}
      <motion.div 
        className="mb-4 sm:mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg md:text-xl text-card-foreground">
              Welcome back, {userProfile?.displayName || 'User'}! 👋
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              Here's your expense overview
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Debug info - Hidden on mobile */}
      {!isMobile && (
        <div className="mb-4 text-sm text-muted-foreground">
          Groups: {groups.length} | Expenses: {expenses.length} | User: {user?.displayName}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {!isMobile && (
          <TabsList className="grid w-full grid-cols-4 gap-1 sm:gap-2 p-1">
            {tabItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <TabsTrigger 
                  key={item.value}
                  value={item.value} 
                  className="relative flex items-center justify-center space-x-2 px-2 py-2 text-xs sm:text-sm min-h-[48px] sm:min-h-auto whitespace-nowrap min-w-fit"
                >
                  <Icon className="h-4 w-4" />
                  {!isMobile && (
                    <span className="truncate">{item.label}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        <AnimatePresence mode="wait">
          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <motion.div
              key="overview"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <BalanceCard balances={balances} />
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Groups</CardTitle>
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{groups.length}</div>
                    <p className="text-xs text-muted-foreground">Active groups</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
                    <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">{expenses.length}</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
              </div>
              <RecentExpenses expenses={expenses} />
            </motion.div>
          </TabsContent>

          {/* Groups */}
          <TabsContent value="groups" className="space-y-4 sm:space-y-6">
            <motion.div
              key="groups"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">Your Groups</h2>
                <Button
                  onClick={() => setShowGroupForm(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
                  size="sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  New Group
                </Button>
              </div>
              <GroupList groups={enrichedGroups} onGroupClick={handleGroupClick} />
            </motion.div>
          </TabsContent>

          {/* Expenses */}
          <TabsContent value="expenses" className="space-y-4 sm:space-y-6">
            <motion.div
              key="expenses"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">All Expenses</h2>
                <Button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs sm:text-sm"
                  size="sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Add Expense
                </Button>
              </div>
              <RecentExpenses expenses={expenses} />
            </motion.div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
            <motion.div
              key="analytics"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <ExpenseChart expenses={expenses} />
                <SpendingTrends expenses={expenses} />
              </div>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-sm px-4 py-2 max-w-[100%] w-full sm:max-w-md mx-auto overflow-x-hidden">
          <GroupDetailMobileNav
            tabs={tabItems}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId)}
          />
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showGroupForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GroupForm
              isOpen={showGroupForm}
              onClose={() => setShowGroupForm(false)}
            />
          </motion.div>
        )}
        {showExpenseForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ExpenseForm
              isOpen={showExpenseForm}
              onClose={() => setShowExpenseForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;