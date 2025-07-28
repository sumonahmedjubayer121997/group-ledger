import { useState, useEffect } from "react";
import { Plus, Settings, Users, Receipt, TrendingUp, User, BarChart3, Wallet, Upload, Search, Tag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { GroupForm } from "@/components/GroupForm";
import { GroupList } from "@/components/GroupList";
import { GroupDetailView } from "@/components/GroupDetailView";
import { ExpenseForm } from "@/components/ExpenseForm";
import { RecentExpenses } from "@/components/RecentExpenses";
import { BalanceCard } from "@/components/BalanceCard";
import { ExpenseChart } from "@/components/ExpenseChart";
import SpendingTrends from "@/components/SpendingTrends";
import { UserProfile } from "@/components/UserProfile";
import { LandingPage } from "@/components/LandingPage";
import { AuthPage } from "./AuthPage";
import { MobileNavbar } from "@/components/MobileNavbar";
import { NotificationBell } from "@/components/NotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { GroupDetailMobileNav } from "@/components/GroupDetailMobileNav";
import { fetchGroupMembersWithPhotos } from "@/components/firebaseComponents/FetchGroupMembersWithPhotos";
import { ImportDialog } from "@/components/ImportDialog";
import { SearchPage } from "./SearchPage";
import { CategoryManagement } from "@/components/CategoryManagement";
import { BudgetManagement } from "@/components/BudgetManagement";
import { BudgetAlerts } from "@/components/BudgetAlerts";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const Index = () => {
  const { user, userProfile, logout } = useAuth();
  const { groups, expenses, selectedGroup, setSelectedGroup, getBalances, initializeFirebaseSync } = useExpenseStore();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();
  const [enrichedGroups, setEnrichedGroups] = useState([]);


  // Initialize Firebase sync when user is authenticated
  useEffect(() => {
    console.log('Index useEffect - user:', user?.uid, 'groups length:', groups.length);
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
        const members = await fetchGroupMembersWithPhotos(group.id); // your utility
        return { ...group, members };
      })
    );

    setEnrichedGroups(enriched);
  };

  loadGroupsWithMembers();
}, [user?.uid, initializeFirebaseSync,groups]);


  // Show landing page if no user or user wants to see it
  useEffect(() => {
    if (!user) {
      setShowLanding(true);
      setShowAuth(false);
    } else {
      setShowLanding(false);
      setShowAuth(false);
    }
  }, [user]);

  const handleGetStarted = () => {
    setShowLanding(false);
    setShowAuth(true);
  };

  const handleBackToLanding = () => {
    setShowAuth(false);
    setShowLanding(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowLanding(true);
      setShowAuth(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Show auth page when user wants to sign in
  if (showAuth && !user) {
    return <AuthPage onBack={handleBackToLanding} />;
  }

  // Show landing page
  if (showLanding || !user) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  if (showUserProfile) {
    return <UserProfile onClose={() => setShowUserProfile(false)} />;
  }

  if (showSearch) {
    return <SearchPage onBack={() => setShowSearch(false)} />;
  }

  if (selectedGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <GroupDetailView 
          group={selectedGroup} 
          onBack={() => setSelectedGroup(null)} 
        />
      </div>
    );
  }

  const balances = getBalances();

  const tabItems = [
    { value: "overview",id:"overview", label: "Overview", icon: BarChart3 },
    { value: "groups",id:"groups", label: "Groups", icon: Users },
    { value: "expenses", id:"expenses",label: "Expenses", icon: Receipt },
    { value: "analytics",id:"analytics", label: "Analytics", icon: TrendingUp },
  ];

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <OfflineIndicator />
      
      {/* Budget Alerts */}
      <div className="container mx-auto px-3 pt-2">
        <BudgetAlerts />
      </div>
      {/* Mobile Navbar */}
      {isMobile && (
        <MobileNavbar
          onProfileClick={() => setShowUserProfile(true)}
          onNewGroupClick={() => setShowGroupForm(true)}
          onLogout={handleLogout}
        />
      )}

      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6" style={{ paddingBottom: isMobile ? '80px' : '24px' }}>
        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">SplitWize</h1>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                Split expenses with friends and family
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              <NotificationBell />
              <Button
                onClick={() => setShowSearch(true)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Search
              </Button>
              <Button
                onClick={() => setShowUserProfile(true)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Profile
              </Button>
              <Button
                onClick={() => setShowCategoryManagement(true)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Categories
              </Button>
              <Button
                onClick={() => setShowBudgetManagement(true)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Budgets
              </Button>
              <Button
                    onClick={() => setShowExpenseForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add Expense
                  </Button>
                  <ImportDialog>
                    <Button
                      variant="outline"
                      className="text-xs sm:text-sm"
                      size="sm"
                    >
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Import CSV
                    </Button>
                  </ImportDialog>
              <Button
                onClick={() => setShowGroupForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                size="sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                New Group
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}

        {/* Welcome Message */}
        <motion.div 
          className="mb-4 sm:mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">
                Welcome back, {userProfile?.displayName || 'User'}! 👋
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Here's your expense overview
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Debug info - Hidden on mobile */}
        {!isMobile && (
          <div className="mb-4 text-sm text-gray-600">
            Groups: {groups.length} | Expenses: {expenses.length} | User: {user?.displayName}
          </div>
        )}

        {/* Tabs */}
        
     
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            {!isMobile && (
          <TabsList className="grid w-full grid-cols-4 gap-1 sm:gap-2 p-1">
            {tabItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;
              
              return (
               
                <TabsTrigger 
                  key={item.value}
                  value={item.value} 
                  className="relative flex items-center justify-center space-x-2 px-2 py-2 text-xs sm:text-sm min-h-[48px] sm:min-h-auto whitespace-nowrap min-w-fit"
                >
                  
                  <Icon className="h-4 w-4" />
                  {/* {isActive && isMobile && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-xs font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )} */}
                  {!isMobile && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {!isActive && isMobile && (
                    <span className="sr-only">{item.label}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
            )}

          <AnimatePresence mode="wait">
            <div className=""></div>
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
                  <h2 className="text-lg sm:text-xl font-bold">Your Groups</h2>
                  <Button
                    onClick={() => setShowGroupForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                    size="sm"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    New Group
                  </Button>
                </div>
                <GroupList groups={enrichedGroups} onGroupClick={setSelectedGroup} />
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
                  <h2 className="text-lg sm:text-xl font-bold">All Expenses</h2>
                  <Button
                    onClick={() => setShowExpenseForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
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
      
      </div>

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
        {showCategoryManagement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CategoryManagement
              isOpen={showCategoryManagement}
              onClose={() => setShowCategoryManagement(false)}
            />
          </motion.div>
        )}
        {showBudgetManagement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Budget Management</h2>
                    <Button variant="outline" onClick={() => setShowBudgetManagement(false)}>
                      Close
                    </Button>
                  </div>
                  <BudgetManagement />
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {/* Mobile Bottom Tab Bar */}

        
{isMobile && (
   
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t shadow-sm px-4 py-2 max-w-[100%] w-full sm:max-w-md mx-auto overflow-x-hidden">
  <GroupDetailMobileNav
    tabs={tabItems}
    activeTab={activeTab}
    onTabChange={(tabId) => setActiveTab(tabId)}
  />
</div>

)}


      </AnimatePresence>
     
    </div>
  );
};

export default Index;
