
import { useState } from "react";
import { Menu, X, Users, UserPlus, Settings, LogOut , HandCoins, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExpenseForm } from "@/components/ExpenseForm";
import { NotificationBell } from "@/components/NotificationBell";
import { ImportDialog } from "@/components/ImportDialog";


interface MobileNavbarProps {
  onProfileClick: () => void;
  onNewGroupClick: () => void;
  onLogout: () => void;
}

export const MobileNavbar = ({ onProfileClick, onNewGroupClick, onLogout }: MobileNavbarProps) => {
   const [showExpenseForm, setShowExpenseForm] = useState(false);
  const { user, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b md:hidden">
      <div>
        <h1 className="text-xl font-bold text-gray-900">SplitWize</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Avatar className="h-8 w-8">
          <AvatarImage src={userProfile?.photoURL || undefined} />
          <AvatarFallback className="text-sm">
            {getInitials(userProfile?.displayName || user?.displayName || 'U')}
          </AvatarFallback>
        </Avatar>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <div className="flex flex-col space-y-4 pt-4">
              <div className="flex items-center space-x-3 pb-4 border-b">
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.photoURL || undefined} />
                  <AvatarFallback>
                    {getInitials(userProfile?.displayName || user?.displayName || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{userProfile?.displayName || user?.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleMenuItemClick(onProfileClick)}
              >
                <UserPlus className="h-4 w-4 mr-3" />
                Profile
              </Button>
              <Button
                    onClick={() => setShowExpenseForm(true)}
                    className="justify-start"
                    size="sm"
                    variant="ghost"
                  >
                    <HandCoins className="h-3 w-3 mr-3" />
                    Add Expense
                  </Button>
                  <ImportDialog>
                                      <Button
                                        variant="ghost"
                                         className="justify-start"
                                        size="sm"
                                      >
                                        <Upload className="h-4 w-4 mr-3" />
                                        Import CSV
                                      </Button>
                                    </ImportDialog>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleMenuItemClick(onNewGroupClick)}
              >
                <Users className="h-4 w-4 mr-3" />
                New Group
              </Button>
              
              <Button
                variant="ghost"
                className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleMenuItemClick(onLogout)}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </Button>
                 <ExpenseForm
                            isOpen={showExpenseForm}
                            onClose={() => setShowExpenseForm(false)}
                          />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
