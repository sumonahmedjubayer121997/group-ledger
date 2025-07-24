
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  createGroup as createGroupFirebase,
  updateGroup as updateGroupFirebase,
  createExpense as createExpenseFirebase,
  updateExpense as updateExpenseFirebase,
  deleteExpense as deleteExpenseFirebase,
  subscribeToUserGroups,
  subscribeToGroupExpenses,
  getUserGroups,
  addMemberToGroup as addMemberToGroupFirebase,
  removeMemberFromGroup as removeMemberFromGroupFirebase,
} from '@/services/firebaseService';
import { notificationService } from '@/services/notificationService';

export interface Member {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role?: 'admin' | 'member' | 'viewer';
  joinedAt?: Date;
}

export interface GroupSettings {
  currency: string;
  simplifyDebts: boolean;
  notifications: boolean;
  recurringBills: boolean;
}

export interface GroupActivity {
  id: string;
  type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 'member_added' | 'member_removed' | 'settlement_made' | 'group_updated';
  userId: string;
  userName: string;
  description: string;
  timestamp: Date;
  metadata?: any;
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

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: Date;
  photo?: string;
  coverImage?: string;
  groupType: 'private' | 'public';
  inviteCode: string;
  settings: GroupSettings;
  tags?: string[];
  location?: string;
  isArchived: boolean;
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
  splitData?: { [memberId: string]: number };
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
  paymentMethod: string;
  notes?: string;
  referenceId?: string;
  date: Date;
  status: 'confirmed' | 'pending';
}

interface ExpenseStore {
  expenses: Expense[];
  groups: Group[];
  settlements: Settlement[];
  activities: GroupActivity[];
  recurringExpenses: RecurringExpense[];
  selectedGroup: Group | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  currentUserId: string | null;
  
  // Firebase integration methods
  initializeFirebaseSync: (userId: string) => Promise<void>;
  cleanup: () => void;
  
  // Updated methods for Firebase
  addExpense: (expense: Omit<Expense, 'id'>, userId: string) => Promise<void>;
  addGroup: (group: Omit<Group, 'id'>, userId: string) => Promise<void>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  addMemberToGroup: (groupId: string, member: Omit<Member, 'joinedAt' | 'role'>, userId: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
  updateMemberRole: (groupId: string, memberId: string, role: Member['role']) => void;
  addSettlement: (settlement: Omit<Settlement, 'id' | 'status'>) => void;
  addActivity: (activity: Omit<GroupActivity, 'id' | 'timestamp'>) => void;
  addRecurringExpense: (recurring: Omit<RecurringExpense, 'id'>) => void;
  processRecurringExpenses: () => void;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string, groupId: string) => Promise<void>;
  
  // Navigation methods
  setSelectedGroup: (group: Group | null) => void;
  
  // Keep existing methods unchanged
  getTotalExpenses: () => number;
  getBalances: () => Balance[];
  calculateBalances: () => Record<string, number>;
  getGroupExpenses: (groupId: string) => Expense[];
  getGroupActivities: (groupId: string) => GroupActivity[];
  getGroupAnalytics: (groupId: string) => any;
  getSettlementHistory: () => Settlement[];
  simplifyDebts: () => void;
  archiveGroup: (groupId: string) => Promise<void>;
  unarchiveGroup: (groupId: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => {
      let groupsUnsubscriber: (() => void) | null = null;
      let expenseUnsubscribers: Map<string, () => void> = new Map();
      
      return {
        expenses: [],
        groups: [],
        settlements: [],
        activities: [],
        recurringExpenses: [],
        selectedGroup: null,
        loading: false,
        error: null,
        isInitialized: false,
        currentUserId: null,
        
        initializeFirebaseSync: async (userId: string) => {
          const { currentUserId, isInitialized } = get();
          
          console.log('🔄 initializeFirebaseSync called with userId:', userId);
          console.log('📊 Current state - isInitialized:', isInitialized, 'currentUserId:', currentUserId);
          console.log('🔍 User details for debugging:', userId);
          
          // Force cleanup if switching users
          if (currentUserId && currentUserId !== userId) {
            console.log('🧹 Different user detected, cleaning up first...');
            get().cleanup();
          }
          
          // Always initialize if user changed or not initialized
          if (!isInitialized || currentUserId !== userId) {
            console.log('🚀 Initializing Firebase sync for user:', userId);
            console.log('Initializing Firebase sync for user:', userId);
            
            // Clean up existing subscriptions first
            if (groupsUnsubscriber) {
              console.log('Cleaning up existing group subscription');
              groupsUnsubscriber();
              groupsUnsubscriber = null;
            }
            expenseUnsubscribers.forEach(unsubscribe => unsubscribe());
            expenseUnsubscribers.clear();
            
            set({ 
              loading: true, 
              error: null, 
              currentUserId: userId,
              isInitialized: true
            });
            
            try {
              // First, try to get initial groups data
              console.log('📚 Fetching initial groups data for user:', userId);
              const initialGroups = await getUserGroups(userId);
              console.log('📚 Initial groups fetched:', initialGroups.length, 'groups');
              console.log('📋 Groups details:', initialGroups.map(g => ({ id: g.id, name: g.name, members: g.members.length })));
              
              // Set initial groups
              set({ groups: initialGroups });
              
              // Then set up real-time subscription
              console.log('🔔 Setting up real-time subscription for user:', userId);
              groupsUnsubscriber = subscribeToUserGroups(userId, (groups) => {
                console.log('📡 Groups updated from Firebase subscription:', groups.length, 'groups');
                console.log('🎯 Updated groups data:', groups.map(g => ({ id: g.id, name: g.name, members: g.members.length })));
                set({ groups, loading: false });
                
                // Clean up old expense subscriptions for groups that no longer exist
                const currentGroupIds = new Set(groups.map(g => g.id));
                expenseUnsubscribers.forEach((unsubscribe, groupId) => {
                  if (!currentGroupIds.has(groupId)) {
                    console.log('Cleaning up expense subscription for removed group:', groupId);
                    unsubscribe();
                    expenseUnsubscribers.delete(groupId);
                  }
                });
                
                // Subscribe to expenses for each group
                groups.forEach(group => {
                  // Only subscribe if we don't already have a subscription for this group
                  if (!expenseUnsubscribers.has(group.id)) {
                    console.log('Setting up expense subscription for group:', group.id);
                    const expensesUnsubscriber = subscribeToGroupExpenses(group.id, (expenses) => {
                      console.log('Expenses updated for group:', group.id, expenses.length, 'expenses');
                      set(state => ({
                        expenses: [
                          ...state.expenses.filter(e => e.groupId !== group.id),
                          ...expenses
                        ]
                      }));
                    });
                    expenseUnsubscribers.set(group.id, expensesUnsubscriber);
                  }
                });
              });
              
              set({ loading: false });
            } catch (error) {
              console.error('Error initializing Firebase sync:', error);
              set({ error: 'Failed to initialize Firebase sync', loading: false });
            }
          } else {
            console.log('Firebase sync already initialized for user:', userId);
          }
        },
        
        cleanup: () => {
          console.log('Cleaning up Firebase subscriptions');
          if (groupsUnsubscriber) {
            groupsUnsubscriber();
            groupsUnsubscriber = null;
          }
          expenseUnsubscribers.forEach(unsubscribe => unsubscribe());
          expenseUnsubscribers.clear();
          set({ isInitialized: false, currentUserId: null });
        },
        
        addExpense: async (expense, userId) => {
          try {
            set({ loading: true, error: null });
            console.log('Adding expense:', expense);
            await createExpenseFirebase(expense, userId);
            console.log('Expense added successfully to Firebase');
            
            // Add notification for new expense
            const groups = get().groups;
            const group = groups.find(g => g.id === expense.groupId);
            const currentUser = groups.flatMap(g => g.members).find(m => m.id === userId);
            
            if (group && currentUser) {
              notificationService.notifyExpenseAdded(
                expense.description,
                expense.amount,
                group.settings?.currency || '$',
                currentUser.name,
                group.name,
                group.id
              );
            }
            
            set({ loading: false });
            // Real-time listener will update the state
          } catch (error) {
            console.error('Error adding expense:', error);
            set({ error: 'Failed to add expense', loading: false });
            throw error;
          }
        },
        addGroup: async (group, userId) => {
  try {
    set({ loading: true, error: null });

    // ✅ Defensive check to ensure members is an array
    if (!Array.isArray(group.members)) {
      console.error('❌ group.members must be an array but got:', group.members);
      throw new Error('Invalid group data: "members" must be an array.');
    }

    // ✅ Prepare safe parallel maps for Firebase document
    const membersMap: Record<string, string> = {};
    const memberNames: Record<string, string> = {};
    const memberEmails: Record<string, string> = {};
    const joinedAt: Record<string, any> = {};

    group.members.forEach((member) => {
      const id = member.id?.trim() || crypto.randomUUID();
      const name = member.name?.trim() || 'Unnamed';
      const email = member.email?.trim() || 'unknown@example.com';
      const role = member.role || 'member';

      membersMap[id] = role;
      memberNames[id] = name;
      memberEmails[id] = email;
      joinedAt[id] = new Date(); // optionally use serverTimestamp() here
    });

    // ✅ Construct the Firestore-friendly group document
    const groupDoc = {
      name: group.name.trim(),
      description: group.description?.trim() || '',
      groupType: group.groupType || 'private',
      inviteCode: group.inviteCode || crypto.randomUUID(),
      createdAt: new Date(),
      createdBy: userId,
      isArchived: false,
      settings: {
        currency: 'USD',
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
        ...group.settings,
      },
      members: group.members, // Pass the original Members array
      memberNames,
      memberEmails,
      joinedAt,
    };

    // ✅ Call Firebase function to create group
    const newGroup = await createGroupFirebase(groupDoc, userId);
    console.log('✅ Group created:', newGroup);

    // Force refresh groups to ensure the newly created group appears
    console.log('🔄 Force refreshing groups after creation...');
    const updatedGroups = await getUserGroups(userId);
    console.log('🔄 Updated groups after creation:', updatedGroups.length, 'groups');
    set({ groups: updatedGroups, loading: false });

    // ✅ Record group creation activity
    get().addActivity({
      type: 'group_updated',
      userId,
      userName: group.members[0]?.name || 'Unknown',
      description: `Created group "${group.name}"`,
    });
  } catch (error) {
    console.error('❌ Failed to create group:', error);
    set({ error: 'Failed to create group', loading: false });
    throw error;
  }
}

       ,


        updateGroup: async (id, updates) => {
          try {
            set({ loading: true, error: null });
            await updateGroupFirebase(id, updates);
            set({ loading: false });
            // Firebase listener will update the state
          } catch (error) {
            console.error('Error updating group:', error);
            set({ error: 'Failed to update group', loading: false });
          }
        },

        addMemberToGroup: async (groupId, member, userId) => {
          try {
            set({ loading: true, error: null });
            await addMemberToGroupFirebase(groupId, member, userId);
            set({ loading: false });
            // Firebase listener will update the state
            
            get().addActivity({
              type: 'member_added',
              userId: member.id,
              userName: member.name,
              description: `${member.name} joined the group`,
            });
          } catch (error) {
            console.error('Error adding member to group:', error);
            set({ error: 'Failed to add member', loading: false });
          }
        },

        removeMemberFromGroup: async (groupId, memberId) => {
          try {
            set({ loading: true, error: null });
            const group = get().groups.find(g => g.id === groupId);
            const member = group?.members.find(m => m.id === memberId);
            
            await removeMemberFromGroupFirebase(groupId, memberId);
            set({ loading: false });
            // Firebase listener will update the state
            
            if (member) {
              get().addActivity({
                type: 'member_removed',
                userId: memberId,
                userName: member.name,
                description: `${member.name} was removed from the group`,
              });
            }
          } catch (error) {
            console.error('Error removing member from group:', error);
            set({ error: 'Failed to remove member', loading: false });
          }
        },

        updateExpense: async (id, updatedExpense) => {
          try {
            set({ loading: true, error: null });
            const expense = get().expenses.find(e => e.id === id);
            if (expense) {
              await updateExpenseFirebase(expense.groupId, id, updatedExpense);
              
              // Add notification for expense edit
              const groups = get().groups;
              const group = groups.find(g => g.id === expense.groupId);
              
              if (group) {
                notificationService.notifyExpenseEdited(
                  expense.description,
                  expense.paidBy.name,
                  group.name,
                  group.id
                );
              }
              
              set({ loading: false });
              // Firebase listener will update the state
              
              get().addActivity({
                type: 'expense_updated',
                userId: expense.paidBy.id,
                userName: expense.paidBy.name,
                description: `Updated expense "${expense.description}"`,
              });
            }
          } catch (error) {
            console.error('Error updating expense:', error);
            set({ error: 'Failed to update expense', loading: false });
          }
        },

        deleteExpense: async (id, groupId) => {
          try {
            set({ loading: true, error: null });
            const expense = get().expenses.find(e => e.id === id);
            
            await deleteExpenseFirebase(groupId, id);
            
            // Add notification for expense deletion
            if (expense) {
              const groups = get().groups;
              const group = groups.find(g => g.id === expense.groupId);
              
              if (group) {
                notificationService.notifyExpenseDeleted(
                  expense.description,
                  expense.paidBy.name,
                  group.name,
                  group.id
                );
              }
              
              get().addActivity({
                type: 'expense_deleted',
                userId: expense.paidBy.id,
                userName: expense.paidBy.name,
                description: `Deleted expense "${expense.description}"`,
              });
            }
          } catch (error) {
            console.error('Error deleting expense:', error);
            set({ error: 'Failed to delete expense', loading: false });
          }
        },

        setSelectedGroup: (group) => {
          set({ selectedGroup: group });
        },
        
        calculateBalances: () => {
          const { expenses, settlements } = get();
          const balanceMap = new Map<string, number>();
          
          // Calculate balances from expenses
          expenses.forEach((expense) => {
            const { paidBy, splitAmong, amount, splitType, splitData } = expense;
            const splitAmount = splitType === 'equal' ? amount / splitAmong.length : 0;
            
            splitAmong.forEach((member) => {
              if (member.id !== paidBy.id) {
                const owedAmount = splitType === 'equal' ? splitAmount : (splitData?.[member.id] || 0);
                balanceMap.set(member.id, (balanceMap.get(member.id) || 0) + owedAmount);
                balanceMap.set(paidBy.id, (balanceMap.get(paidBy.id) || 0) - owedAmount);
              }
            });
          });

          // Subtract settlements from balances
          settlements.forEach((settlement) => {
            if (settlement.status === 'confirmed') {
              const currentBalance = balanceMap.get(settlement.fromMemberId) || 0;
              balanceMap.set(settlement.fromMemberId, currentBalance - settlement.amount);
              const toBalance = balanceMap.get(settlement.toMemberId) || 0;
              balanceMap.set(settlement.toMemberId, toBalance + settlement.amount);
            }
          });
          
          return Object.fromEntries(balanceMap);
        },

        updateMemberRole: (groupId, memberId, role) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    members: group.members.map(member =>
                      member.id === memberId ? { ...member, role } : member
                    ),
                  }
                : group
            ),
          }));
        },

        addSettlement: (settlement) => {
          const newSettlement: Settlement = {
            ...settlement,
            id: crypto.randomUUID(),
            status: 'confirmed',
          };
          set((state) => ({
            settlements: [...state.settlements, newSettlement],
          }));
          
          const fromMember = get().groups.flatMap(g => g.members).find(m => m.id === settlement.fromMemberId);
          const toMember = get().groups.flatMap(g => g.members).find(m => m.id === settlement.toMemberId);
          
          if (fromMember && toMember) {
            get().addActivity({
              type: 'settlement_made',
              userId: fromMember.id,
              userName: fromMember.name,
              description: `${fromMember.name} paid ${toMember.name} $${settlement.amount.toFixed(2)}`,
            });
          }
        },

        addActivity: (activity) => {
          const newActivity: GroupActivity = {
            ...activity,
            id: crypto.randomUUID(),
            timestamp: new Date(),
          };
          set((state) => ({
            activities: [...state.activities, newActivity],
          }));
        },

        addRecurringExpense: (recurring) => {
          const newRecurring: RecurringExpense = {
            ...recurring,
            id: crypto.randomUUID(),
          };
          set((state) => ({
            recurringExpenses: [...state.recurringExpenses, newRecurring],
          }));
        },

        processRecurringExpenses: () => {
          const now = new Date();
          const { recurringExpenses } = get();
          
          recurringExpenses
            .filter(recurring => recurring.isActive && new Date(recurring.nextDue) <= now)
            .forEach(recurring => {
              // This would need to be updated to use Firebase too
              console.log('Processing recurring expense:', recurring.id);
            });
        },
        
        getTotalExpenses: () => {
          const { expenses } = get();
          return expenses.reduce((total, expense) => total + expense.amount, 0);
        },
        
        getBalances: () => {
          const { expenses, settlements } = get();
          const balanceMap = new Map<string, Map<string, number>>();
          
          // Calculate balances from expenses
          expenses.forEach((expense) => {
            const { paidBy, splitAmong, amount, splitType, splitData } = expense;
            const splitAmount = splitType === 'equal' ? amount / splitAmong.length : 0;
            
            splitAmong.forEach((member) => {
              if (member.id !== paidBy.id) {
                const owedAmount = splitType === 'equal' ? splitAmount : (splitData?.[member.id] || 0);
                
                if (!balanceMap.has(member.id)) {
                  balanceMap.set(member.id, new Map());
                }
                
                const memberBalances = balanceMap.get(member.id)!;
                const currentBalance = memberBalances.get(paidBy.id) || 0;
                memberBalances.set(paidBy.id, currentBalance + owedAmount);
              }
            });
          });

          // Subtract settlements from balances
          settlements.forEach((settlement) => {
            if (settlement.status === 'confirmed') {
              const debtorBalances = balanceMap.get(settlement.fromMemberId);
              if (debtorBalances) {
                const currentBalance = debtorBalances.get(settlement.toMemberId) || 0;
                const newBalance = currentBalance - settlement.amount;
                if (newBalance <= 0.01) {
                  debtorBalances.delete(settlement.toMemberId);
                } else {
                  debtorBalances.set(settlement.toMemberId, newBalance);
                }
              }
            }
          });
          
          const balances: Balance[] = [];
          const { groups } = get();
          const allMembers = groups.flatMap(group => group.members);
          
          balanceMap.forEach((owedAmounts, debtorId) => {
            const debtor = allMembers.find(m => m.id === debtorId);
            if (!debtor) return;
            
            owedAmounts.forEach((amount, creditorId) => {
              const creditor = allMembers.find(m => m.id === creditorId);
              if (!creditor || amount <= 0.01) return;
              
              balances.push({
                from: debtor,
                to: creditor,
                amount,
              });
            });
          });
          
          return balances;
        },
        
        getGroupExpenses: (groupId) => {
          const { expenses } = get();
          return expenses.filter((expense) => expense.groupId === groupId);
        },

        getGroupActivities: (groupId) => {
          const { activities } = get();
          return activities
            .filter(activity => {
              const group = get().groups.find(g => g.id === groupId);
              return group?.members.some(m => m.id === activity.userId);
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        },

        getGroupAnalytics: (groupId) => {
          const expenses = get().getGroupExpenses(groupId);
          const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
          
          const memberSpending = expenses.reduce((acc, expense) => {
            acc[expense.paidBy.id] = (acc[expense.paidBy.id] || 0) + expense.amount;
            return acc;
          }, {} as Record<string, number>);

          const categorySpending = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
          }, {} as Record<string, number>);

          return {
            totalSpent,
            memberSpending,
            categorySpending,
            expenseCount: expenses.length,
          };
        },

        getSettlementHistory: () => {
          const { settlements } = get();
          return settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },

        simplifyDebts: () => {
          console.log('Debt simplification would be implemented here');
        },

        archiveGroup: async (groupId) => {
          try {
            await updateGroupFirebase(groupId, { isArchived: true });
            // Firebase listener will update the state
          } catch (error) {
            console.error('Error archiving group:', error);
            throw error;
          }
        },

        unarchiveGroup: async (groupId) => {
          try {
            await updateGroupFirebase(groupId, { isArchived: false });
            // Firebase listener will update the state
          } catch (error) {
            console.error('Error unarchiving group:', error);
            throw error;
          }
        },
      };
    },
    {
      name: 'expense-store',
      partialize: (state) => ({
        // Don't persist Firebase-related state
        settlements: state.settlements,
        activities: state.activities,
        recurringExpenses: state.recurringExpenses,
      }),
    }
  )
);
