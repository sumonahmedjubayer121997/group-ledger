import { useState } from "react";
import {
  Plus,
  Search,
  User,
  Tag,
  DollarSign,
  Bot,
  Upload,
  LogOut,
  Menu,
  Bell,
  Users,
  Settings,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationBell } from "@/components/NotificationBell";
import { ImportDialog } from "@/components/ImportDialog";

interface HeaderProps {
  onProfileClick: () => void;
  onNewGroupClick: () => void;
  onNewExpenseClick: () => void;
  onSearchClick: () => void;
  onCategoriesClick: () => void;
  onBudgetsClick: () => void;
  onAIAssistantClick: () => void;
  onLogout: () => void;
}

export const Header = ({
  onProfileClick,
  onNewGroupClick,
  onNewExpenseClick,
  onSearchClick,
  onCategoriesClick,
  onBudgetsClick,
  onAIAssistantClick,
  onLogout,
}: HeaderProps) => {
  const { user, userProfile } = useAuth();
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsSheetOpen(false);
  };

  // Mobile Header
  if (isMobile) {
    return (
      <header className="sticky top-0 z-50 w-full bg-background/98 backdrop-blur-sm border-b border-border/20">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                SplitWize
              </h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <NotificationBell />

            {/* Quick Add */}
            <Button
              onClick={onNewExpenseClick}
              size="sm"
              className="h-9 w-9 p-0 rounded-lg"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Menu */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-lg"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={userProfile?.photoURL || undefined} />
                    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                      {getInitials(
                        userProfile?.displayName || user?.displayName || "U"
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Profile Section */}
                  <div className="p-6 border-b border-border/10">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={userProfile?.photoURL || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {getInitials(
                            userProfile?.displayName || user?.displayName || "U"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">
                          {userProfile?.displayName ||
                            user?.displayName ||
                            "User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex-1 p-6 space-y-8">
                    {/* Quick Actions */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Actions
                      </h3>

                      <Link to="/">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <Plus className="h-4 w-4 mr-3 text-muted-foreground" />
                          Add Expense
                        </Button>
                      </Link>

                      <Link to="/">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <Users className="h-4 w-4 mr-3 text-muted-foreground" />
                          New Group
                        </Button>
                      </Link>

                      <ImportDialog>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                        >
                          <Upload className="h-4 w-4 mr-3 text-muted-foreground" />
                          Import Data
                        </Button>
                      </ImportDialog>
                    </div>

                    {/* Tools */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Tools
                      </h3>

                      <Link to="/search">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <Search className="h-4 w-4 mr-3 text-muted-foreground" />
                          Search
                        </Button>
                      </Link>

                      <Link to="/categories">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <Tag className="h-4 w-4 mr-3 text-muted-foreground" />
                          Categories
                        </Button>
                      </Link>

                      <Link to="/budgets">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <DollarSign className="h-4 w-4 mr-3 text-muted-foreground" />
                          Budgets
                        </Button>
                      </Link>

                      <Link to="/ai-assistant">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <Bot className="h-4 w-4 mr-3 text-muted-foreground" />
                          AI Assistant
                        </Button>
                      </Link>
                    </div>

                    {/* Account */}
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Account
                      </h3>

                      <Link to="/profile">
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-11 text-sm font-normal hover:bg-muted/50"
                          onClick={() => setIsSheetOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-muted-foreground" />
                          Profile
                        </Button>
                      </Link>

                      <div className="px-3 py-2">
                        <ModeToggle />
                      </div>
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="p-6 border-t border-border/10">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-11 text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={() => handleMenuItemClick(onLogout)}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  // Desktop Header
  return (
    <header
      className="sticky top-0 z-50 w-full bg-background border-b"
      role="banner"
    >
      <nav
        className="mx-auto max-w-7xl flex h-16 items-center px-6"
        aria-label="Main navigation"
      >
        {/* Left: Brand */}
        <div className="flex items-center space-x-3">
          <Link to="/">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-lg font-medium text-foreground">SplitWize</h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ModeToggle />

          {/* Search */}
          <Link to="/search">
            <Button variant="ghost" size="sm" className="h-9">
              <Search className="h-4 w-4" />
            </Button>
          </Link>

          {/* Notifications */}
          <NotificationBell />

          {/* Add Expense */}
          <Button onClick={onNewExpenseClick} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
          {/* Manage Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-4 rounded-xl hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                aria-label="Management options"
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Manage</span>
                <ChevronDown className="h-3 w-3 ml-2 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm"
            >
              <Link to="/add_expenses">
                <DropdownMenuItem className="h-11 rounded-lg">
                  <Tag className="h-4 w-4 mr-3" />
                  <span className="text-sm">Add expense</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/add_group">
                <DropdownMenuItem className="h-11 rounded-lg">
                  <Tag className="h-4 w-4 mr-3" />
                  <span className="text-sm">Add Group</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/categories">
                <DropdownMenuItem className="h-11 rounded-lg">
                  <Tag className="h-4 w-4 mr-3" />
                  <span className="text-sm">Categories</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/budgets">
                <DropdownMenuItem className="h-11 rounded-lg">
                  <DollarSign className="h-4 w-4 mr-3" />
                  <span className="text-sm">Budgets</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <ImportDialog>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="h-11 rounded-lg"
                >
                  <Upload className="h-4 w-4 mr-3" />
                  <span className="text-sm">Import Data</span>
                </DropdownMenuItem>
              </ImportDialog>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={userProfile?.photoURL || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(
                      userProfile?.displayName || user?.displayName || "U"
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">
                  {userProfile?.displayName || user?.displayName || "User"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <Link to="/profile">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
};
