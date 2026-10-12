import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Wordmark } from "@/components/Wordmark";
import { PrimaryButton, container } from "../ui";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export { Wordmark };

export function Nav({ onGetStarted }: { onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const dark = useIsDark();
  const { setTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-150 ${
        scrolled ? "border-lp-rule bg-lp-paper" : "border-transparent bg-transparent"
      }`}
    >
      <nav className={`${container} flex h-16 items-center justify-between gap-4`} aria-label="Main">
        <a href="#top" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-sm text-sm text-lp-muted transition-colors duration-150 hover:text-lp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setTheme(dark ? "light" : "dark")}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-10 w-10 place-items-center rounded-[10px] text-lp-muted transition-colors duration-150 hover:text-lp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled"
          >
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={onGetStarted}
            className="hidden h-10 rounded-[10px] px-2 text-sm font-medium text-lp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled sm:block"
          >
            Sign in
          </button>
          <PrimaryButton size="md" onClick={onGetStarted}>
            Get started
          </PrimaryButton>
        </div>
      </nav>
    </header>
  );
}
