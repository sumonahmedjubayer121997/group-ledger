import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { LandingPage } from "@/components/LandingPage";
import { AuthPage } from "./AuthPage";
import { Header } from "@/components/Header";
import { BudgetAlerts } from "@/components/BudgetAlerts";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AIAssistantFloat } from "@/components/AIAssistantFloat";
import Dashboard from "./Dashboard";
import ProfilePage from "./ProfilePage";
import { SearchPage } from "./SearchPage";
import CategoriesPage from "./CategoriesPage";
import BudgetsPage from "./BudgetsPage";
import AIAssistantPage from "./AIAssistantPage";
import GroupDetailPage from "./GroupDetailPage";
import { useNavigate, useLocation } from "react-router-dom";
import { useBudgetFirebaseSync } from '@/hooks/useBudgetFirebaseSync';

const Index = () => {
  const { user, userProfile, logout } = useAuth();
  const { initializeFirebaseSync } = useExpenseStore();
  const [showLanding, setShowLanding] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize Firebase sync for budgets
  useBudgetFirebaseSync();

  // Initialize Firebase sync when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      console.log('Index: Initializing Firebase sync for user:', user.uid);
      initializeFirebaseSync(user.uid);
    }
  }, [user?.uid, initializeFirebaseSync]);


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

  // Main authenticated app content
  const handleNavigateToProfile = () => navigate('/profile');
  const handleNavigateToSearch = () => navigate('/search');
  const handleNavigateToCategories = () => navigate('/categories');
  const handleNavigateToBudgets = () => navigate('/budgets');
  const handleNavigateToAI = () => navigate('/ai-assistant');

  // Route-based component rendering
  const renderCurrentPage = () => {
    switch (location.pathname) {
      case '/profile':
        return <ProfilePage />;
      case '/search':
        return <SearchPage onBack={() => navigate('/')} />;
      case '/categories':
        return <CategoriesPage />;
      case '/budgets':
        return <BudgetsPage />;
      case '/ai-assistant':
        return <AIAssistantPage />;
      default:
        if (location.pathname.startsWith('/groups/')) {
          return <GroupDetailPage />;
        }
        return (
          <>
            {/* Budget Alerts */}
            <div className="container mx-auto px-4 pt-4">
              <BudgetAlerts />
            </div>
            {/* Main Dashboard Content */}
            <Dashboard />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <AIAssistantFloat />
      
      {/* Header - shown on all authenticated pages except profile and group detail */}
      {location.pathname !== '/profile' && !location.pathname.startsWith('/groups/') && (
        <Header
          onProfileClick={handleNavigateToProfile}
          onNewGroupClick={() => {}} // These will be handled in Dashboard
          onNewExpenseClick={() => {}} // These will be handled in Dashboard
          onSearchClick={handleNavigateToSearch}
          onCategoriesClick={handleNavigateToCategories}
          onBudgetsClick={handleNavigateToBudgets}
          onAIAssistantClick={handleNavigateToAI}
          onLogout={handleLogout}
        />
      )}

      {/* Route-based content */}
      {renderCurrentPage()}
    </div>
  );
};

export default Index;
