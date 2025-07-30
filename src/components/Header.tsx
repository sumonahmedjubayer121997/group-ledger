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
  ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
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
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsSheetOpen(false);
  };

  // Mobile Header
  if (isMobile) {
    return (
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center px-4">
          {/* Logo */}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">SplitWize</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Split expenses smartly
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            
            {/* Quick Add Expense */}
            <Button
              onClick={onNewExpenseClick}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Profile & Menu */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.photoURL || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(userProfile?.displayName || user?.displayName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </SheetTrigger>
              
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Profile Section */}
                  <div className="p-6 border-b bg-muted/30">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={userProfile?.photoURL || undefined} />
                        <AvatarFallback>
                          {getInitials(userProfile?.displayName || user?.displayName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {userProfile?.displayName || user?.displayName || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex-1 p-4 space-y-2">
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Quick Actions
                      </h3>
                      
                       <Link to="/">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <Plus className="h-4 w-4 mr-3" />
                           Add Expense
                         </Button>
                       </Link>
                       
                       <Link to="/">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <Users className="h-4 w-4 mr-3" />
                           New Group
                         </Button>
                       </Link>
                      
                      <ImportDialog>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-10"
                        >
                          <Upload className="h-4 w-4 mr-3" />
                          Import CSV
                        </Button>
                      </ImportDialog>
                    </div>

                    <div className="space-y-1 pt-4">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Tools
                      </h3>
                      
                       <Link to="/search">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <Search className="h-4 w-4 mr-3" />
                           Search
                         </Button>
                       </Link>
                       
                       <Link to="/categories">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <Tag className="h-4 w-4 mr-3" />
                           Categories
                         </Button>
                       </Link>
                       
                       <Link to="/budgets">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <DollarSign className="h-4 w-4 mr-3" />
                           Budgets
                         </Button>
                       </Link>
                       
                       <Link to="/ai-assistant">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <Bot className="h-4 w-4 mr-3" />
                           AI Assistant
                         </Button>
                       </Link>
                    </div>

                    <div className="space-y-1 pt-4">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Account
                      </h3>
                      
                       <Link to="/profile">
                         <Button
                           variant="ghost"
                           className="w-full justify-start h-10"
                           onClick={() => setIsSheetOpen(false)}
                         >
                           <User className="h-4 w-4 mr-3" />
                           Profile
                         </Button>
                       </Link>
                      
                      <div className="px-2 py-1">
                        <ModeToggle />
                      </div>
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="p-4 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleMenuItemClick(onLogout)}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
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
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-foreground">SplitWize</h1>
          <p className="text-sm text-muted-foreground hidden lg:block">
            Split expenses with friends and family
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <ModeToggle />
          <NotificationBell />
          
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/search">
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </Link>
            
            <Link to="/ai-assistant">
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
            </Link>
          </div>

          {/* Management Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 hidden md:flex">
                <Settings className="h-4 w-4 mr-2" />
                Manage
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <Link to="/categories">
                <DropdownMenuItem>
                  <Tag className="h-4 w-4 mr-2" />
                  Categories
                </DropdownMenuItem>
              </Link>
              <Link to="/budgets">
                <DropdownMenuItem>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Budgets
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <ImportDialog>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </DropdownMenuItem>
              </ImportDialog>
            </DropdownMenuContent>
          </DropdownMenu>

            {/* Primary Actions */}
            <div className="flex items-center space-x-2">
              <Link to="/">
                <Button
                  size="sm"
                  className="h-9"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </Link>
              
              <Link to="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 hidden sm:flex"
                >
                  <Users className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </Link>
            </div>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={userProfile?.photoURL || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(userProfile?.displayName || user?.displayName || 'U')}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-2 text-sm font-medium hidden lg:block">
                  {userProfile?.displayName || user?.displayName || 'User'}
                </span>
                <ChevronDown className="h-3 w-3 ml-1 hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {userProfile?.displayName || user?.displayName || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <Link to="/profile">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};