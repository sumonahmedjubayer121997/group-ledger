import { useState, useEffect } from "react";
import { Plus, Settings, Users, Receipt, TrendingUp, User } from "lucide-react";
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
import { UserProfile } from "@/components/UserProfile";

const Index = () => {
  const { user, userProfile, logout } = useAuth();
  const { groups, expenses, selectedGroup, setSelectedGroup, getBalances, initializeFirebaseSync } = useExpenseStore();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Initialize Firebase sync when user is authenticated
  useEffect(() => {
    console.log('Index useEffect - user:', user?.uid, 'groups length:', groups.length);
    if (user?.uid) {
      console.log('Initializing Firebase sync for user:', user.uid);
      initializeFirebaseSync(user.uid);
    }
  }, [user?.uid, initializeFirebaseSync]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleNewGroupClick = () => {
    console.log('New Group button clicked');
    setActiveTab("groups");
    setShowGroupForm(true);
  };

  const handleCloseGroupForm = () => {
    console.log('Closing group form');
    setShowGroupForm(false);
  };

  if (showUserProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <UserProfile onClose={() => setShowUserProfile(false)} />
      </div>
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SplitWize</h1>
            <p className="text-gray-600">Split expenses with friends and family</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowUserProfile(true)}
              variant="outline"
              size="sm"
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button
              onClick={handleNewGroupClick}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                Welcome back, {userProfile?.displayName || 'User'}! 👋
              </CardTitle>
              <CardDescription>
                Here's your expense overview
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Debug info */}
        <div className="mb-4 text-sm text-gray-600">
          Groups: {groups.length} | Expenses: {expenses.length} | User: {user?.uid}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <BalanceCard balances={balances} />
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groups.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active groups
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{expenses.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>
            </div>
            <RecentExpenses expenses={expenses} />
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <GroupList groups={groups} onGroupClick={setSelectedGroup} />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Expenses</h2>
              <Button
                onClick={() => setShowExpenseForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
            <RecentExpenses expenses={expenses} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpenseChart expenses={expenses} />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Spending Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Analytics coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showGroupForm && (
        <GroupForm 
          isOpen={showGroupForm} 
          onClose={handleCloseGroupForm} 
        />
      )}
      {showExpenseForm && (
        <ExpenseForm 
          isOpen={showExpenseForm} 
          onClose={() => setShowExpenseForm(false)} 
        />
      )}
    </div>
  );
};

export default Index;
