import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Budget {
  id: string;
  name: string;
  category?: string; // undefined means overall budget
  groupId?: string; // undefined means overall user budget
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
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  getBudgetUsage: (expenses: any[], groupId?: string) => BudgetUsage[];
  getActiveBudgets: (groupId?: string) => Budget[];
  getGroupBudgets: (groupId: string) => Budget[];
  getUserBudgets: () => Budget[];
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budgets: [],

      addBudget: (budget) => {
        const newBudget: Budget = {
          ...budget,
          id: Date.now().toString(),
          createdAt: new Date(),
        };
        set((state) => ({
          budgets: [...state.budgets, newBudget],
        }));
      },

      updateBudget: (id, updates) => {
        set((state) => ({
          budgets: state.budgets.map((budget) =>
            budget.id === id ? { ...budget, ...updates } : budget
          ),
        }));
      },

      deleteBudget: (id) => {
        set((state) => ({
          budgets: state.budgets.filter((budget) => budget.id !== id),
        }));
      },

      getActiveBudgets: (groupId?: string) => {
        return get().budgets.filter(budget => 
          budget.isActive && 
          (groupId ? budget.groupId === groupId : !budget.groupId)
        );
      },

      getGroupBudgets: (groupId: string) => {
        return get().budgets.filter(budget => budget.groupId === groupId);
      },

      getUserBudgets: () => {
        return get().budgets.filter(budget => !budget.groupId);
      },

      getBudgetUsage: (expenses, groupId?: string) => {
        const activeBudgets = get().getActiveBudgets(groupId);
        const currentDate = new Date();
        
        return activeBudgets.map((budget) => {
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

          // Filter expenses for the budget period and group
          const periodExpenses = expenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            const isInPeriod = expenseDate >= periodStart && expenseDate <= currentDate;
            const isInGroup = groupId ? expense.groupId === groupId : true;
            return isInPeriod && isInGroup;
          });

          // Calculate spent amount
          let spent = 0;
          if (budget.category) {
            // Category-specific budget
            spent = periodExpenses
              .filter((expense) => expense.category === budget.category)
              .reduce((sum, expense) => sum + expense.amount, 0);
          } else {
            // Overall budget
            spent = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
          }

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
    }),
    {
      name: 'budget-storage',
    }
  )
);