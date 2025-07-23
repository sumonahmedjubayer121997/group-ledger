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
  addMemberToGroup as addMemberToGroupFirebase,
  removeMemberFromGroup as removeMemberFromGroupFirebase,
} from '@/services/firebaseService';

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
  loading: boolean;
  error: string | null;
  
  // Firebase integration methods
  initializeFirebaseSync: (userId: string) => void;
  cleanup: () => void;
  
  // Updated methods for Firebase
  addExpense: (expense: Omit<Expense, 'id'>, userId: string) => Promise<void>;
  addGroup: (group: Omit<Group, 'id' | 'inviteCode' | 'settings' | 'isArchived'>, userId: string) => Promise<void>;
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
  
  // Keep existing methods unchanged
  getTotalExpenses: () => number;
  getBalances: () => Balance[];
  getGroupExpenses: (groupId: string) => Expense[];
  getGroupActivities: (groupId: string) => GroupActivity[];
  getGroupAnalytics: (groupId: string) => any;
  getSettlementHistory: () => Settlement[];
  simplifyDebts: () => void;
  archiveGroup: (groupId: string) => void;
  unarchiveGroup: (groupId: string) => void;
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => {
      let unsubscribers: (() => void)[] = [];
      
      return {
        expenses: [],
        groups: [],
        settlements: [],
        activities: [],
        recurringExpenses: [],
        loading: false,
        error: null,
        
        initializeFirebaseSync: (userId: string) => {
          console.log('Initializing Firebase sync for user:', userId);
          set({ loading: true, error: null });
          
          // Subscribe to user's groups
          const groupsUnsubscriber = subscribeToUserGroups(userId, (groups) => {
            console.log('Groups updated:', groups);
            set({ groups, loading: false });
            
            // Subscribe to expenses for each group
            groups.forEach(group => {
              const expensesUnsubscriber = subscribeToGroupExpenses(group.id, (expenses) => {
                console.log('Expenses updated for group:', group.id, expenses);
                set(state => ({
                  expenses: [
                    ...state.expenses.filter(e => e.groupId !== group.id),
                    ...expenses
                  ]
                }));
              });
              unsubscribers.push(expensesUnsubscriber);
            });
          });
          
          unsubscribers.push(groupsUnsubscriber);
        },
        
        cleanup: () => {
          unsubscribers.forEach(unsubscribe => unsubscribe());
          unsubscribers = [];
        },
        
        addExpense: async (expense, userId) => {
          try {
            set({ loading: true, error: null });
            await createExpenseFirebase(expense, userId);
            // Firebase listener will update the state
          } catch (error) {
            console.error('Error adding expense:', error);
            set({ error: 'Failed to add expense', loading: false });
          }
        },
        
        addGroup: async (group, userId) => {
          try {
            set({ loading: true, error: null });
            await createGroupFirebase(group, userId);
            // Firebase listener will update the state
            
            get().addActivity({
              type: 'group_updated',
              userId: userId,
              userName: group.members[0]?.name || 'Unknown',
              description: `Created group "${group.name}"`,
            });
          } catch (error) {
            console.error('Error adding group:', error);
            set({ error: 'Failed to create group', loading: false });
          }
        },

        updateGroup: async (id, updates) => {
          try {
            set({ loading: true, error: null });
            await updateGroupFirebase(id, updates);
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
            // Firebase listener will update the state
            
            if (expense) {
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

        archiveGroup: (groupId) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, isArchived: true } : group
            ),
          }));
        },

        unarchiveGroup: (groupId) => {
          set((state) => ({
            groups: state.groups.map((group) =>
              group.id === groupId ? { ...group, isArchived: false } : group
            ),
          }));
        },
      };
    },
    {
      name: 'expense-store',
    }
  )
);
