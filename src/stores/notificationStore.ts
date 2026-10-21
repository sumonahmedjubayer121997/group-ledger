import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification, NotificationType, NotificationPreferences } from '@/types/notifications';
import { FirebaseNotification, notificationFirebaseService } from '@/services/notificationFirebaseService';

interface NotificationStore {
  notifications: Notification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  /** Groups whose notifications you don't want to see (synced through your private settings). */
  mutedGroups: string[];
  /** The weekly "where you stand" summary is on (see useWeeklySummary). */
  weeklySummary: boolean;
  /** Your settings doc has loaded, so the two above are yours and not defaults. */
  settingsLoaded: boolean;
  isListening: boolean;
  unsubscribe: (() => void) | null;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId?: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: (userId?: string) => void;
  setGroupMuted: (userId: string, groupId: string, muted: boolean) => Promise<void>;
  setWeeklySummary: (userId: string, on: boolean) => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  
  // Firebase actions
  startListening: (userId: string) => void;
  stopListening: () => void;
  setNotifications: (notifications: FirebaseNotification[]) => void;
  
  // Helper methods
  getUnreadNotifications: () => Notification[];
  getRecentNotifications: (limit?: number) => Notification[];
}

const defaultPreferences: NotificationPreferences = {
  expenseNotifications: true,
  paymentReminders: true,
  groupActivity: true,
  systemAlerts: true,
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      preferences: defaultPreferences,
      unreadCount: 0,
      mutedGroups: [],
      weeklySummary: true,
      settingsLoaded: false,
      isListening: false,
      unsubscribe: null,

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          read: false,
        };

        set((state) => {
          const newNotifications = [notification, ...state.notifications].slice(0, 100); // Keep only latest 100
          const unreadCount = newNotifications.filter(n => !n.read).length;
          
          return {
            notifications: newNotifications,
            unreadCount,
          };
        });
      },

      markAsRead: async (id) => {
        // Mark as read in Firebase
        try {
          await notificationFirebaseService.markAsRead(id);
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }

        // Update local state
        set((state) => {
          const updatedNotifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      markAllAsRead: async (userId) => {
        if (userId) {
          try {
            await notificationFirebaseService.markAllAsRead(userId);
          } catch (error) {
            console.error('Error marking all notifications as read:', error);
          }
        }

        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        // Deleted in Firestore too, or the next sync would bring it back.
        void notificationFirebaseService.deleteNotifications([id]);
        set((state) => {
          const updatedNotifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      clearAllNotifications: (userId) => {
        if (userId) void notificationFirebaseService.clearAll(userId).catch((error) => console.error('Error clearing notifications:', error));
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      setGroupMuted: async (userId, groupId, muted) => {
        set((state) => ({
          mutedGroups: muted ? [...new Set([...state.mutedGroups, groupId])] : state.mutedGroups.filter((id) => id !== groupId),
        }));
        await notificationFirebaseService.setGroupMuted(userId, groupId, muted);
      },

      setWeeklySummary: async (userId, on) => {
        set({ weeklySummary: on });
        await notificationFirebaseService.setWeeklySummary(userId, on);
      },

      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },

      startListening: (userId: string) => {
        const { isListening, unsubscribe } = get();
        
        if (isListening) {
          return; // Already listening
        }

        const stopNotifications = notificationFirebaseService.subscribeToUserNotifications(
          userId,
          (firebaseNotifications) => {
            get().setNotifications(firebaseNotifications);
          }
        );
        const stopMuted = notificationFirebaseService.subscribeToSettings(userId, ({ mutedGroups, weeklySummary }) =>
          set({ mutedGroups, weeklySummary, settingsLoaded: true })
        );

        set({
          isListening: true,
          unsubscribe: () => {
            stopNotifications();
            stopMuted();
          },
        });
      },

      stopListening: () => {
        const { unsubscribe } = get();
        
        if (unsubscribe) {
          unsubscribe();
        }

        // Nothing of the previous account stays on screen.
        set({
          isListening: false,
          unsubscribe: null,
          notifications: [],
          unreadCount: 0,
          mutedGroups: [],
          settingsLoaded: false,
        });
      },

      setNotifications: (firebaseNotifications: FirebaseNotification[]) => {
        const notifications: Notification[] = firebaseNotifications
          .map(fn => ({
            id: fn.id || '',
            type: fn.type as NotificationType,
            title: fn.title,
            message: fn.message,
            groupId: fn.groupId,
            groupName: '', // We don't store group name in Firebase notifications
            userId: fn.to,
            userName: '', // We don't store user name in Firebase notifications
            amount: undefined,
            currency: undefined,
            timestamp: fn.createdAt.toDate(),
            read: fn.isRead,
            actionUrl: fn.route,
          }))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp desc

        const unreadCount = notifications.filter(n => !n.read).length;

        set({
          notifications,
          unreadCount,
        });
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },

      getRecentNotifications: (limit = 10) => {
        return get().notifications.slice(0, limit);
      },
    }),
    {
      name: 'notification-store',
      // Only the switches stay on the device; notifications and muted groups come from Firestore.
      partialize: (state) => ({ preferences: state.preferences }),
    }
  )
);