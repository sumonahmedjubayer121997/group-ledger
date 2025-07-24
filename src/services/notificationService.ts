import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationType } from '@/types/notifications';

interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  groupId?: string;
  groupName?: string;
  userId?: string;
  userName?: string;
  amount?: number;
  currency?: string;
  actionUrl?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private checkPreferences(type: NotificationType): boolean {
    const preferences = useNotificationStore.getState().preferences;
    
    switch (type) {
      case 'expense_added':
      case 'expense_edited':
      case 'expense_deleted':
        return preferences.expenseNotifications;
      
      case 'you_owe':
      case 'owes_you':
      case 'payment_reminder':
      case 'recurring_bill':
      case 'overdue_payment':
        return preferences.paymentReminders;
      
      case 'member_joined':
      case 'member_left':
      case 'role_changed':
        return preferences.groupActivity;
      
      case 'invite_generated':
      case 'settings_updated':
        return preferences.systemAlerts;
      
      default:
        return true;
    }
  }

  addNotification(data: NotificationData): void {
    if (!this.checkPreferences(data.type)) {
      return; // Don't add notification if disabled in preferences
    }

    const { addNotification } = useNotificationStore.getState();
    addNotification(data);
  }

  // Expense-related notifications
  notifyExpenseAdded(expenseTitle: string, amount: number, currency: string, userName: string, groupName: string, groupId: string): void {
    this.addNotification({
      type: 'expense_added',
      title: 'New Expense Added',
      message: `${userName} added an expense: '${expenseTitle} – ${currency}${amount}' in ${groupName} group.`,
      groupId,
      groupName,
      userName,
      amount,
      currency,
      actionUrl: `/group/${groupId}`,
    });
  }

  notifyExpenseEdited(expenseTitle: string, userName: string, groupName: string, groupId: string): void {
    this.addNotification({
      type: 'expense_edited',
      title: 'Expense Updated',
      message: `${userName} edited the expense: '${expenseTitle}'.`,
      groupId,
      groupName,
      userName,
      actionUrl: `/group/${groupId}`,
    });
  }

  notifyExpenseDeleted(expenseTitle: string, userName: string, groupName: string, groupId: string): void {
    this.addNotification({
      type: 'expense_deleted',
      title: 'Expense Deleted',
      message: `${userName} deleted the expense: '${expenseTitle}' from ${groupName}.`,
      groupId,
      groupName,
      userName,
      actionUrl: `/group/${groupId}`,
    });
  }

  // Payment notifications
  notifyYouOwe(amount: number, currency: string, userName: string, groupName?: string): void {
    this.addNotification({
      type: 'you_owe',
      title: 'Payment Due',
      message: `You owe ${currency}${amount} to ${userName}${groupName ? ` in ${groupName}` : ''}.`,
      userName,
      amount,
      currency,
      groupName,
    });
  }

  notifyOwesYou(amount: number, currency: string, userName: string, groupName?: string): void {
    this.addNotification({
      type: 'owes_you',
      title: 'Payment Expected',
      message: `${userName} owes you ${currency}${amount}${groupName ? ` in ${groupName}` : ''}.`,
      userName,
      amount,
      currency,
      groupName,
    });
  }

  notifyPaymentReminder(amount: number, currency: string, daysLeft: number, groupName: string): void {
    this.addNotification({
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `You have ${currency}${amount} due in ${daysLeft} days in the ${groupName} group.`,
      amount,
      currency,
      groupName,
    });
  }

  notifyRecurringBill(billName: string, amount: number, currency: string): void {
    this.addNotification({
      type: 'recurring_bill',
      title: 'Recurring Bill Due',
      message: `Your recurring bill: '${billName}' (${currency}${amount}) is due tomorrow.`,
      amount,
      currency,
    });
  }

  notifyOverduePayment(amount: number, currency: string, userName: string, daysOverdue: number): void {
    this.addNotification({
      type: 'overdue_payment',
      title: 'Overdue Payment',
      message: `Your payment of ${currency}${amount} to ${userName} is ${daysOverdue} days overdue.`,
      userName,
      amount,
      currency,
    });
  }

  // Group activity notifications
  notifyMemberJoined(userName: string, groupName: string, groupId: string): void {
    this.addNotification({
      type: 'member_joined',
      title: 'New Member Joined',
      message: `${userName} joined the group ${groupName}.`,
      userName,
      groupName,
      groupId,
      actionUrl: `/group/${groupId}`,
    });
  }

  notifyMemberLeft(userName: string, groupName: string, groupId: string): void {
    this.addNotification({
      type: 'member_left',
      title: 'Member Left',
      message: `${userName} left the group ${groupName}.`,
      userName,
      groupName,
      groupId,
      actionUrl: `/group/${groupId}`,
    });
  }

  notifyRoleChanged(newRole: string, groupName: string, changedBy: string): void {
    this.addNotification({
      type: 'role_changed',
      title: 'Role Updated',
      message: `You have been ${newRole === 'admin' ? 'promoted to Admin' : `assigned as ${newRole}`} by ${changedBy} in ${groupName}.`,
      userName: changedBy,
      groupName,
    });
  }

  // System notifications
  notifyInviteGenerated(groupName: string, groupId: string): void {
    this.addNotification({
      type: 'invite_generated',
      title: 'Invite Code Generated',
      message: `New invite code generated for ${groupName} group.`,
      groupName,
      groupId,
      actionUrl: `/group/${groupId}/settings`,
    });
  }

  notifySettingsUpdated(settingName: string, groupName: string, userName: string): void {
    this.addNotification({
      type: 'settings_updated',
      title: 'Group Settings Updated',
      message: `${settingName} updated by ${userName} in ${groupName}.`,
      userName,
      groupName,
    });
  }
}

export const notificationService = NotificationService.getInstance();