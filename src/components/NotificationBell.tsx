import { useState, useEffect } from 'react';
import { Bell, X, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      const url = new URL(notification.actionUrl, window.location.origin);
      const pathParts = url.pathname.split('/');
      if (pathParts[1] === 'groups' && pathParts[2]) {
        const groupId = pathParts[2];
        const tabParam = url.searchParams.get('tab');
        const group = groups.find(g => g.id === groupId);
        if (group) {
          setSelectedGroup(group);
          if (tabParam === 'chat') {
            sessionStorage.setItem('openTab', 'chat');
          }
        }
      } else {
        navigate(notification.actionUrl);
      }
      setIsOpen(false);
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
          className="relative hover:bg-gray-100"
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

      <PopoverContent className="w-80 p-0 bg-white" align="end">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="hover:bg-gray-100"
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
                className="hover:bg-gray-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showSettings ? (
          <Card className="m-4 border-0 shadow-none bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-900">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-800">Expense Updates</span>
                <Switch
                  checked={preferences.expenseNotifications}
                  onCheckedChange={(checked) =>
                    updatePreferences({ expenseNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-800">Payment Reminders</span>
                <Switch
                  checked={preferences.paymentReminders}
                  onCheckedChange={(checked) =>
                    updatePreferences({ paymentReminders: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-800">Group Activity</span>
                <Switch
                  checked={preferences.groupActivity}
                  onCheckedChange={(checked) =>
                    updatePreferences({ groupActivity: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-800">System Alerts</span>
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
              <div className="p-3 border-b border-gray-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    markAllAsRead(user?.uid);
                    toast({ title: "All notifications marked as read" });
                  }}
                >
                  Mark all as read ({unreadCount})
                </Button>
              </div>
            )}

            <ScrollArea className="h-80 bg-white text-black">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                        ${!notification.read ? 'bg-gray-50' : 'bg-white'}
                        hover:bg-gray-100`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className="text-xl mt-1 opacity-70">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(notification.timestamp)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        tabIndex={-1}
                        aria-label="Remove notification"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {!notification.read && (
                        <span className="absolute top-3 right-3 h-2 w-2 bg-black rounded-full" />
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