import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthForm } from "@/components/AuthForm";
import { AuthScale } from "@/features/auth/AuthScale";
import { Wordmark } from "@/features/landing/sections/Nav";

interface AuthPageProps {
  onBack: () => void;
  /** Shown above the form, e.g. when someone opened an invite link while signed out. */
  notice?: string;
}

const facts = ["Free to use", "7 currencies, including ৳ BDT", "Equal, percent or exact splits"];

export const AuthPage = ({ onBack, notice }: AuthPageProps) => {
  const [progress, setProgress] = useState(0);
  const ready = progress >= 1;

  return (
    <div className="min-h-screen bg-lp-paper font-inter text-lp-ink antialiased lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen flex-col px-4 sm:px-6 lg:px-12">
        <header className="flex h-16 items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex h-10 items-center gap-2 rounded-[10px] px-2 text-sm text-lp-muted transition-colors duration-150 hover:text-lp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </button>
          <Wordmark className="text-[22px] lg:hidden" />
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            {notice && (
              <p role="status" className="mb-6 rounded-[10px] border border-lp-rule bg-lp-surface px-4 py-3 text-sm text-lp-ink">
                {notice}
              </p>
            )}
            <AuthForm onProgressChange={setProgress} />
          </div>
        </main>

        <footer className="py-6 text-[13px] text-lp-muted">© {new Date().getFullYear()} SplitWize</footer>
      </div>

      <aside className="hidden border-l border-lp-rule bg-lp-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Wordmark />
        <div>
          <p className="max-w-md font-display text-[44px] leading-[48px] tracking-[-0.01em] text-lp-ink">
            Every bill, <span className="italic">balanced.</span>
          </p>
          <div className="mt-10 max-w-md">
            <AuthScale progress={progress} />
            <p className={`mt-2 text-center text-[13px] transition-colors duration-300 ${ready ? "text-lp-settled" : "text-lp-muted"}`}>
              {ready ? "Balanced. Ready when you are." : "Fill in your details to balance the scale."}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-lp-muted">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
};
