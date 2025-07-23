import { create } from 'zustand';
import { 
  createGroup as createFirebaseGroup,
  getUserGroups,
  createExpense as createFirebaseExpense,
  getExpenses,
  subscribeToUserGroups,
  subscribeToGroupExpenses,
  addMemberToGroup,
  removeMemberFromGroup,
  updateGroup as updateFirebaseGroup,
  deleteGroup as deleteFirebaseGroup,
  updateExpense as updateFirebaseExpense,
  deleteExpense as deleteFirebaseExpense
} from '@/services/firebaseService';
import { FirebaseGroup, FirebaseExpense, Group, Expense, Member, GroupSettings } from '@/types';

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Group {
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

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: Member;
  splitAmong: Member[];
  groupId: string;
  category: string;
  date: Date;
  splitType: 'equal' | 'unequal';
  splitData: Record<string, number>;
}

interface GroupSettings {
  currency: string;
  simplifyDebts: boolean;
  notifications: boolean;
  recurringBills: boolean;
}

interface ExpenseStore {
  // State
  groups: Group[];
  expenses: Expense[];
  currentGroupId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentGroup: (groupId: string | null) => void;
  fetchGroups: (userId: string) => Promise<void>;
  createGroup: (groupData: Omit<Group, 'id' | 'createdAt' | 'createdBy'>, userId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMember: (groupId: string, member: Member) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  
  fetchExpenses: (groupId: string) => Promise<void>;
  createExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  subscribeToGroups: (userId: string) => () => void;
  subscribeToExpenses: (groupId: string) => () => void;
  
  clearError: () => void;
  resetStore: () => void;
}

// Helper functions to convert between Firebase and Store types
const convertFirebaseGroupToGroup = (firebaseGroup: FirebaseGroup, memberData: Record<string, Member> = {}): Group => {
  return {
    id: firebaseGroup.id,
    name: firebaseGroup.name,
    description: firebaseGroup.description || '',
    members: firebaseGroup.members.map(memberId => 
      memberData[memberId] || { id: memberId, name: `User ${memberId}`, email: '' }
    ),
    createdAt: firebaseGroup.createdAt,
    createdBy: firebaseGroup.createdBy,
    photo: '',
    coverImage: '',
    groupType: 'private',
    inviteCode: '',
    settings: firebaseGroup.settings || {
      currency: 'USD',
      simplifyDebts: true,
      notifications: true,
      recurringBills: false,
    },
    tags: [],
    location: '',
    isArchived: false,
    memberNames: firebaseGroup.members.reduce((acc, memberId) => {
      acc[memberId] = memberData[memberId]?.name || `User ${memberId}`;
      return acc;
    }, {} as Record<string, string>),
    memberEmails: firebaseGroup.members.reduce((acc, memberId) => {
      acc[memberId] = memberData[memberId]?.email || '';
      return acc;
    }, {} as Record<string, string>),
  };
};

const convertGroupToFirebaseGroup = (group: Group): Omit<FirebaseGroup, 'id' | 'createdAt'> => {
  return {
    name: group.name,
    description: group.description,
    members: group.members.map(member => member.id),
    createdBy: group.createdBy,
    settings: group.settings,
  };
};

const convertFirebaseExpenseToExpense = (firebaseExpense: FirebaseExpense, memberData: Record<string, Member> = {}): Expense => {
  return {
    id: firebaseExpense.id,
    description: firebaseExpense.description,
    amount: firebaseExpense.amount,
    paidBy: memberData[firebaseExpense.paidBy] || { id: firebaseExpense.paidBy, name: `User ${firebaseExpense.paidBy}`, email: '' },
    splitAmong: firebaseExpense.splitBetween.map(memberId => 
      memberData[memberId] || { id: memberId, name: `User ${memberId}`, email: '' }
    ),
    groupId: firebaseExpense.groupId,
    category: firebaseExpense.category || 'general',
    date: firebaseExpense.createdAt,
    splitType: 'equal',
    splitData: {},
  };
};

const convertExpenseToFirebaseExpense = (expense: Expense): Omit<FirebaseExpense, 'id' | 'createdAt'> => {
  return {
    description: expense.description,
    amount: expense.amount,
    paidBy: expense.paidBy.id,
    splitBetween: expense.splitAmong.map(member => member.id),
    groupId: expense.groupId,
    category: expense.category,
  };
};

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  // Initial state
  groups: [],
  expenses: [],
  currentGroupId: null,
  loading: false,
  error: null,

  // Actions
  setCurrentGroup: (groupId) => set({ currentGroupId: groupId }),

  fetchGroups: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const firebaseGroups = await getUserGroups(userId);
      const groups = firebaseGroups.map(group => convertFirebaseGroupToGroup(group));
      set({ groups, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createGroup: async (groupData, userId) => {
    set({ loading: true, error: null });
    try {
      const firebaseGroupData = {
        name: groupData.name,
        description: groupData.description,
        members: groupData.members.map(member => member.id),
        createdBy: userId,
        settings: groupData.settings,
      };
      
      const newFirebaseGroup = await createFirebaseGroup(firebaseGroupData, userId);
      const newGroup = convertFirebaseGroupToGroup(newFirebaseGroup);
      
      set(state => ({ 
        groups: [...state.groups, newGroup], 
        loading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateGroup: async (groupId, updates) => {
    set({ loading: true, error: null });
    try {
      const firebaseUpdates: Partial<FirebaseGroup> = {};
      
      if (updates.name) firebaseUpdates.name = updates.name;
      if (updates.description) firebaseUpdates.description = updates.description;
      if (updates.members) firebaseUpdates.members = updates.members.map(member => member.id);
      if (updates.settings) firebaseUpdates.settings = updates.settings;
      
      await updateFirebaseGroup(groupId, firebaseUpdates);
      
      set(state => ({
        groups: state.groups.map(group => 
          group.id === groupId ? { ...group, ...updates } : group
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteGroup: async (groupId: string) => {
    set({ loading: true, error: null });
    try {
      await deleteFirebaseGroup(groupId);
      set(state => ({
        groups: state.groups.filter(group => group.id !== groupId),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addMember: async (groupId: string, member: Member) => {
    set({ loading: true, error: null });
    try {
      await addMemberToGroup(groupId, member, member.id);
      set(state => ({
        groups: state.groups.map(group =>
          group.id === groupId ? { ...group, members: [...group.members, member] } : group
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  removeMember: async (groupId: string, memberId: string) => {
    set({ loading: true, error: null });
    try {
      await removeMemberFromGroup(groupId, memberId);
      set(state => ({
        groups: state.groups.map(group => ({
          ...group,
          members: group.members.filter(member => member.id !== memberId)
        })),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchExpenses: async (groupId: string) => {
    set({ loading: true, error: null });
    try {
      const firebaseExpenses = await getExpenses(groupId);
      const expenses = firebaseExpenses.map(expense => convertFirebaseExpenseToExpense(expense));
      set({ expenses, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createExpense: async (expenseData) => {
    set({ loading: true, error: null });
    try {
      const firebaseExpenseData = convertExpenseToFirebaseExpense(expenseData);
      const newFirebaseExpense = await createFirebaseExpense(firebaseExpenseData, expenseData.paidBy.id);
      const newExpense = convertFirebaseExpenseToExpense(newFirebaseExpense);
      
      set(state => ({ 
        expenses: [...state.expenses, newExpense], 
        loading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateExpense: async (expenseId, updates) => {
    set({ loading: true, error: null });
    try {
      const firebaseUpdates: Partial<FirebaseExpense> = {};
      
      if (updates.description) firebaseUpdates.description = updates.description;
      if (updates.amount) firebaseUpdates.amount = updates.amount;
      if (updates.paidBy) firebaseUpdates.paidBy = updates.paidBy.id;
      if (updates.splitAmong) firebaseUpdates.splitBetween = updates.splitAmong.map(member => member.id);
      if (updates.category) firebaseUpdates.category = updates.category;
      
      const { currentGroupId } = get();
      if (currentGroupId) {
        await updateFirebaseExpense(currentGroupId, expenseId, firebaseUpdates);
      }
      
      set(state => ({
        expenses: state.expenses.map(expense => 
          expense.id === expenseId ? { ...expense, ...updates } : expense
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteExpense: async (expenseId: string) => {
    set({ loading: true, error: null });
    try {
      const { currentGroupId } = get();
      if (currentGroupId) {
        await deleteFirebaseExpense(currentGroupId, expenseId);
      }
      set(state => ({
        expenses: state.expenses.filter(expense => expense.id !== expenseId),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  subscribeToGroups: (userId: string) => {
    let unsubscribe: () => void;
    set({ loading: true, error: null });
    try {
      unsubscribe = subscribeToUserGroups(userId, (firebaseGroups) => {
        const groups = firebaseGroups.map(group => convertFirebaseGroupToGroup(group));
        set({ groups, loading: false });
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      unsubscribe = () => {};
    }
    return unsubscribe;
  },

  subscribeToExpenses: (groupId: string) => {
    let unsubscribe: () => void;
    set({ loading: true, error: null });
    try {
      unsubscribe = subscribeToGroupExpenses(groupId, (firebaseExpenses) => {
        const expenses = firebaseExpenses.map(expense => convertFirebaseExpenseToExpense(expense));
        set({ expenses, loading: false });
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      unsubscribe = () => {};
    }
    return unsubscribe;
  },

  clearError: () => set({ error: null }),
  resetStore: () => set({
    groups: [],
    expenses: [],
    currentGroupId: null,
    loading: false,
    error: null,
  }),
}));
