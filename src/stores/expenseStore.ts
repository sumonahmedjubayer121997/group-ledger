
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
  updateMemberRole as updateMemberRoleFirebase,
  createSettlement as createSettlementFirebase,
  subscribeToGroupSettlements,
  deleteSettlement as deleteSettlementFirebase,
  logGroupActivity,
  type GroupActivityType,
} from '@/services/firebaseService';
import { notificationFirebaseService } from '@/services/notificationFirebaseService';
import { notifyExpenseAdded, notifyExpenseDeleted, notifyExpenseEdited, notifyPaymentRecorded, notifyPaymentRemoved } from './groupNotifications';
import { useOfflineStore } from '@/stores/offlineStore';

export interface Member {
  userId: string;
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role?: 'admin' | 'member' | 'viewer';
  joinedAt?: Date;
  /** Added by name or email and hasn't signed in to the group yet. */
  isTemporary?: boolean;
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
  /** Names that someone claimed when they joined: placeholder id -> the claimer's id. */
  aliases?: Record<string, string>;
  createdAt: Date;
  createdBy: string;
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
  /** When it was added (a Firestore timestamp; null until the server has it). */
  createdAt?: { toDate: () => Date } | Date | null;
  /** exact: amount per person. percentage: amount per person when splitVersion >= 2, else percent per person. */
  splitData?: { [memberId: string]: number };
  /** Percent per person, kept for display (splitVersion 2+). */
  splitPercentages?: { [memberId: string]: number };
  splitVersion?: number;
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
  /** Settlements per group, live from Firestore. The source of truth for balances. */
  groupSettlements: Record<string, Settlement[]>;
  activities: GroupActivity[];
  recurringExpenses: RecurringExpense[];
  selectedGroup: Group | null;
  loading: boolean;
  /** False until the first list of groups arrives after sign-in (pages show skeletons until then). */
  groupsLoaded: boolean;
  error: string | null;
  isInitialized: boolean;
  currentUserId: string | null;
  
  // Firebase integration methods
  initializeFirebaseSync: (userId: string) => Promise<void>;
  cleanup: () => void;
  
  // Updated methods for Firebase
  addExpense: (expense: Omit<Expense, 'id'>, userId: string) => Promise<void>;
  /** Resolves to the new group's id. */
  addGroup: (group: Omit<Group, 'id'>, userId: string) => Promise<string>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  addMemberToGroup: (groupId: string, member: Omit<Member, 'joinedAt' | 'role'>, userId: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
  updateMemberRole: (groupId: string, memberId: string, role: Member['role']) => Promise<void>;
  /** Records a payment and returns it (so it can be undone). */
  addSettlement: (settlement: Omit<Settlement, 'id' | 'status'>, groupId: string, userId: string) => Promise<Settlement>;
  /** undo: taken back right after recording it, so its notifications are withdrawn instead of sending more. */
  removeSettlement: (settlementId: string, opts?: { undo?: boolean }) => Promise<void>;
  addActivity: (activity: Omit<GroupActivity, 'id' | 'timestamp'>) => void;
  addRecurringExpense: (recurring: Omit<RecurringExpense, 'id'>) => void;
  processRecurringExpenses: () => void;
  /** quiet: no notifications or activity line (bulk changes record one summary with logBulkChange). */
  updateExpense: (id: string, expense: Partial<Expense>, opts?: { quiet?: boolean }) => Promise<void>;
  deleteExpense: (id: string, groupId: string, opts?: { quiet?: boolean }) => Promise<void>;
  logBulkChange: (groupId: string, type: 'expense_updated' | 'expense_deleted', description: string) => void;
  
  // Navigation methods
  setSelectedGroup: (group: Group | null) => void;
  
  // Keep existing methods unchanged
  getTotalExpenses: () => number;
  getGroupExpenses: (groupId: string) => Expense[];
  getGroupActivities: (groupId: string) => GroupActivity[];
  getGroupAnalytics: (groupId: string) => any;
  getSettlementHistory: () => Settlement[];
  archiveGroup: (groupId: string) => Promise<void>;
  unarchiveGroup: (groupId: string) => Promise<void>;
}

/**
 * A just-created group shows up locally a moment before the server has saved it. A listener started in
 * that moment is refused by the rules (they look the group up) and Firestore doesn't retry it, so the
 * group would show no expenses until a reload. Start again a few times, a second or two apart.
 */
function withRetry(start: (onError: (error: Error) => void) => () => void, attempts = 5): () => void {
  let stop: () => void = () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let left = attempts;
  let cancelled = false;
  const run = () => {
    stop = start(() => {
      if (cancelled || left-- <= 0) return;
      timer = setTimeout(run, 1500);
    });
  };
  run();
  return () => {
    cancelled = true;
    clearTimeout(timer);
    stop();
  };
}

/** Notifications sent for payments recorded in this session, so an Undo can take them back. */
const paymentNotices = new Map<string, { ids: string[]; groupId: string }>();

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => {
      let groupsUnsubscriber: (() => void) | null = null;
      const expenseUnsubscribers: Map<string, () => void> = new Map();
      const settlementUnsubscribers: Map<string, () => void> = new Map();

      /** Saves an entry to the group's activity log (shown in the Activity Feed). Never blocks the action. */
      const record = (groupId: string, type: GroupActivityType, description: string) => {
        const actorId = get().currentUserId ?? '';
        const actorName =
          get().groups.find(g => g.id === groupId)?.members.find(m => m.id === actorId)?.name ?? 'Someone';
        void logGroupActivity(groupId, { type, actorId, actorName, description }).catch(error =>
          console.error('Error logging activity:', error)
        );
      };
      
      return {
        expenses: [],
        groups: [],
        settlements: [],
        groupSettlements: {},
        activities: [],
        recurringExpenses: [],
        selectedGroup: null,
        loading: false,
        groupsLoaded: false,
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
            settlementUnsubscribers.forEach(unsubscribe => unsubscribe());
            settlementUnsubscribers.clear();
            
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
              set({ groups: initialGroups, groupsLoaded: true });
              
              // Then set up real-time subscription
              console.log('🔔 Setting up real-time subscription for user:', userId);
              groupsUnsubscriber = subscribeToUserGroups(userId, (groups) => {
                console.log('📡 Groups updated from Firebase subscription:', groups.length, 'groups');
                console.log('🎯 Updated groups data:', groups.map(g => ({ id: g.id, name: g.name, members: g.members.length })));
                set({ groups, loading: false, groupsLoaded: true });
                
                // Clean up old expense subscriptions for groups that no longer exist
                const currentGroupIds = new Set(groups.map(g => g.id));
                settlementUnsubscribers.forEach((unsubscribe, groupId) => {
                  if (!currentGroupIds.has(groupId)) {
                    unsubscribe();
                    settlementUnsubscribers.delete(groupId);
                  }
                });
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
                    const expensesUnsubscriber = withRetry((onError) =>
                      subscribeToGroupExpenses(group.id, (expenses) => {
                        set(state => ({
                          expenses: [
                            ...state.expenses.filter(e => e.groupId !== group.id),
                            ...expenses
                          ]
                        }));
                      }, onError)
                    );
                    expenseUnsubscribers.set(group.id, expensesUnsubscriber);
                  }
                  if (!settlementUnsubscribers.has(group.id)) {
                    const settlementsUnsubscriber = withRetry((onError) =>
                      subscribeToGroupSettlements(group.id, (settlements) => {
                        set(state => ({
                          groupSettlements: { ...state.groupSettlements, [group.id]: settlements },
                        }));
                      }, onError)
                    );
                    settlementUnsubscribers.set(group.id, settlementsUnsubscriber);
                  }
                });
              });
              
              set({ loading: false });
            } catch (error) {
              console.error('Error initializing Firebase sync:', error);
              set({ error: 'Failed to initialize Firebase sync', loading: false, groupsLoaded: true });
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
          settlementUnsubscribers.forEach(unsubscribe => unsubscribe());
          settlementUnsubscribers.clear();
          set({ isInitialized: false, currentUserId: null, groupSettlements: {}, groupsLoaded: false });
        },
        
        addExpense: async (expense, userId) => {
          const isOnline = useOfflineStore.getState().isOnline;
          
          if (!isOnline) {
            // Add to offline queue and local state
            const tempExpense: Expense = {
              ...expense,
              id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            set(state => ({
              expenses: [...state.expenses, tempExpense]
            }));
            
            useOfflineStore.getState().addToQueue({
              type: 'CREATE_EXPENSE',
              data: { expense, userId }
            });
            
            return;
          }

          try {
            set({ loading: true, error: null });
            console.log('Adding expense:', expense);
            const createdExpense = await createExpenseFirebase(expense, userId);
            console.log('Expense added successfully to Firebase');
            
            const group = get().groups.find(g => g.id === expense.groupId);
            if (group) await notifyExpenseAdded(group, userId, createdExpense);
            
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
    return newGroup.id;
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
            record(
              id,
              'group_updated',
              'isArchived' in updates
                ? updates.isArchived ? 'archived the group' : 'restored the group'
                : 'updated the group details'
            );
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
            
            record(groupId, 'member_added', `added ${member.name || member.email}`);
          } catch (error) {
            console.error('Error adding member to group:', error);
            set({ error: 'Failed to add member', loading: false });
            throw error;
            throw error;
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
              record(groupId, 'member_removed', `removed ${member.name}`);
            }
          } catch (error) {
            console.error('Error removing member from group:', error);
            set({ error: 'Failed to remove member', loading: false });
            throw error;
            throw error;
          }
        },

        logBulkChange: (groupId, type, description) => record(groupId, type, description),

        updateExpense: async (id, updatedExpense, opts) => {
          const isOnline = useOfflineStore.getState().isOnline;
          const expense = get().expenses.find(e => e.id === id);
          
          if (!isOnline && expense) {
            // Update local state and queue for sync
            set(state => ({
              expenses: state.expenses.map(e => 
                e.id === id ? { ...e, ...updatedExpense } : e
              )
            }));
            
            useOfflineStore.getState().addToQueue({
              type: 'UPDATE_EXPENSE',
              data: { id, updates: updatedExpense, groupId: expense.groupId }
            });
            
            return;
          }

          try {
            set({ loading: true, error: null });
            if (expense) {
              await updateExpenseFirebase(expense.groupId, id, updatedExpense);
              
              const group = get().groups.find(g => g.id === expense.groupId);
              const actorId = get().currentUserId;
              if (group && actorId && !opts?.quiet) await notifyExpenseEdited(group, actorId, expense, updatedExpense);
              
              set({ loading: false });
              // Firebase listener will update the state
              
              if (!opts?.quiet) record(expense.groupId, 'expense_updated', `edited "${updatedExpense.description ?? expense.description}"`);
            }
          } catch (error) {
            console.error('Error updating expense:', error);
            set({ error: 'Failed to update expense', loading: false });
            throw error;
          }
        },

        deleteExpense: async (id, groupId, opts) => {
          const isOnline = useOfflineStore.getState().isOnline;
          const expense = get().expenses.find(e => e.id === id);
          
          if (!isOnline) {
            // Remove from local state and queue for sync
            set(state => ({
              expenses: state.expenses.filter(e => e.id !== id)
            }));
            
            useOfflineStore.getState().addToQueue({
              type: 'DELETE_EXPENSE',
              data: { id, groupId }
            });
            
            return;
          }

          try {
            set({ loading: true, error: null });
            
            await deleteExpenseFirebase(groupId, id);
            
            if (expense) {
              const group = get().groups.find(g => g.id === expense.groupId);
              const actorId = get().currentUserId;
              if (group && actorId && !opts?.quiet) await notifyExpenseDeleted(group, actorId, expense);
              
              if (!opts?.quiet) record(groupId, 'expense_deleted', `deleted "${expense.description}"`);
            }
          } catch (error) {
            console.error('Error deleting expense:', error);
            set({ error: 'Failed to delete expense', loading: false });
            throw error;
          }
        },

        setSelectedGroup: (group) => {
          set({ selectedGroup: group });
        },
        
        updateMemberRole: async (groupId, memberId, role) => {
          await updateMemberRoleFirebase(groupId, memberId, role ?? 'member');
          const member = get().groups.find(g => g.id === groupId)?.members.find(m => m.id === memberId);
          if (member) record(groupId, 'group_updated', `made ${member.name} ${role === 'admin' ? 'an admin' : role === 'viewer' ? 'a viewer' : 'a member'}`);
          // The groups listener brings the saved change; update locally too so the UI responds at once.
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

        removeSettlement: async (settlementId, opts) => {
          const sent = paymentNotices.get(settlementId);
          let groupId = sent?.groupId;
          let settlement = get().settlements.find((s) => s.id === settlementId);
          for (const [id, list] of Object.entries(get().groupSettlements)) {
            const found = list?.find((s) => s.id === settlementId);
            if (found) [groupId, settlement] = [id, found];
          }
          await deleteSettlementFirebase(settlementId);
          set((state) => ({ settlements: state.settlements.filter((s) => s.id !== settlementId) }));

          paymentNotices.delete(settlementId);
          if (opts?.undo && sent) {
            await notificationFirebaseService.deleteNotifications(sent.ids);
            return;
          }
          const group = get().groups.find((g) => g.id === groupId);
          const actorId = get().currentUserId;
          if (group && actorId && settlement) await notifyPaymentRemoved(group, actorId, settlement);
        },

        addSettlement: async (settlement, groupId, userId) => {
          try {
            set({ loading: true, error: null });
            console.log('Adding settlement:', settlement);
            const settlementWithStatus = { ...settlement, status: 'confirmed' as const };
            const createdSettlement = await createSettlementFirebase(settlementWithStatus, groupId, userId);
            console.log('Settlement added successfully to Firebase');
            
            // Add to local state
            set((state) => ({
              settlements: [...state.settlements, createdSettlement],
              loading: false
            }));

            const group = get().groups.find((g) => g.id === groupId);
            if (group) {
              const ids = await notifyPaymentRecorded(group, userId, createdSettlement);
              paymentNotices.set(createdSettlement.id, { ids, groupId });
            }
            
            return createdSettlement;
          } catch (error) {
            console.error('Error adding settlement:', error);
            set({ error: 'Failed to add settlement', loading: false });
            throw error;
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
         // const memberName= 
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
