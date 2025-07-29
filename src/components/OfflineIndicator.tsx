import { useEffect } from 'react';
import { Wifi, WifiOff, Loader2, Clock } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineStore } from '@/stores/offlineStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();
  const { setOnlineStatus, syncPendingActions, getQueueCount, isSyncing } = useOfflineStore();

  useEffect(() => {
    setOnlineStatus(isOnline);
  }, [isOnline, setOnlineStatus]);

  const queueCount = getQueueCount();

  const handleManualSync = async () => {
    if (isOnline && queueCount > 0) {
      toast.info('Syncing offline changes...');
      await syncPendingActions();
      toast.success('Sync completed!');
    }
  };

  if (isOnline && queueCount === 0) {
    return null; // Don't show anything when online and no pending actions
  }

  return (
    <div className="fixed top-20 right-4 z-50 flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          Offline
        </Badge>
      )}
      
      {queueCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {queueCount} pending
        </Badge>
      )}
      
      {isOnline && queueCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>
      )}
    </div>
  );
};