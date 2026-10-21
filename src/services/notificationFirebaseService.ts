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
  getDocs,
  deleteDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirebaseNotification {
  id?: string;
  to: string; // uid of the user receiving the notification
  /** Who sent it; they may take it back (an Undo right after recording a payment). */
  from?: string;
  type:
    | 'expense'
    | 'expense_added'
    | 'expense_edited'
    | 'expense_deleted'
    | 'settlement_made'
    | 'settlement_removed'
    | 'payment_reminder'
    | 'weekly_summary'
    | 'group-invite'
    | 'chat'
    | 'task'
    | 'poll'
    | 'member-joined'
    | 'member-left';
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

  /** Sends one notification and never throws: a failed notification mustn't fail the change it's about. */
  async send(notification: Omit<FirebaseNotification, 'id' | 'createdAt' | 'isRead'>): Promise<string | null> {
    try {
      return await this.createNotification({ ...notification, isRead: false });
    } catch {
      return null;
    }
  }

  /** Removes notifications: your own, or ones you sent (see `from`). */
  async deleteNotifications(ids: string[]) {
    await Promise.all(ids.map((id) => deleteDoc(doc(db, 'notifications', id)).catch(() => undefined)));
  }

  /** Clears everything sent to you, for good (clearing only on screen brought it all back on the next sync). */
  async clearAll(userId: string) {
    const snapshot = await getDocs(query(collection(db, 'notifications'), where('to', '==', userId)));
    for (let i = 0; i < snapshot.docs.length; i += 400) {
      const batch = writeBatch(db);
      for (const d of snapshot.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  }

  /**
   * Your notification settings, kept in a private doc so they follow you to every device: groups
   * you muted, and whether you want the weekly summary (on unless switched off).
   */
  subscribeToSettings(userId: string, callback: (settings: { mutedGroups: string[]; weeklySummary: boolean }) => void) {
    return onSnapshot(
      doc(db, 'users', userId, 'settings', 'notifications'),
      (snap) => callback({ mutedGroups: (snap.data()?.mutedGroups as string[] | undefined) ?? [], weeklySummary: snap.data()?.weeklySummary !== false }),
      () => callback({ mutedGroups: [], weeklySummary: true })
    );
  }

  async setWeeklySummary(userId: string, on: boolean) {
    await setDoc(doc(db, 'users', userId, 'settings', 'notifications'), { weeklySummary: on }, { merge: true });
  }

  /** Marks this week's summary as sent; false when another device of yours already sent it. */
  async claimSummaryWeek(userId: string, week: string): Promise<boolean> {
    const ref = doc(db, 'users', userId, 'settings', 'notifications');
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.data()?.lastSummaryWeek === week) return false;
      tx.set(ref, { lastSummaryWeek: week }, { merge: true });
      return true;
    });
  }

  async setGroupMuted(userId: string, groupId: string, muted: boolean) {
    await setDoc(
      doc(db, 'users', userId, 'settings', 'notifications'),
      { mutedGroups: muted ? arrayUnion(groupId) : arrayRemove(groupId) },
      { merge: true }
    );
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