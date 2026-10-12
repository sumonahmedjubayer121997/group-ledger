import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Group } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { ensureInviteLink, setLinkJoining } from '@/services/firebaseService';
import { Share, Copy, QrCode, Mail, Link2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupInviteDialogProps {
  group: Group;
  children: React.ReactNode;
}

/**
 * Invite people with the group's link (when the group allows joining by link). People can also be
 * added directly by email from the Members tab.
 */
export const GroupInviteDialog: React.FC<GroupInviteDialogProps> = ({ group, children }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [code, setCode] = useState(group.inviteCode);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const myRole = group.members.find((m) => m.id === user?.uid)?.role;
  const isAdmin = myRole === 'admin';
  const canWrite = myRole === 'admin' || myRole === 'member';
  const linkEnabled = group.groupType === 'public';
  const inviteLink = code ? `${window.location.origin}/join/${code}` : '';

  // Older groups have no code (or a short one) and no link record yet; members create them on first use.
  const { id, name, inviteCode } = group;
  useEffect(() => {
    setCode(inviteCode);
    if (!open || !linkEnabled || !canWrite) return;
    ensureInviteLink({ id, name, inviteCode })
      .then(setCode)
      .catch((error) => console.error('Error preparing invite link:', error));
  }, [open, linkEnabled, canWrite, id, name, inviteCode]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Link copied', description: 'Paste it into any chat to invite people.' });
    } catch {
      toast({ title: "Couldn't copy", description: 'Select the link and copy it manually.', variant: 'destructive' });
    }
  };

  const message = `Join "${group.name}" on SplitWize to share expenses with us: ${inviteLink}`;

  const emailLink = () => {
    const to = email.trim();
    if (!to) {
      toast({ title: 'Email required', description: 'Enter the email address to send the link to.', variant: 'destructive' });
      return;
    }
    const subject = `Join "${group.name}" on SplitWize`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    toast({ title: 'Opening your email app', description: `The invite to ${to} is ready to send from there.` });
    setEmail('');
  };

  const shareNatively = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join "${group.name}" on SplitWize`, text: message, url: inviteLink });
      } catch {
        // Closing the share sheet isn't an error worth reporting.
      }
    } else {
      copyToClipboard(inviteLink);
    }
  };

  const turnOnLink = async () => {
    setBusy(true);
    try {
      setCode(await setLinkJoining(group, true));
      toast({ title: 'Invite link turned on', description: 'Anyone you send the link to can join as a member.' });
    } catch {
      toast({ title: "Couldn't turn on the link", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="w-5 h-5" />
            <span>Invite to {group.name}</span>
          </DialogTitle>
          <DialogDescription>
            {linkEnabled
              ? 'Anyone with this link can sign in and join as a member.'
              : 'This group is invite-only: members add people by email.'}
          </DialogDescription>
        </DialogHeader>

        {linkEnabled && !inviteLink ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Preparing the invite link…</p>
        ) : linkEnabled ? (
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-link">Invite link</Label>
              <div className="flex space-x-2">
                <Input id="invite-link" value={inviteLink} readOnly className="text-sm" onFocus={(e) => e.target.select()} />
                <Button variant="outline" onClick={() => copyToClipboard(inviteLink)} aria-label="Copy invite link">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={shareNatively} className="flex items-center justify-center space-x-2">
                <Share className="w-4 h-4" />
                <span>Share</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowQR(!showQR)}
                aria-expanded={showQR}
                className="flex items-center justify-center space-x-2"
              >
                <QrCode className="w-4 h-4" />
                <span>{showQR ? 'Hide QR code' : 'QR code'}</span>
              </Button>
            </div>

            {showQR && (
              <div className="rounded-lg border bg-card p-4 text-center">
                <QRCodeSVG value={inviteLink} size={176} marginSize={2} className="mx-auto" title={`Invite link for ${group.name}`} />
                <p className="mt-2 text-xs text-muted-foreground">Scan with a phone camera to open the invite.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email the link</Label>
              <div className="flex space-x-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && emailLink()}
                />
                <Button onClick={emailLink}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Opens your email app with the invite filled in.</p>
            </div>

            {isAdmin && (
              <p className="text-xs text-muted-foreground">
                To stop old links working, regenerate the link or turn it off in Settings.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">Joining by link is off</p>
                <p className="text-muted-foreground">
                  Add people by email from the Members tab. If they don't have an account yet, they join as soon as they
                  sign up with that email.
                </p>
              </div>
            </div>
            {isAdmin ? (
              <Button onClick={turnOnLink} disabled={busy} className="w-full">
                <Link2 className="w-4 h-4 mr-2" />
                {busy ? 'Turning on…' : 'Turn on invite link'}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Ask a group admin if you'd like an invite link.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
