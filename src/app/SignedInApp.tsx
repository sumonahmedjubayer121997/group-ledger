import { lazy, Suspense, useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { useExpenseStore } from "@/stores/expenseStore";
import { useBudgetFirebaseSync } from "@/hooks/useBudgetFirebaseSync";
import { PageSkeleton } from "@/components/PageSkeleton";
import { AppActionsProvider } from "./appActions";
import { AppShell } from "./AppShell";

// Each page loads when first opened.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"));
const GroupDetailPage = lazy(() => import("@/pages/GroupDetailPage"));
const BudgetsPage = lazy(() => import("@/pages/BudgetsPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const JoinPage = lazy(() => import("@/pages/JoinPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Keeps groups, expenses, payments and budgets in sync with Firestore while signed in. */
function useDataSync(userId: string) {
  const initializeFirebaseSync = useExpenseStore((s) => s.initializeFirebaseSync);
  const cleanup = useExpenseStore((s) => s.cleanup);
  useEffect(() => {
    void initializeFirebaseSync(userId);
    return () => cleanup();
  }, [userId, initializeFirebaseSync, cleanup]);
  useBudgetFirebaseSync();
}

/** Applies the theme saved to the profile once, when it was chosen on another device. */
function useProfileTheme() {
  const { userProfile } = useAuth();
  const { setTheme } = useTheme();
  const applied = useRef(false);
  useEffect(() => {
    const prefs = userProfile?.preferences;
    if (applied.current || !prefs?.themeUpdatedAt) return;
    if (prefs.theme === "light" || prefs.theme === "dark" || prefs.theme === "system") {
      applied.current = true;
      setTheme(prefs.theme);
    }
  }, [userProfile, setTheme]);
}

export default function SignedInApp() {
  const { user } = useAuth();
  useDataSync(user!.uid);
  useProfileTheme();

  return (
    <AppActionsProvider>
      <AppShell>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/signin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
    </AppActionsProvider>
  );
}
