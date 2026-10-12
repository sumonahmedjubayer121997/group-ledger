import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useExpenseStore, type Group } from '@/stores/expenseStore';
import { deleteGroupCompletely } from '@/services/firebaseService';

/** Archive / restore (any member) and permanent delete (admins), each behind an honest confirmation. */
export const GroupLifecycleActions: React.FC<{ group: Group; isAdmin: boolean; compact?: boolean }> = ({ group, isAdmin, compact }) => {
  const { archiveGroup, unarchiveGroup } = useExpenseStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  const [typedName, setTypedName] = useState('');
  const [busy, setBusy] = useState(false);

  const archive = async () => {
    setBusy(true);
    try {
      if (group.isArchived) {
        await unarchiveGroup(group.id);
        toast({ title: 'Group restored', description: `${group.name} is back in your groups list.` });
      } else {
        await archiveGroup(group.id);
        toast({ title: 'Group archived', description: `${group.name} moved to Archived. Nothing was deleted.` });
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteGroupCompletely(group.id);
      toast({ title: 'Group deleted', description: `${group.name} and its expenses were deleted.` });
      navigate('/');
    } catch {
      toast({ title: "Couldn't delete the group", description: 'Only group admins can delete a group.', variant: 'destructive' });
    } finally {
      setBusy(false);
      setConfirm(null);
      setTypedName('');
    }
  };

  const size = compact ? 'sm' : 'default';

  return (
    <>
      <Button variant="outline" size={size} className="w-full justify-start" onClick={() => (group.isArchived ? archive() : setConfirm('archive'))} disabled={busy}>
        {group.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
        {group.isArchived ? 'Restore group' : 'Archive group'}
      </Button>
      {isAdmin && (
        <Button variant="outline" size={size} className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setConfirm('delete')} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete group
        </Button>
      )}

      <AlertDialog open={confirm === 'archive'} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {group.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The group moves to the Archived section of your groups list. Expenses, balances and chat are kept, and you can
              restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archive} disabled={busy}>
              Archive group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => { if (!open) { setConfirm(null); setTypedName(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {group.name} for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the group, its expenses, payments, budgets and chat for every member. It can't be undone.
              If you only want it out of the way, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-group-name">Type the group name to confirm</Label>
            <Input id="confirm-group-name" value={typedName} onChange={(e) => setTypedName(e.target.value)} autoComplete="off" placeholder={group.name} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={busy || typedName.trim() !== group.name.trim()}>
              {busy ? 'Deleting…' : 'Delete group'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
