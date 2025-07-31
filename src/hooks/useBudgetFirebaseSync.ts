import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBudgetStore } from '@/stores/budgetStore';

export const useBudgetFirebaseSync = () => {
  const { user } = useAuth();
  const { initializeFirebaseSync, cleanup } = useBudgetStore();

  useEffect(() => {
    if (user) {
      console.log('Initializing Budget Firebase sync for user:', user.uid);
      initializeFirebaseSync(user.uid);
    } else {
      console.log('User not authenticated, cleaning up Budget Firebase sync');
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [user, initializeFirebaseSync, cleanup]);
};