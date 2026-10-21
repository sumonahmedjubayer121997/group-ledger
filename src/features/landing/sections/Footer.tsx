import { Link } from "react-router-dom";
import { container } from "../ui";
import { Wordmark } from "./Nav";

const linkClass =
  "rounded-sm text-sm text-lp-muted transition-colors duration-150 hover:text-lp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled";

export function Footer({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <footer className="border-t border-lp-rule">
      <div className={`${container} flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between`}>
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm leading-6 text-lp-muted">Shared expenses, worked out fairly.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            <li>
              <a href="#how-it-works" className={linkClass}>
                How it works
              </a>
            </li>
            <li>
              <a href="#try" className={linkClass}>
                Try a split
              </a>
            </li>
            <li>
              <a href="#features" className={linkClass}>
                Features
              </a>
            </li>
            <li>
              <a href="#faq" className={linkClass}>
                FAQ
              </a>
            </li>
            <li>
              <button type="button" onClick={onGetStarted} className={linkClass}>
                Sign in
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div className={`${container} border-t border-lp-rule py-6 text-[13px] text-lp-muted`}>
        © {new Date().getFullYear()} SplitWize ·{" "}
        <Link to="/privacy" className={`${linkClass} text-[13px] underline-offset-4 hover:underline`}>
          Privacy
        </Link>{" "}
        ·{" "}
        <Link to="/terms" className={`${linkClass} text-[13px] underline-offset-4 hover:underline`}>
          Terms
        </Link>{" "}
        · Made by{" "}
        <a href="https://sumonahmed.info" target="_blank" rel="noopener noreferrer" className={`${linkClass} text-[13px] underline-offset-4 hover:underline`}>
          Sumon Ahmed
        </a>
      </div>
    </footer>
  );
}
