import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Group } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { ensureInviteLink, setLinkJoining } from '@/services/firebaseService';
import { Share, Copy, Mail, Link2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/usage';

interface GroupInviteDialogProps {
  group: Group;
  /** The button that opens it; leave out when `open` is controlled. */
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Invite people with the group's QR code or link (when the group allows joining by link). People can also be
 * added directly by email from the Settings tab.
 */
export const GroupInviteDialog: React.FC<GroupInviteDialogProps> = ({ group, children, open: openProp, onOpenChange }) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(group.inviteCode);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const myRole = group.members.find((m) => m.id === user?.uid)?.role;
  const isAdmin = myRole === 'admin';
  const canWrite = myRole === 'admin' || myRole === 'member';
  const linkEnabled = group.groupType === 'public';
  const inviteLink = code ? `${window.location.origin}/join/${code}` : '';
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

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
      track('invite_shared', { source: 'copy' });
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
    track('invite_shared', { source: 'email' });
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    toast({ title: 'Opening your email app', description: `The invite to ${to} is ready to send from there.` });
    setEmail('');
  };

  const shareNatively = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join "${group.name}" on SplitWize`, text: message, url: inviteLink });
        track('invite_shared', { source: 'share-sheet' });
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
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
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
          <div className="space-y-5 py-1">
            {/* White behind the code so phone cameras read it in dark mode too. */}
            <figure className="text-center">
              <div className="mx-auto w-fit rounded-xl border bg-white p-3">
                <QRCodeSVG value={inviteLink} size={208} marginSize={1} title={`QR code to join ${group.name}`} />
              </div>
              <figcaption className="mt-2 text-xs text-muted-foreground">
                Scan with a phone camera, or with Join a group in SplitWize.
              </figcaption>
            </figure>

            <div className="grid grid-cols-2 gap-2">
              {canShare ? (
                <>
                  <Button onClick={shareNatively}>
                    <Share aria-hidden="true" />
                    Share link
                  </Button>
                  <Button variant="outline" onClick={() => copyToClipboard(inviteLink)}>
                    <Copy aria-hidden="true" />
                    Copy link
                  </Button>
                </>
              ) : (
                <Button className="col-span-2" onClick={() => copyToClipboard(inviteLink)}>
                  <Copy aria-hidden="true" />
                  Copy link
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-link" className="text-xs text-muted-foreground">
                Invite link
              </Label>
              <Input id="invite-link" value={inviteLink} readOnly className="text-xs" onFocus={(e) => e.target.select()} />
            </div>

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
                  Add people by email in the Settings tab. If they don't have an account yet, they join as soon as they
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
