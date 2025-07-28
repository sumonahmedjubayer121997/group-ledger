import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  createGroup as createGroupFirebase,
  updateGroup as updateGroupFirebase,
  createExpense as createExpenseFirebase,
  updateExpense as updateExpenseFirebase,
  deleteExpense as deleteExpenseFirebase,
  addMemberToGroup as addMemberToGroupFirebase,
  removeMemberFromGroup as removeMemberFromGroupFirebase,
} from '@/services/firebaseService';
import { Expense, Group, Member } from './expenseStore';

export interface OfflineAction {
  id: string;
  type: 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' | 'CREATE_GROUP' | 'UPDATE_GROUP' | 'ADD_MEMBER' | 'REMOVE_MEMBER';
  data: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

interface OfflineStore {
  isOnline: boolean;
  syncQueue: OfflineAction[];
  isSyncing: boolean;
  setOnlineStatus: (status: boolean) => void;
  addToQueue: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => void;
  removeFromQueue: (actionId: string) => void;
  syncPendingActions: () => Promise<void>;
  clearQueue: () => void;
  getQueueCount: () => number;
}

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      syncQueue: [],
      isSyncing: false,

      setOnlineStatus: (status: boolean) => {
        set({ isOnline: status });
        
        // Auto-sync when coming back online
        if (status && get().syncQueue.length > 0) {
          setTimeout(() => {
            get().syncPendingActions();
          }, 1000); // Delay to ensure connection is stable
        }
      },

      addToQueue: (action) => {
        const newAction: OfflineAction = {
          ...action,
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending'
        };

        set(state => ({
          syncQueue: [...state.syncQueue, newAction]
        }));
      },

      removeFromQueue: (actionId: string) => {
        set(state => ({
          syncQueue: state.syncQueue.filter(action => action.id !== actionId)
        }));
      },

      syncPendingActions: async () => {
        const { syncQueue, isOnline } = get();
        
        if (!isOnline || syncQueue.length === 0) {
          return;
        }

        set({ isSyncing: true });

        const pendingActions = syncQueue.filter(action => 
          action.status === 'pending' || action.status === 'failed'
        );

        for (const action of pendingActions) {
          try {
            // Update status to syncing
            set(state => ({
              syncQueue: state.syncQueue.map(a => 
                a.id === action.id ? { ...a, status: 'syncing' as const } : a
              )
            }));

            await executeAction(action);

            // Remove successfully synced action
            get().removeFromQueue(action.id);
          } catch (error) {
            console.error('Failed to sync action:', action, error);
            
            // Update status to failed and increment retry count
            set(state => ({
              syncQueue: state.syncQueue.map(a => 
                a.id === action.id 
                  ? { ...a, status: 'failed' as const, retryCount: a.retryCount + 1 }
                  : a
              )
            }));

            // Remove actions that have failed too many times
            if (action.retryCount >= 3) {
              get().removeFromQueue(action.id);
            }
          }
        }

        set({ isSyncing: false });
      },

      clearQueue: () => {
        set({ syncQueue: [] });
      },

      getQueueCount: () => {
        return get().syncQueue.filter(action => action.status === 'pending').length;
      }
    }),
    {
      name: 'offline-store',
      partialize: (state) => ({
        syncQueue: state.syncQueue
      })
    }
  )
);

async function executeAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'CREATE_EXPENSE':
      await createExpenseFirebase(action.data.expense, action.data.userId);
      break;
    
    case 'UPDATE_EXPENSE':
      await updateExpenseFirebase(action.data.id, action.data.updates, action.data.groupId);
      break;
    
    case 'DELETE_EXPENSE':
      await deleteExpenseFirebase(action.data.id, action.data.groupId);
      break;
    
    case 'CREATE_GROUP':
      await createGroupFirebase(action.data.group, action.data.userId);
      break;
    
    case 'UPDATE_GROUP':
      await updateGroupFirebase(action.data.id, action.data.updates);
      break;
    
    case 'ADD_MEMBER':
      await addMemberToGroupFirebase(action.data.groupId, action.data.member, action.data.userId);
      break;
    
    case 'REMOVE_MEMBER':
      await removeMemberFromGroupFirebase(action.data.groupId, action.data.memberId);
      break;
    
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}