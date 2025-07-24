import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification, NotificationType, NotificationPreferences } from '@/types/notifications';
import { FirebaseNotification, notificationFirebaseService } from '@/services/notificationFirebaseService';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationStore {
  notifications: Notification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  isListening: boolean;
  unsubscribe: (() => void) | null;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId?: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
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
        set((state) => {
          const updatedNotifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
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

        const unsubscribeFn = notificationFirebaseService.subscribeToUserNotifications(
          userId,
          (firebaseNotifications) => {
            get().setNotifications(firebaseNotifications);
          }
        );

        set({
          isListening: true,
          unsubscribe: unsubscribeFn,
        });
      },

      stopListening: () => {
        const { unsubscribe } = get();
        
        if (unsubscribe) {
          unsubscribe();
        }

        set({
          isListening: false,
          unsubscribe: null,
        });
      },

      setNotifications: (firebaseNotifications: FirebaseNotification[]) => {
        const notifications: Notification[] = firebaseNotifications.map(fn => ({
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
        }));

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
    }
  )
);