import { create } from 'zustand';
import { 
  createPersonalBudget, 
  updatePersonalBudget, 
  deletePersonalBudget, 
  subscribeToUserPersonalBudgets 
} from '@/services/firebaseService';

export type BudgetType = 'individual' | 'group_category' | 'group_overall' | 'user_group';

export interface Budget {
  id: string;
  name: string;
  type: BudgetType;
  category?: string; // for group_category budgets
  groupId?: string; // for group_category, group_overall, user_group budgets
  userId?: string; // for user_group budgets
  limit: number;
  period: 'monthly' | 'weekly' | 'yearly';
  alertThreshold: number; // percentage (e.g., 80 for 80%)
  isActive: boolean;
  createdAt: Date;
}

export interface BudgetUsage {
  budgetId: string;
  spent: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
}

interface BudgetState {
  budgets: Budget[];
  isLoading: boolean;
  unsubscribe: (() => void) | null;
  
  // Firebase sync methods
  initializeFirebaseSync: (userId: string) => void;
  cleanup: () => void;
  
  // CRUD operations
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
  // Query methods
  getBudgetUsage: (expenses: any[], userId?: string, groupId?: string) => BudgetUsage[];
  getActiveBudgets: (type?: BudgetType, groupId?: string, userId?: string) => Budget[];
  getIndividualBudgets: (userId?: string) => Budget[];
  getGroupCategoryBudgets: (groupId: string) => Budget[];
  getGroupOverallBudgets: (groupId: string) => Budget[];
  getUserGroupBudgets: (groupId: string, userId?: string) => Budget[];
  getAllGroupBudgets: (groupId: string) => Budget[];
}

export const useBudgetStore = create<BudgetState>()((set, get) => ({
  budgets: [],
  isLoading: false,
  unsubscribe: null,

  initializeFirebaseSync: (userId: string) => {
    // Clean up any existing subscription
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    set({ isLoading: true });

    const unsubscribe = subscribeToUserPersonalBudgets(userId, (budgets) => {
      set({ budgets, isLoading: false });
    });

    set({ unsubscribe });
  },

  cleanup: () => {
    const unsubscribe = get().unsubscribe;
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null, budgets: [] });
    }
  },

  addBudget: async (budget) => {
    try {
      set({ isLoading: true });
      await createPersonalBudget(budget);
      // The real-time listener will update the state
    } catch (error) {
      console.error('Error adding budget:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateBudget: async (id, updates) => {
    try {
      set({ isLoading: true });
      await updatePersonalBudget(id, updates);
      // The real-time listener will update the state
    } catch (error) {
      console.error('Error updating budget:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteBudget: async (id) => {
    try {
      set({ isLoading: true });
      await deletePersonalBudget(id);
      // The real-time listener will update the state
    } catch (error) {
      console.error('Error deleting budget:', error);
      set({ isLoading: false });
      throw error;
    }
  },

      getActiveBudgets: (type?: BudgetType, groupId?: string, userId?: string) => {
        return get().budgets.filter(budget => {
          if (!budget.isActive) return false;
          if (type && budget.type !== type) return false;
          if (groupId && budget.groupId !== groupId) return false;
          if (userId && budget.userId !== userId) return false;
          return true;
        });
      },

      getIndividualBudgets: (userId?: string) => {
        return get().budgets.filter(budget => 
          budget.type === 'individual' && (!userId || budget.userId === userId)
        );
      },

      getGroupCategoryBudgets: (groupId: string) => {
        return get().budgets.filter(budget => 
          budget.type === 'group_category' && budget.groupId === groupId
        );
      },

      getGroupOverallBudgets: (groupId: string) => {
        return get().budgets.filter(budget => 
          budget.type === 'group_overall' && budget.groupId === groupId
        );
      },

      getUserGroupBudgets: (groupId: string, userId?: string) => {
        return get().budgets.filter(budget => 
          budget.type === 'user_group' && 
          budget.groupId === groupId && 
          (!userId || budget.userId === userId)
        );
      },

      getAllGroupBudgets: (groupId: string) => {
        return get().budgets.filter(budget => budget.groupId === groupId);
      },

      getBudgetUsage: (expenses, userId?: string, groupId?: string) => {
        const allBudgets = get().budgets.filter(budget => budget.isActive);
        const currentDate = new Date();
        
        return allBudgets.map((budget) => {
          // Calculate period start date
          let periodStart: Date;
          switch (budget.period) {
            case 'weekly':
              periodStart = new Date(currentDate);
              periodStart.setDate(currentDate.getDate() - 7);
              break;
            case 'monthly':
              periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              break;
            case 'yearly':
              periodStart = new Date(currentDate.getFullYear(), 0, 1);
              break;
          }

          // Filter expenses based on budget type
          const periodExpenses = expenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            const isInPeriod = expenseDate >= periodStart && expenseDate <= currentDate;
            
            switch (budget.type) {
              case 'individual':
                // For individual budgets, include both personal expenses and group expenses where user paid
                return isInPeriod && (
                  // Personal expenses (no groupId and userId matches)
                  (!expense.groupId && expense.userId === userId) ||
                  // Group expenses where user paid but we want to track against personal budget
                  (expense.groupId && expense.paidBy && 
                   (typeof expense.paidBy === 'string' ? expense.paidBy === userId : expense.paidBy.id === userId))
                );
              case 'group_category':
                return isInPeriod && expense.groupId === budget.groupId && 
                       expense.category === budget.category;
              case 'group_overall':
                return isInPeriod && expense.groupId === budget.groupId;
              case 'user_group':
                return isInPeriod && expense.groupId === budget.groupId && 
                       (expense.paidBy && 
                        (typeof expense.paidBy === 'string' ? expense.paidBy === budget.userId : expense.paidBy.id === budget.userId));
              default:
                return false;
            }
          });

          // Calculate spent amount
          const spent = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
          const percentage = (spent / budget.limit) * 100;
          const isOverBudget = spent > budget.limit;
          const isNearLimit = percentage >= budget.alertThreshold;

          return {
            budgetId: budget.id,
            spent,
            percentage,
            isOverBudget,
            isNearLimit,
          };
        });
      },
}));