import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  writeBatch,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirebaseNotification {
  id?: string;
  to: string; // uid of the user receiving the notification
  type: 'expense' | 'group-invite' | 'chat' | 'task' | 'poll' | 'member-joined' | 'member-left';
  title: string;
  message: string;
  groupId?: string;
  expenseId?: string;
  chatId?: string;
  createdAt: Timestamp;
  isRead: boolean;
  route: string; // where clicking the notification should take user
}

export class NotificationFirebaseService {
  private static instance: NotificationFirebaseService;

  static getInstance(): NotificationFirebaseService {
    if (!NotificationFirebaseService.instance) {
      NotificationFirebaseService.instance = new NotificationFirebaseService();
    }
    return NotificationFirebaseService.instance;
  }

  // Create a new notification in Firestore
  async createNotification(notification: Omit<FirebaseNotification, 'id' | 'createdAt'>) {
    try {
      const notificationData: Omit<FirebaseNotification, 'id'> = {
        ...notification,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Notification created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Listen to notifications for a specific user
  subscribeToUserNotifications(
    userId: string, 
    callback: (notifications: FirebaseNotification[]) => void
  ) {
    const q = query(
      collection(db, 'notifications'),
      where('to', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications: FirebaseNotification[] = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        } as FirebaseNotification);
      });
      callback(notifications);
    });
  }

  // Mark a notification as read
  async markAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('to', '==', userId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.update(doc.ref, { isRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Utility functions for creating specific types of notifications
  async notifyExpenseAdded(
    userId: string, 
    groupId: string, 
    groupName: string, 
    expenseDescription: string,
    expenseId: string
  ) {
    return this.createNotification({
      to: userId,
      type: 'expense',
      title: 'New Expense Added',
      message: `"${expenseDescription}" was added to ${groupName}`,
      groupId,
      expenseId,
      isRead: false,
      route: `/groups/${groupId}`
    });
  }

  async notifyGroupInvite(
    userId: string, 
    groupId: string, 
    groupName: string, 
    inviterName: string
  ) {
    return this.createNotification({
      to: userId,
      type: 'group-invite',
      title: 'Group Invitation',
      message: `${inviterName} invited you to join ${groupName}`,
      groupId,
      isRead: false,
      route: `/groups/${groupId}`
    });
  }

  async notifyMemberJoined(
    userId: string, 
    groupId: string, 
    groupName: string, 
    memberName: string
  ) {
    return this.createNotification({
      to: userId,
      type: 'member-joined',
      title: 'New Member Joined',
      message: `${memberName} joined ${groupName}`,
      groupId,
      isRead: false,
      route: `/groups/${groupId}`
    });
  }

  async notifyChatMessage(
    userId: string, 
    groupId: string, 
    groupName: string, 
    senderName: string,
    messagePreview: string
  ) {
    return this.createNotification({
      to: userId,
      type: 'chat',
      title: `New message in ${groupName}`,
      message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      groupId,
      isRead: false,
      route: `/groups/${groupId}?tab=chat`
    });
  }

  async notifyTaskAssigned(
    userId: string, 
    groupId: string, 
    groupName: string, 
    taskTitle: string
  ) {
    return this.createNotification({
      to: userId,
      type: 'task',
      title: 'Task Assigned',
      message: `You were assigned "${taskTitle}" in ${groupName}`,
      groupId,
      isRead: false,
      route: `/groups/${groupId}?tab=tasks`
    });
  }

  async notifyPollVote(
    userId: string, 
    groupId: string, 
    groupName: string, 
    voterName: string,
    pollTitle: string
  ) {
    return this.createNotification({
      to: userId,
      type: 'poll',
      title: 'Poll Vote',
      message: `${voterName} voted on "${pollTitle}" in ${groupName}`,
      groupId,
      isRead: false,
      route: `/groups/${groupId}?tab=polls`
    });
  }
}

export const notificationFirebaseService = NotificationFirebaseService.getInstance();