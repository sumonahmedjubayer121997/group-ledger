import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, HandCoins, MessageCircle, Receipt, Settings, Trash2, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotificationStore } from '@/stores/notificationStore';
import { useExpenseStore } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/dates';
import type { Notification, NotificationPreferences } from '@/types/notifications';

type Kind = keyof NotificationPreferences;

/** Which preference switch covers each notification type. */
const kindOf = (type: string): Kind => {
  if (type.startsWith('expense')) return 'expenseNotifications';
  if (['settlement_made', 'settlement_removed', 'weekly_summary', 'you_owe', 'owes_you', 'payment_reminder', 'overdue_payment', 'recurring_bill'].includes(type))
    return 'paymentReminders';
  if (['chat', 'poll', 'task', 'group_updated', 'member_joined', 'member_left', 'role_changed', 'invite_generated', 'settings_updated'].includes(type))
    return 'groupActivity';
  return 'systemAlerts';
};

const icons: Record<Kind, typeof Bell> = {
  expenseNotifications: Receipt,
  paymentReminders: HandCoins,
  groupActivity: Users,
  systemAlerts: Bell,
};

const switches: { key: Kind; label: string }[] = [
  { key: 'expenseNotifications', label: 'New and changed expenses' },
  { key: 'paymentReminders', label: 'Payments and reminders' },
  { key: 'groupActivity', label: 'Chat, polls, tasks and members' },
  { key: 'systemAlerts', label: 'Everything else' },
];

/** How several of one kind read when folded together: "3 expenses added in Lisbon trip". */
const plural: Record<string, string> = {
  expense_added: 'expenses added',
  expense_edited: 'expenses edited',
  expense_deleted: 'expenses deleted',
  expense: 'expense updates',
  settlement_made: 'payments recorded',
  settlement_removed: 'payments removed',
  chat: 'new messages',
};
const BURST_MS = 12 * 60 * 60 * 1000;

/** Folds a run of same-kind notifications from one group (all read or all unread) into one row. */
function fold(list: Notification[]) {
  const rows: Notification[][] = [];
  for (const n of list) {
    const row = rows[rows.length - 1];
    const head = row?.[0];
    const same =
      head &&
      n.groupId &&
      head.groupId === n.groupId &&
      head.type === n.type &&
      head.read === n.read &&
      new Date(head.timestamp).getTime() - new Date(n.timestamp).getTime() < BURST_MS;
    if (same) row.push(n);
    else rows.push([n]);
  }
  return rows;
}

export const NotificationBell = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    preferences,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updatePreferences,
    mutedGroups,
    setGroupMuted,
    weeklySummary,
    setWeeklySummary,
    startListening,
    stopListening,
  } = useNotificationStore();
  const groups = useExpenseStore((s) => s.groups);
  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  useEffect(() => {
    if (user?.uid) startListening(user.uid);
    return () => stopListening();
  }, [user?.uid, startListening, stopListening]);

  // Only the kinds switched on in the settings, from groups that aren't muted, are shown and counted.
  const visible = useMemo(
    () =>
      notifications
        .filter((n) => preferences[kindOf(n.type)] !== false && !(n.groupId && mutedGroups.includes(n.groupId)))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [notifications, preferences, mutedGroups]
  );
  const unread = visible.filter((n) => !n.read).length;
  const rows = useMemo(() => fold(visible).slice(0, 30), [visible]);

  const open = (row: Notification[]) => {
    for (const n of row) if (!n.read) markAsRead(n.id);
    const url = row[0].actionUrl && new URL(row[0].actionUrl, window.location.origin);
    if (url) navigate(url.pathname + url.search);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
          <Bell aria-hidden="true" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-medium text-background"
              aria-hidden="true"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[22rem] max-w-[calc(100vw-2rem)] p-0" align="end" aria-label="Notifications">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-display text-xl">Notifications</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Notification settings"
              aria-pressed={showSettings}
            >
              <Settings aria-hidden="true" />
            </Button>
            {visible.length > 0 && !showSettings && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => clearAllNotifications(user?.uid)} aria-label="Clear all notifications">
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {showSettings ? (
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">Show notifications about:</p>
            {switches.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`notify-${key}`} className="font-normal">
                  {label}
                </Label>
                <Switch
                  id={`notify-${key}`}
                  checked={preferences[key] !== false}
                  onCheckedChange={(checked) => updatePreferences({ [key]: checked })}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <Label htmlFor="notify-weekly" className="font-normal">
                Weekly summary, Sunday evening
                <span className="block text-xs text-muted-foreground">What you owe and are owed, and overdue loans</span>
              </Label>
              <Switch id="notify-weekly" checked={weeklySummary} onCheckedChange={(on) => user && void setWeeklySummary(user.uid, on)} />
            </div>
            {mutedGroups.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm text-muted-foreground">Muted groups</p>
                <ul className="space-y-1">
                  {mutedGroups.map((id) => (
                    <li key={id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{groupName.get(id) ?? 'A group you left'}</span>
                      </span>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => user && setGroupMuted(user.uid, id, false)}>
                        Unmute
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSettings(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {unread > 0 && (
              <div className="border-b px-2 py-1.5">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => markAllAsRead(user?.uid)}>
                  Mark all as read ({unread})
                </Button>
              </div>
            )}
            <ScrollArea className="h-80">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center p-8 text-center text-muted-foreground">
                  <Bell className="mb-2 h-6 w-6" aria-hidden="true" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {rows.map((row) => {
                    const n = row[0];
                    const many = row.length > 1;
                    const where = n.groupId && groupName.get(n.groupId);
                    const title = many ? `${row.length} ${plural[n.type] ?? 'updates'}${where ? ` in ${where}` : ''}` : n.title;
                    const message = many
                      ? `${row.slice(0, 2).map((r) => r.title).join(' · ')}${row.length > 2 ? ` and ${row.length - 2} more` : ''}`
                      : n.message;
                    const Icon = (n.type as string) === 'chat' ? MessageCircle : icons[kindOf(n.type)];
                    return (
                      <li key={n.id} className={`group relative flex items-start ${n.read ? '' : 'bg-secondary/60'}`}>
                        <button
                          type="button"
                          onClick={() => open(row)}
                          className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {!n.read && <span className="sr-only">Unread: </span>}
                              {title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{message}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateTime(n.timestamp)}</span>
                          </span>
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-foreground" aria-hidden="true" />}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mr-1 mt-2 h-7 w-7 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => row.forEach((r) => removeNotification(r.id))}
                          aria-label={`Remove notification: ${title}`}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
