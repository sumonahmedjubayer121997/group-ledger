export type NotificationType = 
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'you_owe'
  | 'owes_you'
  | 'payment_reminder'
  | 'recurring_bill'
  | 'overdue_payment'
  | 'member_joined'
  | 'member_left'
  | 'role_changed'
  | 'invite_generated'
  | 'settings_updated';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  groupId?: string;
  groupName?: string;
  userId?: string;
  userName?: string;
  amount?: number;
  currency?: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export type NotificationPreferences = {
  expenseNotifications: boolean;
  paymentReminders: boolean;
  groupActivity: boolean;
  systemAlerts: boolean;
};