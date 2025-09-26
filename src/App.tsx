import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();
  const { initializeFirebaseSync, cleanup } = useExpenseStore();

  // Initialize Firebase sync when user is authenticated properly
  useEffect(() => {
    if (user) {
      console.log("Initializing Firebase sync for user:", user.uid);
      initializeFirebaseSync(user.uid);
    } else {
      console.log("User logged out, cleaning up Firebase sync");
      cleanup();
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [user, initializeFirebaseSync, cleanup]);

  console.log("App loading state:", loading);
  console.log("User state:", user ? "authenticated" : "not authenticated");

  // Loader removed as requested

  // Always show the Index component, which will handle showing landing page vs main app
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/profile" element={<Index />} />
        <Route path="/search" element={<Index />} />
        <Route path="/categories" element={<Index />} />
        <Route path="/budgets" element={<Index />} />
        <Route path="/ai-assistant" element={<Index />} />
        <Route path="/groups/:groupId" element={<Index />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="splitwize-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
