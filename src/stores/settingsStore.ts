// stores/settingsStore.ts
import { create } from 'zustand';
import { fetchGroupById } from '@/services/firebaseService'; // adjust path as needed

interface SettingsState {
  currency: string;
  setCurrency: (currency: string) => void;
  loadCurrencyFromGroupId: (groupId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',

  setCurrency: (currency) => set({ currency }),

  loadCurrencyFromGroupId: async (groupId) => {
    try {
      const group = await fetchGroupById(groupId);
      const currency = group?.settings?.currency || 'USD';
      set({ currency });
    } catch (error) {
      console.error('Failed to load currency from group:', error);
    }
  },
}));
