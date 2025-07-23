
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
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addGroup: (group: Omit<Group, 'id'>) => void;
  addSettlement: (settlement: Omit<Settlement, 'id' | 'status'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getTotalExpenses: () => number;
  getBalances: () => Balance[];
  getGroupExpenses: (groupId: string) => Expense[];
  getSettlementHistory: () => Settlement[];
  simplifyDebts: () => void;
}

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => ({
      expenses: [],
      groups: [],
      settlements: [],
      
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

      addSettlement: (settlement) => {
        const newSettlement: Settlement = {
          ...settlement,
          id: crypto.randomUUID(),
          status: 'confirmed',
        };
        set((state) => ({
          settlements: [...state.settlements, newSettlement],
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

      getSettlementHistory: () => {
        const { settlements } = get();
        return settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      simplifyDebts: () => {
        // Implementation for debt simplification algorithm
        // This would reduce circular debts (A owes B, B owes C, simplify to A → C)
        console.log('Debt simplification would be implemented here');
      },
    }),
    {
      name: 'expense-store',
    }
  )
);
