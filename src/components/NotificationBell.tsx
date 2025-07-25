import { useState, useEffect } from 'react';
import { Bell, X, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useNotificationStore } from '@/stores/notificationStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const NotificationBell = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, setSelectedGroup } = useExpenseStore();
  
  const {
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updatePreferences,
    getRecentNotifications,
    startListening,
    stopListening,
  } = useNotificationStore();

  const recentNotifications = getRecentNotifications(10);

  // Start listening for notifications when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      startListening(user.uid);
    }

    return () => {
      stopListening();
    };
  }, [user?.uid, startListening, stopListening]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      // Parse the URL to handle group navigation
      const url = new URL(notification.actionUrl, window.location.origin);
      const pathParts = url.pathname.split('/');
      
      if (pathParts[1] === 'groups' && pathParts[2]) {
        const groupId = pathParts[2];
        const tabParam = url.searchParams.get('tab');
        
        // Find the group and set it as selected
        const group = groups.find(g => g.id === groupId);
        if (group) {
          setSelectedGroup(group);
          
          // If there's a tab parameter, we could trigger a custom event or use a callback
          // For now, the GroupDetailView will need to handle tab switching
          if (tabParam === 'chat') {
            // Store the tab to switch to in sessionStorage so GroupDetailView can pick it up
            sessionStorage.setItem('openTab', 'chat');
          }
        }
      } else {
        // For other routes, use normal navigation
        navigate(notification.actionUrl);
      }
      
      setIsOpen(false); // Close the popover after navigation
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense_added':
      case 'expense_edited':
      case 'expense_deleted':
        return '💵';
      case 'you_owe':
      case 'owes_you':
      case 'payment_reminder':
      case 'overdue_payment':
        return '💰';
      case 'recurring_bill':
        return '⏰';
      case 'member_joined':
      case 'member_left':
      case 'role_changed':
        return '👥';
      case 'invite_generated':
      case 'settings_updated':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const formatTime = (timestamp: Date) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-secondary/80"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearAllNotifications();
                  toast({ title: "All notifications cleared" });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showSettings ? (
          <Card className="m-4 border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Expense Updates</span>
                <Switch
                  checked={preferences.expenseNotifications}
                  onCheckedChange={(checked) =>
                    updatePreferences({ expenseNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Payment Reminders</span>
                <Switch
                  checked={preferences.paymentReminders}
                  onCheckedChange={(checked) =>
                    updatePreferences({ paymentReminders: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Group Activity</span>
                <Switch
                  checked={preferences.groupActivity}
                  onCheckedChange={(checked) =>
                    updatePreferences({ groupActivity: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">System Alerts</span>
                <Switch
                  checked={preferences.systemAlerts}
                  onCheckedChange={(checked) =>
                    updatePreferences({ systemAlerts: checked })
                  }
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowSettings(false)}
              >
                Done
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {unreadCount > 0 && (
              <div className="p-3 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => {
                    markAllAsRead(user?.uid);
                    toast({ title: "All notifications marked as read" });
                  }}
                >
                  Mark all as read ({unreadCount})
                </Button>
              </div>
            )}

            <ScrollArea className="h-80">
              {recentNotifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative p-3 rounded-lg cursor-pointer transition-colors hover:bg-secondary/50 ${
                        !notification.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <span className="text-lg leading-none">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 leading-tight">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {!notification.read && (
                        <div className="absolute top-3 right-3 h-2 w-2 bg-primary rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};