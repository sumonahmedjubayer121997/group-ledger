
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';

export const useFirebaseSync = () => {
  const { user } = useAuth();
  const { initializeFirebaseSync, cleanup } = useExpenseStore();

  useEffect(() => {
    if (user) {
      console.log('Initializing Firebase sync for user:', user.uid);
      initializeFirebaseSync(user.uid);
    } else {
      console.log('User not authenticated, cleaning up Firebase sync');
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [user, initializeFirebaseSync, cleanup]);
};
