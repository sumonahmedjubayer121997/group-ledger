import React, { useState } from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { useExpenseStore } from '@/stores/expenseStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { deleteMyAccount } from '@/services/firebaseService';
import { popupResolver } from '@/lib/firebaseApp';
import { Download, Trash2, LogOut, AlertTriangle, Eye, Smartphone } from 'lucide-react';
import { Link } from "react-router-dom";

interface ProfilePrivacySecurityProps {
  user: User;
  userProfile: UserProfile;
}

const errorCode = (error: unknown) => (error as { code?: string })?.code ?? '';

export const ProfilePrivacySecurity: React.FC<ProfilePrivacySecurityProps> = ({ user, userProfile }) => {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const usesPassword = user.providerData.some((p) => p.providerId === 'password');
  const usesGoogle = user.providerData.some((p) => p.providerId === 'google.com');

  /** Everything SplitWize holds that's visible to you: profile, groups, expenses, payments, budgets. */
  const handleExportData = () => {
    try {
      const { groups, expenses, groupSettlements } = useExpenseStore.getState();
      const { budgets } = useBudgetStore.getState();
      const data = {
        exportedAt: new Date().toISOString(),
        profile: {
          name: userProfile.name,
          email: userProfile.email,
          photoURL: userProfile.photoURL ?? null,
          joinedAt: userProfile.joinedAt,
          preferences: userProfile.preferences,
        },
        account: {
          uid: user.uid,
          emailVerified: user.emailVerified,
          signInMethods: user.providerData.map((p) => p.providerId),
        },
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          currency: g.settings?.currency,
          archived: !!g.isArchived,
          yourRole: g.members.find((m) => m.id === user.uid)?.role ?? null,
          members: g.members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role })),
          expenses: expenses
            .filter((e) => e.groupId === g.id)
            .map((e) => ({
              id: e.id,
              date: e.date,
              description: e.description,
              category: e.category,
              amount: e.amount,
              paidBy: { id: e.paidBy?.id, name: e.paidBy?.name },
              splitType: e.splitType,
              splitAmong: (e.splitAmong ?? []).map((m) => ({ id: m.id, name: m.name })),
              splitData: e.splitData ?? null,
            })),
          payments: (groupSettlements[g.id] ?? []).map((s) => ({
            id: s.id,
            date: s.date,
            from: s.fromMemberId,
            to: s.toMemberId,
            amount: s.amount,
            method: s.paymentMethod,
            notes: s.notes ?? null,
          })),
        })),
        budgets,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `splitwize-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({
        title: 'Your data is downloading',
        description: `${data.groups.length} groups and ${expenses.length} expenses.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await logout();
    } catch {
      toast({ title: "Couldn't sign out", description: 'Please try again.', variant: 'destructive' });
      setBusy(false);
    }
  };

  const closeDelete = () => {
    if (busy) return;
    setDeleteOpen(false);
    setConfirmText('');
    setPassword('');
    setDeleteError('');
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setDeleteError('');
    try {
      // Firebase only deletes accounts that signed in recently, so confirm who this is first.
      if (usesPassword && user.email) {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      } else {
        await reauthenticateWithPopup(user, new GoogleAuthProvider(), popupResolver);
      }
      await deleteMyAccount(user);
      toast({ title: 'Account deleted', description: 'Your SplitWize account has been deleted.' });
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setDeleteError('');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError("That password isn't right.");
      } else if (code === 'auth/user-mismatch') {
        setDeleteError(`Choose the Google account you signed in with (${user.email}).`);
      } else if (code === 'auth/too-many-requests') {
        setDeleteError('Too many attempts. Wait a few minutes and try again.');
      } else {
        console.error('Account deletion failed:', error);
        setDeleteError('Something went wrong, and your account was not deleted. Please try again.');
      }
      setBusy(false);
    }
  };

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE' && (!usesPassword || password.length > 0);

  return (
    <div className="space-y-6">
      {/* Signing in */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Signing in
          </CardTitle>
          <CardDescription>
            You sign in with {[usesPassword && 'email and password', usesGoogle && 'Google'].filter(Boolean).join(' or ') || 'your account'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <p className="font-medium">This browser</p>
            <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
          </div>
          {usesPassword && (
            <p className="text-sm text-muted-foreground">
              To sign out on your other devices, change your password in Settings. Other devices are signed out within an
              hour.
            </p>
          )}
          <Button variant="outline" onClick={handleSignOut} disabled={busy} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out of this browser
          </Button>
        </CardContent>
      </Card>

      {/* Who can see what */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Who can see your information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            People in your groups can see your name, email and photo, and the expenses and payments in the groups you share.
          </p>
          <p>Your list of groups, personal budgets and notifications are visible only to you.</p>
        </CardContent>
      </Card>

      {/* Data export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download your data
          </CardTitle>
          <CardDescription>
            A JSON file with your profile, groups, members, expenses, payments and personal budgets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExportData} disabled={busy} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download my data
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/40 ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete account
          </CardTitle>
          <CardDescription>Permanently delete your SplitWize account. This can't be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={busy}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete my account…
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => (open ? setDeleteOpen(true) : closeDelete())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This permanently deletes:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>your sign-in, profile, personal budgets and notifications</li>
                  <li>any group where nobody else has an account, with all its expenses</li>
                </ul>
                <p>
                  In groups you share, past expenses and payments stay so everyone else's balances remain correct. You'll
                  appear there as "{userProfile.name} (left)". If you were the only admin, another member becomes admin.
                </p>
                <p>Download your data first if you want a copy.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input id="delete-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            </div>
            {usesPassword ? (
              <div className="space-y-1">
                <Label htmlFor="delete-password">Your password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">You'll be asked to sign in with Google once more to confirm.</p>
            )}
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={busy || !canDelete}>
              {busy ? 'Deleting…' : 'Delete account'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-sm text-muted-foreground">
        What we keep and who sees it:{" "}
        <Link to="/privacy" className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link to="/terms" className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline">
          Terms
        </Link>
      </p>
    </div>
  );
};
