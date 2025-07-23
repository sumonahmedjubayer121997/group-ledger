import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Group } from '@/stores/expenseStore';
import { Share, Copy, QrCode, Mail, Link2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupInviteDialogProps {
  group: Group;
  children: React.ReactNode;
}

export const GroupInviteDialog: React.FC<GroupInviteDialogProps> = ({ group, children }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [showQR, setShowQR] = useState(false);
  
  const { toast } = useToast();

  const inviteLink = `${window.location.origin}/join/${group.inviteCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard.",
    });
  };

  const sendEmailInvite = () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    // In a real app, this would send an email via backend
    const subject = `Join "${group.name}" on SplitSmart`;
    const body = `You've been invited to join the group "${group.name}" on SplitSmart!\n\nClick this link to join: ${inviteLink}\n\nOr use invite code: ${group.inviteCode}`;
    
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);

    toast({
      title: "Invite Sent",
      description: `Invitation email prepared for ${email}`,
    });
    
    setEmail('');
  };

  const shareNatively = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${group.name}" on SplitSmart`,
          text: `You've been invited to join the group "${group.name}"`,
          url: inviteLink,
        });
      } catch (err) {
        copyToClipboard(inviteLink);
      }
    } else {
      copyToClipboard(inviteLink);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="w-5 h-5" />
            <span>Invite Members</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Group Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="font-medium">{group.name}</div>
            <div className="text-sm text-muted-foreground">{group.description}</div>
            <div className="flex items-center space-x-2 mt-2">
              <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {group.groupType}
              </div>
              {group.members.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Invite Code */}
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex space-x-2">
              <Input
                value={group.inviteCode}
                readOnly
                className="font-mono text-lg text-center tracking-wider"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(group.inviteCode)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code for others to join manually
            </p>
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex space-x-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(inviteLink)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={shareNatively}
              className="flex items-center justify-center space-x-2"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowQR(!showQR)}
              className="flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Code</span>
            </Button>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-xs text-muted-foreground">
                QR Code for quick mobile sharing
              </p>
            </div>
          )}

          {/* Email Invite */}
          <div className="space-y-3">
            <Label>Send Email Invite</Label>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={sendEmailInvite}>
                <Mail className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>

          {/* Group Settings Info */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {group.groupType === 'private' ? 'Invite-only group' : 'Anyone with link can join'}
              </span>
            </div>
            {group.groupType === 'public' && (
              <p className="text-xs text-muted-foreground mt-1">
                Members can join directly using the link or code
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};