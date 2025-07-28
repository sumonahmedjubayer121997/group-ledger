import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PersonalExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  userId: string;
  notes?: string;
  tags?: string[];
}

interface PersonalExpenseState {
  personalExpenses: PersonalExpense[];
  
  // Actions
  addPersonalExpense: (expense: Omit<PersonalExpense, 'id'>) => void;
  updatePersonalExpense: (id: string, updates: Partial<PersonalExpense>) => void;
  deletePersonalExpense: (id: string) => void;
  getPersonalExpenses: (userId: string) => PersonalExpense[];
  getPersonalExpensesByCategory: (userId: string, category: string) => PersonalExpense[];
  getTotalPersonalSpending: (userId: string) => number;
  getPersonalSpendingByCategory: (userId: string) => Record<string, number>;
  getPersonalSpendingByPeriod: (userId: string, period: 'weekly' | 'monthly' | 'yearly') => number;
}

export const usePersonalExpenseStore = create<PersonalExpenseState>()(
  persist(
    (set, get) => ({
      personalExpenses: [],

      addPersonalExpense: (expense) => {
        const newExpense: PersonalExpense = {
          ...expense,
          id: Date.now().toString(),
        };
        set((state) => ({
          personalExpenses: [...state.personalExpenses, newExpense],
        }));
      },

      updatePersonalExpense: (id, updates) => {
        set((state) => ({
          personalExpenses: state.personalExpenses.map((expense) =>
            expense.id === id ? { ...expense, ...updates } : expense
          ),
        }));
      },

      deletePersonalExpense: (id) => {
        set((state) => ({
          personalExpenses: state.personalExpenses.filter((expense) => expense.id !== id),
        }));
      },

      getPersonalExpenses: (userId: string) => {
        return get().personalExpenses.filter(expense => expense.userId === userId);
      },

      getPersonalExpensesByCategory: (userId: string, category: string) => {
        return get().personalExpenses.filter(
          expense => expense.userId === userId && expense.category === category
        );
      },

      getTotalPersonalSpending: (userId: string) => {
        return get().personalExpenses
          .filter(expense => expense.userId === userId)
          .reduce((sum, expense) => sum + expense.amount, 0);
      },

      getPersonalSpendingByCategory: (userId: string) => {
        const userExpenses = get().personalExpenses.filter(expense => expense.userId === userId);
        return userExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        }, {} as Record<string, number>);
      },

      getPersonalSpendingByPeriod: (userId: string, period: 'weekly' | 'monthly' | 'yearly') => {
        const currentDate = new Date();
        let periodStart: Date;

        switch (period) {
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

        return get().personalExpenses
          .filter(expense => 
            expense.userId === userId && 
            new Date(expense.date) >= periodStart && 
            new Date(expense.date) <= currentDate
          )
          .reduce((sum, expense) => sum + expense.amount, 0);
      },
    }),
    {
      name: 'personal-expense-storage',
    }
  )
);