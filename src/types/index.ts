
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

// Firebase Expense type (what's stored in Firestore)
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

// Firebase Group type (what's stored in Firestore)
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

// Re-export for compatibility
export type Expense = FirebaseExpense;
export type Group = FirebaseGroup;
