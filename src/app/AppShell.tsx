import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { Home, LogOut, Monitor, Moon, MonitorDown, Plus, Receipt, Search, Sun, Upload, User, Users, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportDialog } from "@/components/ImportDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Wordmark } from "@/components/Wordmark";
import { useThemeSetting } from "@/hooks/useThemeSetting";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useAppActions } from "./appActions";
import { CommandBar } from "./CommandBar";
import { ShortcutsDialog, useShortcuts } from "./shortcuts";

const mainNav = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/expenses", label: "Expenses", icon: Receipt, end: false },
  { to: "/personal", label: "Personal", icon: Wallet, end: false },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

function AccountMenu() {
  const { user, userProfile, logout } = useAuth();
  const { openNewGroup, installState, openInstall } = useAppActions();
  const { theme, change } = useThemeSetting();
  const name = userProfile?.name || user?.displayName || "You";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.photoURL || undefined} alt="" />
            <AvatarFallback className="bg-secondary text-xs font-medium">{initials(name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User aria-hidden="true" />
            Profile and settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={openNewGroup}>
          <Users aria-hidden="true" />
          New group
        </DropdownMenuItem>
        <ImportDialog>
          <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
            <Upload aria-hidden="true" />
            Import expenses
          </DropdownMenuItem>
        </ImportDialog>
        {(installState === "prompt" || installState === "ios") && (
          <DropdownMenuItem onSelect={openInstall}>
            <MonitorDown aria-hidden="true" />
            Install the app
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={change}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" aria-hidden="true" />
            Match device
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} className="text-destructive focus:text-destructive">
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
  );

/** Phone navigation, with "Add" built into the bar so nothing floats over it. */
function BottomBar() {
  const { openAddExpense } = useAppActions();
  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      isActive ? "font-medium text-foreground" : "text-muted-foreground"
    );
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        <li>
          <NavLink to="/" end className={item}>
            <Home className="h-5 w-5" aria-hidden="true" />
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/expenses" className={item}>
            <Receipt className="h-5 w-5" aria-hidden="true" />
            Expenses
          </NavLink>
        </li>
        <li className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => openAddExpense(undefined, "bottom-bar")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Add expense"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>
        </li>
        <li>
          <NavLink to="/personal" className={item}>
            <Wallet className="h-5 w-5" aria-hidden="true" />
            Personal
          </NavLink>
        </li>
        <li>
          <NavLink to="/profile" className={item}>
            <User className="h-5 w-5" aria-hidden="true" />
            Profile
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

/** One header and layout for every signed-in page. */
export function AppShell({ children }: { children: ReactNode }) {
  const { openAddExpense, openJoinGroup } = useAppActions();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const onAdd = useCallback(() => openAddExpense(undefined, "shortcut"), [openAddExpense]);
  const onSearch = useCallback(() => setSearchOpen(true), []);
  const onHelp = useCallback(() => setShortcutsOpen(true), []);
  useShortcuts({ onAdd, onSearch, onHelp });

  // The installed app's icon shortcuts open /?action=add-expense or /?action=join.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const action = params.get("action");
    if (!action) return;
    if (action === "add-expense") openAddExpense(undefined, "app-shortcut");
    if (action === "join") openJoinGroup();
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("action");
        return next;
      },
      { replace: true }
    );
  }, [params, setParams, openAddExpense, openJoinGroup]);

  // Ctrl+K (⌘K on a Mac) opens the command bar from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link
            to="/"
            aria-label="SplitWize overview"
            className="mr-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark className="text-[24px]" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {mainNav.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 w-56 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded border px-1.5 font-inter text-[11px]">{isMac ? "⌘K" : "Ctrl K"}</kbd>
            </button>
            <NotificationBell />
            <Button className="hidden md:inline-flex" onClick={() => openAddExpense(undefined, "header")}>
              <Plus aria-hidden="true" />
              Add expense
            </Button>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-28 pt-6 focus:outline-none sm:px-6 md:pb-16 md:pt-8">
        {children}
      </main>

      <BottomBar />
      <OfflineIndicator />
      <CommandBar open={searchOpen} onOpenChange={setSearchOpen} onShowShortcuts={() => setShortcutsOpen(true)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} isMac={isMac} />
    </div>
  );
}
