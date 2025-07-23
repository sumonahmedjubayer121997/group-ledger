import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExpenseStore, Group, Member } from '@/stores/expenseStore';
import { Users, Crown, Eye, User, UserPlus, UserMinus, MoreVertical, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4 text-blue-500" />;
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-yellow-100 text-yellow-800">Admin</Badge>;
      case 'viewer': return <Badge variant="outline" className="text-gray-600">Viewer</Badge>;
      default: return <Badge variant="outline" className="text-blue-600">Member</Badge>;
    }
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberEmail.trim() || !user) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and email.",
        variant: "destructive"
      });
      return;
    }

    const newMember: Omit<Member, 'joinedAt' | 'role'> = {
      id: crypto.randomUUID(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
    };

    addMemberToGroup(group.id, newMember, user.uid);
    
    toast({
      title: "Member Added",
      description: `${newMemberName} has been added to the group.`,
    });

    setNewMemberName('');
    setNewMemberEmail('');
    setShowAddMember(false);
  };

  const handleRemoveMember = (member: Member) => {
    if (group.members.filter(m => m.role === 'admin').length === 1 && member.role === 'admin') {
      toast({
        title: "Cannot Remove Admin",
        description: "Cannot remove the last admin. Promote another member first.",
        variant: "destructive"
      });
      return;
    }

    removeMemberFromGroup(group.id, member.id);
    
    toast({
      title: "Member Removed",
      description: `${member.name} has been removed from the group.`,
    });
  };

  const handleRoleChange = (member: Member, newRole: Member['role']) => {
    updateMemberRole(group.id, member.id, newRole);
    
    toast({
      title: "Role Updated",
      description: `${member.name} is now ${newRole === 'admin' ? 'an admin' : newRole === 'viewer' ? 'a viewer' : 'a member'}.`,
    });
  };

  const adminCount = group.members.filter(m => m.role === 'admin').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Group Members ({group.members.length})</span>
            </div>
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
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
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Enter member's email"
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <Button variant="outline" onClick={() => setShowAddMember(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} className="flex-1">
                      Add Member
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{member.name}</span>
                      {getRoleIcon(member.role)}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span>{member.email}</span>
                    </div>
                    {member.joinedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getRoleBadge(member.role)}
                  
                  <Select
                    value={member.role || 'member'}
                    onValueChange={(value: Member['role']) => handleRoleChange(member, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMember(member)}
                    disabled={adminCount === 1 && member.role === 'admin'}
                    className="text-red-600 hover:text-red-700"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Role Descriptions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Role Permissions</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">Admin:</span>
                <span className="text-gray-600">Full access, can manage members and settings</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Member:</span>
                <span className="text-gray-600">Can add expenses and settle debts</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Viewer:</span>
                <span className="text-gray-600">Read-only access, cannot add expenses</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
