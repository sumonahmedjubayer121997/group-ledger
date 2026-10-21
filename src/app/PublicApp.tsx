import { lazy, Suspense } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { LandingPage } from "@/features/landing/LandingPage";
import { FullPageLoader } from "@/components/FullPageLoader";

// The sign-in page is a separate download, so the landing page stays small.
const AuthPage = lazy(() => import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PrivacyPage = lazy(() => import("@/pages/LegalPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/LegalPage").then((m) => ({ default: m.TermsPage })));

/** Signed-out visitors: the landing page, sign-in, and a sign-in prompt for app and invite links. */
export default function PublicApp() {
  const navigate = useNavigate();
  const toSignIn = () => navigate("/signin");
  const home = () => navigate("/");
  const signIn = (notice?: string) => <AuthPage onBack={home} notice={notice} />;

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage onGetStarted={toSignIn} />} />
        <Route path="/signin" element={signIn()} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/join/:code" element={signIn("Sign in or create a free account to accept your group invite.")} />
        {["/expenses", "/groups/:groupId", "/personal", "/people/:personId", "/budgets", "/categories", "/search", "/profile"].map((path) => (
          <Route key={path} path={path} element={signIn("Sign in to continue.")} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
