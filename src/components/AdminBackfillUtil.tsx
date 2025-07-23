import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpenseStore } from '@/stores/expenseStore';
import { useToast } from '@/hooks/use-toast';

export const AdminBackfillUtil: React.FC = () => {
  const { runBackfillInvitations, loading } = useExpenseStore();
  const { toast } = useToast();

  const handleBackfill = async () => {
    try {
      await runBackfillInvitations();
      toast({
        title: "Backfill Complete",
        description: "Successfully linked existing users to their group invitations.",
      });
    } catch (error) {
      toast({
        title: "Backfill Failed",
        description: "Failed to run the backfill process. Check console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin Utilities</CardTitle>
        <CardDescription>
          Run this once to fix existing data where users were invited by email but never linked to their accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleBackfill} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Running Backfill...' : 'Run Invitation Backfill'}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          This will scan all groups and link existing users to groups they were invited to by email.
        </p>
      </CardContent>
    </Card>
  );
};