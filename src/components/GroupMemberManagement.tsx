
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback , AvatarImage} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useExpenseStore, Group, Member } from '@/stores/expenseStore';
import { Users, Crown, Eye, User, UserPlus, UserMinus, Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { deferWithUndo, useHidden } from '@/lib/undo';
import { ensureInviteLink, setLinkJoining } from '@/services/firebaseService';

import { formatDate } from "@/lib/dates";
interface GroupMemberManagementProps {
  group: Group;
}

export const GroupMemberManagement: React.FC<GroupMemberManagementProps> = ({ group }) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  const { addMemberToGroup, removeMemberFromGroup, updateMemberRole } = useExpenseStore();
  const { user } = useAuth();
  const hidden = useHidden((s) => s.hidden);
  const { toast } = useToast();
  // Admins manage people and roles; members can add people; viewers only look.
  const myRole = group.members.find(m => m.id === user?.uid)?.role;
  const isAdmin = myRole === 'admin';
  const canAdd = myRole === 'admin' || myRole === 'member';
  const [busy, setBusy] = useState(false);
  const adminCount = group.members.filter(m => m.role === 'admin').length;
  // Someone who deleted their account stays as "Name (left)" so balances add up.
  const hasLeft = (m: Member) => !!m.isTemporary && /\(left\)$/.test(m.name ?? '');

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-owes" />;
      case 'viewer': return <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />;
      default: return <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-owes/10 text-owes text-xs">Admin</Badge>;
      case 'viewer': return <Badge variant="outline" className="text-muted-foreground text-xs">Viewer</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground text-xs">Member</Badge>;
    }
  };

  const [addErrors, setAddErrors] = useState<{ name?: string; email?: string }>({});

  const handleAddMember = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const problems: typeof addErrors = {};
    if (!newMemberName.trim()) problems.name = 'Add their name.';
    if (!newMemberEmail.trim()) problems.email = "Add their email, or share the invite link instead.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMemberEmail.trim())) problems.email = "That email doesn't look right.";
    setAddErrors(problems);
    if (problems.name || problems.email || !user || busy) return;

    const newMember: Omit<Member, 'joinedAt' | 'role'> = {
      userId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
    };

    setBusy(true);
    try {
      await addMemberToGroup(group.id, newMember, user.uid);
      toast({
        title: `Added ${newMemberName.trim()}`,
        description: `If they don't have an account yet, they'll join when they sign up with ${newMemberEmail.trim()}.`,
      });
      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddMember(false);
    } catch {
      toast({ title: `Couldn't add ${newMemberName.trim()}`, description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (group.members.filter(m => m.role === 'admin').length === 1 && member.role === 'admin') {
      toast({
        title: "Make someone else an admin first",
        description: "A group needs at least one admin.",
        variant: "destructive"
      });
      return;
    }

    // Removed from view at once, with Undo; the real removal happens 8 seconds later.
    deferWithUndo({
      id: `member-${group.id}-${member.id}`,
      title: `Removed ${member.name}`,
      description: "Their past expenses stay in the group.",
      run: () => removeMemberFromGroup(group.id, member.id),
    });
  };

  /**
   * Shares the group's link. For a name added without an email it's a personal link (`?as=`), so
   * they land on "I'm {name}" and take over that name's expenses. Turns on joining by link if needed.
   */
  const sendInvite = async (member: Member) => {
    try {
      const linkOn = group.groupType === 'public' && (group.inviteCode?.length ?? 0) >= 16;
      const code = linkOn ? await ensureInviteLink(group) : await setLinkJoining(group, true);
      const url = `${window.location.origin}/join/${code}${member.email ? '' : `?as=${encodeURIComponent(member.id)}`}`;
      const text = member.email
        ? `Join "${group.name}" on SplitWize. Sign up with ${member.email} and you'll see what you owe.`
        : `Join "${group.name}" on SplitWize. You're already in it as ${member.name}.`;
      if (navigator.share) {
        try {
          await navigator.share({ title: `Join ${group.name}`, text, url });
          return;
        } catch (error) {
          if ((error as Error)?.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast({
        title: 'Invite link copied',
        description: linkOn ? `Send it to ${member.name}.` : `Send it to ${member.name}. Joining by link is now on for this group.`,
      });
    } catch {
      toast({ title: "Couldn't make the invite link", description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleRoleChange = async (member: Member, newRole: Member['role']) => {
    if (member.role === 'admin' && newRole !== 'admin' && adminCount === 1) {
      toast({ title: "Keep at least one admin", description: "Make someone else an admin first.", variant: "destructive" });
      return;
    }
    try {
      await updateMemberRole(group.id, member.id, newRole);
      toast({
        title: "Role updated",
        description: `${member.name} is now ${newRole === 'admin' ? 'an admin' : newRole === 'viewer' ? 'a viewer' : 'a member'}.`,
      });
    } catch {
      toast({ title: "Couldn't change the role", description: "Please try again.", variant: "destructive" });
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-lg sm:text-2xl">{group.members.length} {group.members.length === 1 ? "person" : "people"}</span>
            </div>
            {canAdd && (
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add person
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a person</DialogTitle>
                  <DialogDescription>They'll see the group when they sign in with this email.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4" noValidate>
                  <div className="grid gap-1.5">
                    <Label htmlFor="add-person-name">Name</Label>
                    <Input
                      id="add-person-name"
                      value={newMemberName}
                      onChange={(e) => {
                        setNewMemberName(e.target.value);
                        setAddErrors((er) => ({ ...er, name: undefined }));
                      }}
                      autoComplete="off"
                      aria-invalid={!!addErrors.name}
                      aria-describedby={addErrors.name ? 'add-person-name-error' : undefined}
                    />
                    {addErrors.name && (
                      <p id="add-person-name-error" className="text-sm text-destructive">
                        {addErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="add-person-email">Email</Label>
                    <Input
                      id="add-person-email"
                      type="email"
                      inputMode="email"
                      value={newMemberEmail}
                      onChange={(e) => {
                        setNewMemberEmail(e.target.value);
                        setAddErrors((er) => ({ ...er, email: undefined }));
                      }}
                      autoComplete="off"
                      aria-invalid={!!addErrors.email}
                      aria-describedby={addErrors.email ? 'add-person-email-error' : undefined}
                    />
                    {addErrors.email && (
                      <p id="add-person-email-error" className="text-sm text-destructive">
                        {addErrors.email}
                      </p>
                    )}
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                      {busy ? 'Adding…' : 'Add person'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-4 sm:px-6 sm:pb-6">
          <div className="space-y-3 sm:space-y-4">
            {group.members.filter((m) => !hidden.has(`member-${group.id}-${m.id}`)).map((member) => (
              <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                 <Avatar
  key={member.id}
  className="relative flex shrink-0 overflow-hidden rounded-full border-2 border-card w-12 h-12 sm:w-10 sm:h-10"
>
  {member.photoURL ? (
    <AvatarImage
      src={member.photoURL}
      alt={member.name}
      className="object-cover w-full h-full"
    />
  ) : (
    <AvatarFallback className="text-xs bg-primary/10 text-primary w-full h-full flex items-center justify-center">
      {member.name?.charAt(0)?.toUpperCase()}
    </AvatarFallback>
  )}
</Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm sm:text-base truncate">{member.name}</span>
                      {getRoleIcon(member.role)}
                      {member.isTemporary && !hasLeft(member) && (
                        <Badge variant="outline" className="shrink-0 border-dashed text-xs font-normal text-muted-foreground">
                          Not joined yet
                        </Badge>
                      )}
                    </div>
                    {member.email && (
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.joinedAt && !hasLeft(member) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {member.isTemporary ? 'Added' : 'Joined'} {formatDate(member.joinedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-3">
                  {canAdd && member.isTemporary && !hasLeft(member) && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => sendInvite(member)}>
                      <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Send invite
                    </Button>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {!isAdmin && getRoleBadge(member.role)}

                    {isAdmin && (
                    <Select
                      value={member.role || 'member'}
                      onValueChange={(value: Member['role']) => handleRoleChange(member, value)}
                    >
                      <SelectTrigger className="w-24 sm:w-32 h-8 text-xs sm:text-sm" aria-label={`Role for ${member.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    )}
                  </div>

                  {isAdmin && member.id !== user?.uid && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMember(member)}
                    disabled={adminCount === 1 && member.role === 'admin'}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    aria-label={`Remove ${member.name}`}
                  >
                    <UserMinus className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
                  </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Most people never change a role, so the explanation waits behind a link. */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-4 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                What can each role do?
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] space-y-3 text-sm">
              {[
                { Icon: Crown, role: 'Admin', what: 'Everything, including people, roles and settings.', tone: 'text-owes' },
                { Icon: User, role: 'Member', what: 'Adds expenses, records payments, adds people.', tone: 'text-muted-foreground' },
                { Icon: Eye, role: 'Viewer', what: 'Sees everything, changes nothing.', tone: 'text-muted-foreground' },
              ].map(({ Icon, role, what, tone }) => (
                <p key={role} className="flex gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
                  <span>
                    <span className="font-medium">{role}:</span> <span className="text-muted-foreground">{what}</span>
                  </span>
                </p>
              ))}
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
    </div>
  );
};
