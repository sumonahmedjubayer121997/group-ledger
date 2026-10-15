import React, { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/features/auth/authErrors";
import { PrimaryButton, fieldClass, textLink } from "@/features/landing/ui";

type Mode = "login" | "register";

const passwordRules = [
  { label: "8 or more characters", test: (p: string) => p.length >= 8 },
  { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
  { label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Field({
  label,
  aside,
  children,
}: {
  label: React.ReactNode;
  aside?: React.ReactNode;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-lp-ink">
          {label}
        </label>
        {aside}
      </div>
      {children(id)}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        className={`${fieldClass} pr-11`}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[8px] text-lp-muted transition-colors duration-150 hover:text-lp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export const AuthForm: React.FC<{ onProgressChange?: (progress: number) => void }> = ({ onProgressChange }) => {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "", displayName: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rulesId = useId();

  const { login, register, loginWithGoogle, resetPassword } = useAuth();
  const { toast } = useToast();

  const rulesMet = passwordRules.map((rule) => rule.test(formData.password));
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  // How "complete" the form is, from 0 to 1; drives the balance scale beside the form.
  useEffect(() => {
    const checks =
      mode === "login"
        ? [looksLikeEmail(formData.email), formData.password.length > 0]
        : [formData.displayName.trim().length > 0, looksLikeEmail(formData.email), ...rulesMet, passwordsMatch];
    onProgressChange?.(checks.filter(Boolean).length / checks.length);
  }, [mode, formData, passwordsMatch, onProgressChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "register") {
      if (!formData.displayName.trim()) return setError("Add your name so friends recognise you.");
      if (!rulesMet.every(Boolean)) return setError("Your password needs everything on the checklist.");
      if (!passwordsMatch) return setError("The two passwords don't match.");
    }

    setLoading("email");
    try {
      if (mode === "register") {
        await register(formData.email, formData.password, formData.displayName.trim());
        toast({ title: "Account created", description: "Check your email to verify your account." });
      } else {
        await login(formData.email, formData.password);
        toast({ title: "Welcome back", description: "You're signed in." });
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setLoading("google");
    try {
      await loginWithGoogle();
      toast({ title: "Welcome", description: "You're signed in with Google." });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(null);
    }
  };

  const handleForgotPassword = async () => {
    setNotice(null);
    if (!looksLikeEmail(formData.email)) {
      setError("Enter your email above first, then choose \"Forgot password?\" again.");
      return;
    }
    try {
      await resetPassword(formData.email);
      setError(null);
      setNotice(`If there's an account for ${formData.email}, a reset link is on its way.`);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  };

  const isLogin = mode === "login";
  const fade = {
    initial: reduce ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? undefined : { opacity: 0, y: -6 },
    transition: { duration: 0.18 },
  } as const;

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} {...fade}>
          <h1 className="font-display text-[40px] font-normal leading-[44px] tracking-[-0.02em] text-lp-ink">
            {isLogin ? "Welcome back." : <>Create your <span className="italic">account.</span></>}
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-lp-muted">
            {isLogin ? "Sign in to see who owes what." : "Free to use. It takes about a minute."}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-[10px] border border-lp-rule p-1" role="group" aria-label="Account">
        {(
          [
            ["login", "Sign in"],
            ["register", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => switchMode(value)}
            className={`h-9 rounded-[7px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled ${
 mode === value ? "bg-lp-ink text-lp-paper" : "text-lp-muted hover:text-lp-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading !== null}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-lp-rule bg-lp-surface text-[15px] font-medium text-lp-ink transition-colors duration-150 hover:border-lp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled disabled:pointer-events-none disabled:opacity-60"
      >
        {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-[13px] text-lp-muted">
        <span className="h-px flex-1 bg-lp-rule" />
        or with email
        <span className="h-px flex-1 bg-lp-rule" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <Field label="Your name">
            {(id) => (
              <input
                id={id}
                className={fieldClass}
                value={formData.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                autoComplete="name"
                required
              />
            )}
          </Field>
        )}

        <Field label="Email">
          {(id) => (
            <input
              id={id}
              type="email"
              className={fieldClass}
              value={formData.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          )}
        </Field>

        <Field
          label="Password"
          aside={
            isLogin ? (
              <button type="button" onClick={handleForgotPassword} className={`${textLink} text-[13px]`}>
                Forgot password?
              </button>
            ) : undefined
          }
        >
          {(id) => (
            <PasswordInput
              id={id}
              value={formData.password}
              onChange={(v) => update("password", v)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              describedBy={isLogin ? undefined : rulesId}
            />
          )}
        </Field>

        {!isLogin && (
          <>
            <ul id={rulesId} className="grid grid-cols-2 gap-x-4 gap-y-1.5" aria-label="Password checklist">
              {passwordRules.map((rule, i) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-[13px] transition-colors duration-150 ${
 rulesMet[i] ? "text-lp-settled" : "text-lp-muted"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 ${rulesMet[i] ? "opacity-100" : "opacity-30"}`} aria-hidden="true" />
                  {rule.label}
                  <span className="sr-only">{rulesMet[i] ? "(done)" : "(not yet)"}</span>
                </li>
              ))}
            </ul>

            <Field label="Confirm password">
              {(id) => (
                <PasswordInput
                  id={id}
                  value={formData.confirmPassword}
                  onChange={(v) => update("confirmPassword", v)}
                  autoComplete="new-password"
                />
              )}
            </Field>
          </>
        )}

        <div aria-live="polite">
          {error && (
            <p role="alert" className="rounded-[10px] border border-lp-rule bg-lp-surface px-3 py-2.5 text-sm text-lp-owes">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-[10px] border border-lp-rule bg-lp-surface px-3 py-2.5 text-sm text-lp-settled">{notice}</p>
          )}
        </div>

        <PrimaryButton type="submit" disabled={loading !== null} className="w-full">
          {loading === "email" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading === "email" ? (isLogin ? "Signing in" : "Creating account") : isLogin ? "Sign in" : "Create account"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-lp-muted">
        {isLogin ? "New to SplitWize? " : "Already have an account? "}
        <button type="button" onClick={() => switchMode(isLogin ? "register" : "login")} className={`${textLink} font-medium`}>
          {isLogin ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
};
