
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback , AvatarImage} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExpenseStore, Group, Member } from '@/stores/expenseStore';
import { Users, Crown, Eye, User, UserPlus, UserMinus, MoreVertical, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
  const { toast } = useToast();
  // Admins manage people and roles; members can add people; viewers only look.
  const myRole = group.members.find(m => m.id === user?.uid)?.role;
  const isAdmin = myRole === 'admin';
  const canAdd = myRole === 'admin' || myRole === 'member';
  const [busy, setBusy] = useState(false);
  const adminCount = group.members.filter(m => m.role === 'admin').length;

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

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim() || !user) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and email.",
        variant: "destructive"
      });
      return;
    }

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
        title: "Member added",
        description: `${newMemberName.trim()} is in the group. If they don't have an account yet, they'll join when they sign up with ${newMemberEmail.trim()}.`,
      });
      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddMember(false);
    } catch {
      toast({ title: "Couldn't add member", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (group.members.filter(m => m.role === 'admin').length === 1 && member.role === 'admin') {
      toast({
        title: "Cannot Remove Admin",
        description: "Cannot remove the last admin. Promote another member first.",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`Remove ${member.name} from ${group.name}? Their past expenses stay in the group.`)) return;
    try {
      await removeMemberFromGroup(group.id, member.id);
      toast({ title: "Member removed", description: `${member.name} has been removed from the group.` });
    } catch {
      toast({ title: "Couldn't remove member", description: "Only group admins can remove people.", variant: "destructive" });
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
              <span className="text-lg sm:text-2xl">Group Members ({group.members.length})</span>
            </div>
            {canAdd && (
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Enter member's name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Enter member's email"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button variant="outline" onClick={() => setShowAddMember(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} className="flex-1" disabled={busy}>
                      {busy ? 'Adding…' : 'Add Member'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-4 sm:px-6 sm:pb-6">
          <div className="space-y-3 sm:space-y-4">
            {group.members.map((member) => (
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
                    </div>
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.joinedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Joined {formatDate(member.joinedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3">
                  <div className="flex items-center space-x-2">
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

          {/* Role Descriptions */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Role permissions</h3>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex items-center space-x-2">
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-owes flex-shrink-0" />
                <span className="font-medium">Admin:</span>
                <span className="text-muted-foreground">Full access, can manage members and settings</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">Member:</span>
                <span className="text-muted-foreground">Can add expenses and settle debts</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">Viewer:</span>
                <span className="text-muted-foreground">Read-only access, cannot add expenses</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
