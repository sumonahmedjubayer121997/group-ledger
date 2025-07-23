
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
import { 
  FirebaseGroup, 
  FirebaseExpense, 
  Group as StoreGroup, 
  Expense as StoreExpense, 
  Member, 
  GroupSettings,
  Balance,
  Settlement,
  RecurringExpense
} from '@/types';

interface ExpenseStore {
  // State
  groups: StoreGroup[];
  expenses: StoreExpense[];
  currentGroupId: string | null;
  selectedGroup: StoreGroup | null;
  settlements: Settlement[];
  recurringExpenses: RecurringExpense[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentGroup: (groupId: string | null) => void;
  setSelectedGroup: (group: StoreGroup | null) => void;
  fetchGroups: (userId: string) => Promise<void>;
  createGroup: (groupData: Omit<StoreGroup, 'id' | 'createdAt' | 'createdBy'>, userId: string) => Promise<void>;
  addGroup: (groupData: Omit<StoreGroup, 'id' | 'createdAt' | 'createdBy'>, userId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: Partial<StoreGroup>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  archiveGroup: (groupId: string) => Promise<void>;
  addMemberToGroup: (groupId: string, member: Member, addedBy: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
  updateMemberRole: (groupId: string, memberId: string, role: Member['role']) => Promise<void>;
  
  fetchExpenses: (groupId: string) => Promise<void>;
  createExpense: (expenseData: Omit<StoreExpense, 'id'>, userId: string) => Promise<void>;
  addExpense: (expenseData: Omit<StoreExpense, 'id'>, userId: string) => Promise<void>;
  updateExpense: (expenseId: string, updates: Partial<StoreExpense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  getGroupExpenses: (groupId: string) => StoreExpense[];
  getBalances: (groupId?: string) => Balance[];
  calculateBalances: (groupId?: string) => Balance[];
  addSettlement: (settlement: Omit<Settlement, 'id'>) => void;
  simplifyDebts: () => void;
  
  addRecurringExpense: (recurringExpense: Omit<RecurringExpense, 'id'>) => void;
  getGroupActivities: (groupId: string) => any[];
  getGroupAnalytics: (groupId: string) => any;
  
  subscribeToGroups: (userId: string) => () => void;
  subscribeToExpenses: (groupId: string) => () => void;
  initializeFirebaseSync: (userId: string) => () => void;
  cleanup: () => void;
  
  clearError: () => void;
  resetStore: () => void;
}

// Helper functions to convert between Firebase and Store types
const convertFirebaseGroupToGroup = (firebaseGroup: FirebaseGroup, memberData: Record<string, Member> = {}): StoreGroup => {
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
    settings: {
      currency: firebaseGroup.settings?.currency || 'USD',
      simplifyDebts: firebaseGroup.settings?.simplifyDebts ?? true,
      notifications: firebaseGroup.settings?.notifications ?? true,
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

const convertGroupToFirebaseGroup = (group: StoreGroup): Omit<FirebaseGroup, 'id' | 'createdAt'> => {
  return {
    name: group.name,
    description: group.description,
    members: group.members.map(member => member.id),
    createdBy: group.createdBy,
    settings: {
      currency: group.settings.currency,
      simplifyDebts: group.settings.simplifyDebts,
      notifications: group.settings.notifications,
    },
  };
};

const convertFirebaseExpenseToExpense = (firebaseExpense: FirebaseExpense, memberData: Record<string, Member> = {}): StoreExpense => {
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

const convertExpenseToFirebaseExpense = (expense: Omit<StoreExpense, 'id'>): Omit<FirebaseExpense, 'id' | 'createdAt'> => {
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
  selectedGroup: null,
  settlements: [],
  recurringExpenses: [],
  loading: false,
  error: null,

  // Actions
  setCurrentGroup: (groupId) => set({ currentGroupId: groupId }),
  setSelectedGroup: (group) => set({ selectedGroup: group }),

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
        settings: {
          currency: groupData.settings.currency,
          simplifyDebts: groupData.settings.simplifyDebts,
          notifications: groupData.settings.notifications,
        },
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

  addGroup: async (groupData, userId) => {
    return get().createGroup(groupData, userId);
  },

  updateGroup: async (groupId, updates) => {
    set({ loading: true, error: null });
    try {
      const firebaseUpdates: Partial<FirebaseGroup> = {};
      
      if (updates.name) firebaseUpdates.name = updates.name;
      if (updates.description) firebaseUpdates.description = updates.description;
      if (updates.members) firebaseUpdates.members = updates.members.map(member => member.id);
      if (updates.settings) {
        firebaseUpdates.settings = {
          currency: updates.settings.currency,
          simplifyDebts: updates.settings.simplifyDebts,
          notifications: updates.settings.notifications,
        };
      }
      
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

  archiveGroup: async (groupId: string) => {
    await get().updateGroup(groupId, { isArchived: true });
  },

  addMemberToGroup: async (groupId: string, member: Member, addedBy: string) => {
    set({ loading: true, error: null });
    try {
      await addMemberToGroup(groupId, member, addedBy);
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

  removeMemberFromGroup: async (groupId: string, memberId: string) => {
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

  updateMemberRole: async (groupId: string, memberId: string, role: Member['role']) => {
    set(state => ({
      groups: state.groups.map(group => 
        group.id === groupId 
          ? {
              ...group,
              members: group.members.map(member =>
                member.id === memberId ? { ...member, role } : member
              )
            }
          : group
      )
    }));
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

  createExpense: async (expenseData, userId: string) => {
    set({ loading: true, error: null });
    try {
      const firebaseExpenseData = convertExpenseToFirebaseExpense(expenseData);
      const newFirebaseExpense = await createFirebaseExpense(firebaseExpenseData, userId);
      const newExpense = convertFirebaseExpenseToExpense(newFirebaseExpense);
      
      set(state => ({ 
        expenses: [...state.expenses, newExpense], 
        loading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addExpense: async (expenseData, userId: string) => {
    return get().createExpense(expenseData, userId);
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

  getGroupExpenses: (groupId: string) => {
    const { expenses } = get();
    return expenses.filter(expense => expense.groupId === groupId);
  },

  getBalances: (groupId?: string) => {
    return get().calculateBalances(groupId);
  },

  calculateBalances: (groupId?: string) => {
    const { expenses, currentGroupId } = get();
    const targetGroupId = groupId || currentGroupId;
    if (!targetGroupId) return [];

    const groupExpenses = expenses.filter(expense => expense.groupId === targetGroupId);
    const balances: Record<string, Record<string, number>> = {};

    groupExpenses.forEach(expense => {
      const paidById = expense.paidBy.id;
      const splitAmount = expense.amount / expense.splitAmong.length;

      expense.splitAmong.forEach(member => {
        if (member.id !== paidById) {
          if (!balances[member.id]) balances[member.id] = {};
          if (!balances[member.id][paidById]) balances[member.id][paidById] = 0;
          balances[member.id][paidById] += splitAmount;
        }
      });
    });

    const result: Balance[] = [];
    const { groups } = get();
    const group = groups.find(g => g.id === targetGroupId);
    if (!group) return [];

    Object.entries(balances).forEach(([fromId, debts]) => {
      Object.entries(debts).forEach(([toId, amount]) => {
        const fromMember = group.members.find(m => m.id === fromId);
        const toMember = group.members.find(m => m.id === toId);
        if (fromMember && toMember && amount > 0) {
          result.push({
            from: fromMember,
            to: toMember,
            amount
          });
        }
      });
    });

    return result;
  },

  addSettlement: (settlement: Omit<Settlement, 'id'>) => {
    const newSettlement: Settlement = {
      id: crypto.randomUUID(),
      ...settlement
    };
    set(state => ({
      settlements: [...state.settlements, newSettlement]
    }));
  },

  simplifyDebts: () => {
    // Implementation for debt simplification algorithm
    console.log('Simplifying debts...');
  },

  addRecurringExpense: (recurringExpense: Omit<RecurringExpense, 'id'>) => {
    const newRecurringExpense: RecurringExpense = {
      id: crypto.randomUUID(),
      ...recurringExpense
    };
    set(state => ({
      recurringExpenses: [...state.recurringExpenses, newRecurringExpense]
    }));
  },

  getGroupActivities: (groupId: string) => {
    const { expenses } = get();
    return expenses.filter(expense => expense.groupId === groupId);
  },

  getGroupAnalytics: (groupId: string) => {
    const { expenses } = get();
    const groupExpenses = expenses.filter(expense => expense.groupId === groupId);
    return {
      totalExpenses: groupExpenses.length,
      totalAmount: groupExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      categories: groupExpenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>)
    };
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

  initializeFirebaseSync: (userId: string) => {
    const unsubscribeGroups = get().subscribeToGroups(userId);
    return () => {
      unsubscribeGroups();
    };
  },

  cleanup: () => {
    set({
      groups: [],
      expenses: [],
      currentGroupId: null,
      selectedGroup: null,
      settlements: [],
      recurringExpenses: [],
      loading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
  resetStore: () => {
    get().cleanup();
  },
}));

// Export types for use in components
export type { StoreGroup as Group, StoreExpense as Expense, Member, Balance, Settlement, RecurringExpense, GroupSettings };
