import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  userId: string;
  createdAt: Date;
  isDefault: boolean;
}

interface CategoryStore {
  categories: CustomCategory[];
  defaultCategories: string[];
  addCategory: (category: Omit<CustomCategory, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, updates: Partial<CustomCategory>) => void;
  deleteCategory: (id: string) => void;
  getUserCategories: (userId: string) => CustomCategory[];
  getAllAvailableCategories: (userId: string) => string[];
  initializeDefaultCategories: (userId: string) => void;
}

const defaultCategoryList = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills & Utilities',
  'Travel',
  'Health & Fitness',
  'Education',
  'Groceries',
  'Gas',
  'Other',
];

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: [],
      defaultCategories: defaultCategoryList,

      addCategory: (categoryData) => {
        const newCategory: CustomCategory = {
          ...categoryData,
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
        };
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        }));
      },

      getUserCategories: (userId) => {
        return get().categories.filter((cat) => cat.userId === userId);
      },

      getAllAvailableCategories: (userId) => {
        const userCategories = get().getUserCategories(userId);
        const customCategoryNames = userCategories.map(cat => cat.name);
        return [...get().defaultCategories, ...customCategoryNames];
      },

      initializeDefaultCategories: (userId) => {
        const existingUserCategories = get().getUserCategories(userId);
        if (existingUserCategories.length === 0) {
          // Initialize with default categories as custom categories for this user
          const defaultAsCustom: CustomCategory[] = defaultCategoryList.map((name, index) => ({
            id: `default_${userId}_${index}`,
            name,
            userId,
            isDefault: true,
            createdAt: new Date(),
          }));
          
          set((state) => ({
            categories: [...state.categories, ...defaultAsCustom],
          }));
        }
      },
    }),
    {
      name: 'category-storage',
      partialize: (state) => ({ categories: state.categories }),
    }
  )
);