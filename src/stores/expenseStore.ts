
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: Date;
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

interface ExpenseStore {
  expenses: Expense[];
  groups: Group[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addGroup: (group: Omit<Group, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getTotalExpenses: () => number;
  getBalances: () => Balance[];
  getGroupExpenses: (groupId: string) => Expense[];
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => ({
      expenses: [],
      groups: [],
      
      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          expenses: [...state.expenses, newExpense],
        }));
      },
      
      addGroup: (group) => {
        const newGroup: Group = {
          ...group,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          groups: [...state.groups, newGroup],
        }));
      },
      
      updateExpense: (id, updatedExpense) => {
        set((state) => ({
          expenses: state.expenses.map((expense) =>
            expense.id === id ? { ...expense, ...updatedExpense } : expense
          ),
        }));
      },
      
      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        }));
      },
      
      getTotalExpenses: () => {
        const { expenses } = get();
        return expenses.reduce((total, expense) => total + expense.amount, 0);
      },
      
      getBalances: () => {
        const { expenses } = get();
        const balanceMap = new Map<string, Map<string, number>>();
        
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
        
        const balances: Balance[] = [];
        const { groups } = get();
        const allMembers = groups.flatMap(group => group.members);
        
        balanceMap.forEach((owedAmounts, debtorId) => {
          const debtor = allMembers.find(m => m.id === debtorId);
          if (!debtor) return;
          
          owedAmounts.forEach((amount, creditorId) => {
            const creditor = allMembers.find(m => m.id === creditorId);
            if (!creditor || amount <= 0) return;
            
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
    }),
    {
      name: 'expense-store',
    }
  )
);
