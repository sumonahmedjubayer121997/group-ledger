
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt?: Date;
  preferences: {
    currency: string;
    notifications: boolean;
    theme: 'light' | 'dark';
    language?: string;
  };
  verified?: boolean;
}

// Firebase types (what's stored in Firestore)
export interface FirebaseExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface FirebaseGroup {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  updatedAt?: Date;
  settings?: {
    currency: string;
    simplifyDebts: boolean;
    notifications: boolean;
  };
}

// Store types (used in components and store)
export interface Member {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'member' | 'viewer';
  joinedAt?: Date;
}

export interface GroupSettings {
  currency: string;
  simplifyDebts: boolean;
  notifications: boolean;
  recurringBills: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: Date;
  createdBy: string;
  photo: string;
  coverImage: string;
  groupType: 'private' | 'public';
  inviteCode: string;
  settings: GroupSettings;
  tags: string[];
  location: string;
  isArchived: boolean;
  memberNames: Record<string, string>;
  memberEmails: Record<string, string>;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: Member;
  splitAmong: Member[];
  groupId: string;
  category: string;
  date: Date;
  splitType: 'equal' | 'exact' | 'percentage';
  splitData: Record<string, number>;
}

export interface Balance {
  from: Member;
  to: Member;
  amount: number;
}

export interface Settlement {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  referenceId?: string;
  notes?: string;
  status: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: Member;
  splitAmong: Member[];
  category: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDue: Date;
  isActive: boolean;
  groupId: string;
}
