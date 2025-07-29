import { useState, useMemo } from 'react';
import { Expense, Group, Member } from '@/stores/expenseStore';
import { PersonalExpense } from '@/stores/personalExpenseStore';

export interface SearchFilters {
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  categories: string[];
  paidBy: string[];
  groups: string[];
  splitAmong: string[];
}

export interface SearchResults {
  expenses: Expense[];
  personalExpenses: PersonalExpense[];
  groups: Group[];
  members: Member[];
}

export const useSearch = (
  expenses: Expense[],
  personalExpenses: PersonalExpense[],
  groups: Group[],
  allMembers: Member[]
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: { from: null, to: null },
    amountRange: { min: null, max: null },
    categories: [],
    paidBy: [],
    groups: [],
    splitAmong: [],
  });

  const searchResults = useMemo((): SearchResults => {
    const query = searchQuery.toLowerCase().trim();
    
    // Filter expenses
    let filteredExpenses = expenses.filter((expense) => {
      // Text search
      const matchesQuery = !query || (
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query) ||
        expense.paidBy.name.toLowerCase().includes(query) ||
        expense.splitAmong.some(member => member.name.toLowerCase().includes(query))
      );

      // Date range filter
      const matchesDateRange = (!filters.dateRange.from || new Date(expense.date) >= filters.dateRange.from) &&
        (!filters.dateRange.to || new Date(expense.date) <= filters.dateRange.to);

      // Amount range filter
      const matchesAmountRange = (!filters.amountRange.min || expense.amount >= filters.amountRange.min) &&
        (!filters.amountRange.max || expense.amount <= filters.amountRange.max);

      // Category filter
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(expense.category);

      // Paid by filter
      const matchesPaidBy = filters.paidBy.length === 0 || filters.paidBy.includes(expense.paidBy.id);

      // Group filter
      const matchesGroup = filters.groups.length === 0 || filters.groups.includes(expense.groupId);

      // Split among filter
      const matchesSplitAmong = filters.splitAmong.length === 0 || 
        expense.splitAmong.some(member => filters.splitAmong.includes(member.id));

      return matchesQuery && matchesDateRange && matchesAmountRange && 
              matchesCategory && matchesPaidBy && matchesGroup && matchesSplitAmong;
    });

    // Filter personal expenses
    let filteredPersonalExpenses = personalExpenses.filter((expense) => {
      // Text search
      const matchesQuery = !query || (
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query) ||
        (expense.notes && expense.notes.toLowerCase().includes(query)) ||
        (expense.tags && expense.tags.some(tag => tag.toLowerCase().includes(query)))
      );

      // Date range filter
      const matchesDateRange = (!filters.dateRange.from || new Date(expense.date) >= filters.dateRange.from) &&
        (!filters.dateRange.to || new Date(expense.date) <= filters.dateRange.to);

      // Amount range filter
      const matchesAmountRange = (!filters.amountRange.min || expense.amount >= filters.amountRange.min) &&
        (!filters.amountRange.max || expense.amount <= filters.amountRange.max);

      // Category filter
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(expense.category);

      return matchesQuery && matchesDateRange && matchesAmountRange && matchesCategory;
    });

    // Filter groups
    let filteredGroups = groups.filter((group) => {
      const matchesQuery = !query || (
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query) ||
        group.members.some(member => member.name.toLowerCase().includes(query))
      );

      const matchesGroupFilter = filters.groups.length === 0 || filters.groups.includes(group.id);

      return matchesQuery && matchesGroupFilter;
    });

    // Filter members
    let filteredMembers = allMembers.filter((member) => {
      const matchesQuery = !query || (
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );

      const matchesMemberFilter = (
        filters.paidBy.length === 0 || filters.paidBy.includes(member.id)
      ) && (
        filters.splitAmong.length === 0 || filters.splitAmong.includes(member.id)
      );

      return matchesQuery && matchesMemberFilter;
    });

    return {
      expenses: filteredExpenses,
      personalExpenses: filteredPersonalExpenses,
      groups: filteredGroups,
      members: filteredMembers,
    };
  }, [searchQuery, filters, expenses, personalExpenses, groups, allMembers]);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      dateRange: { from: null, to: null },
      amountRange: { min: null, max: null },
      categories: [],
      paidBy: [],
      groups: [],
      splitAmong: [],
    });
    setSearchQuery('');
  };

  const hasActiveFilters = useMemo(() => {
    return searchQuery.length > 0 ||
      filters.dateRange.from !== null ||
      filters.dateRange.to !== null ||
      filters.amountRange.min !== null ||
      filters.amountRange.max !== null ||
      filters.categories.length > 0 ||
      filters.paidBy.length > 0 ||
      filters.groups.length > 0 ||
      filters.splitAmong.length > 0;
  }, [searchQuery, filters]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    updateFilters,
    clearFilters,
    searchResults,
    hasActiveFilters,
  };
};