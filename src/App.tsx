import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FullPageLoader } from "@/components/FullPageLoader";

// Signed-out visitors download the landing page; signed-in people download the app. Never both.
const loadPublicApp = () => import("./app/PublicApp");
const PublicApp = lazy(loadPublicApp);
const SignedInApp = lazy(() => import("./app/SignedInApp"));
// Offline use, installing and "new version" prompts; loads after the page, off the critical path.
const PwaUpdatePrompt = lazy(() => import("@/components/PwaUpdatePrompt"));

// Most first visits are signed out, so start fetching the landing page while sign-in is checked.
if (typeof window !== "undefined" && window.location.pathname === "/") void loadPublicApp();

/** A crash on one page shows a recovery screen instead of a blank app; moving to another page clears it. */
const PageErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
};

const Root = () => {
  const { user, initializing } = useAuth();
  // Wait for Firebase to restore a saved sign-in instead of flashing the landing page.
  if (initializing) return <FullPageLoader />;
  return <Suspense fallback={<FullPageLoader />}>{user ? <SignedInApp /> : <PublicApp />}</Suspense>;
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider defaultTheme="system" storageKey="splitwize-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={null}>
            <PwaUpdatePrompt />
          </Suspense>
          <BrowserRouter>
            <PageErrorBoundary>
              <Root />
            </PageErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
