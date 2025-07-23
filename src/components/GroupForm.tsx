import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExpenseStore, Member, Group } from '@/stores/expenseStore';
import { Users, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupForm: React.FC<GroupFormProps> = ({ isOpen, onClose }) => {
  const { addGroup } = useExpenseStore();
  const { user, userProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [members, setMembers] = useState<Omit<Member, 'id'>[]>([
    { name: '', email: '' },
  ]);

  const handleAddMember = () => {
    setMembers([...members, { name: '', email: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (
    index: number,
    field: keyof Omit<Member, 'id'>,
    value: string
  ) => {
    const updatedMembers = members.map((member, i) =>
      i === index ? { ...member, [field]: value } : member
    );
    setMembers(updatedMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userProfile) {
      alert('User not authenticated');
      return;
    }

    if (!formData.name.trim()) {
      alert('Group name is required');
      return;
    }

    const validMembers = members.filter(
      (m) => m.name.trim() && m.email.trim()
    );

    const currentUserName =
      userProfile?.name?.trim() ||
      userProfile?.displayName?.trim() ||
      user?.displayName?.trim() ||
      'Unnamed User';

    const currentUserEmail = user?.email?.trim() || 'unknown@example.com';

    const membersWithIds: Member[] = [
      {
        id: user.uid,
        name: currentUserName,
        email: currentUserEmail,
        role: 'admin',
      },
      ...validMembers
        .filter((m) => m.email !== user.email)
        .map((m) => ({
          id: m.email.trim(), // Use email as ID for email invitations
          name: m.name.trim(),
          email: m.email.trim(),
          role: 'member' as const,
        })),
    ];

    if (!Array.isArray(membersWithIds) || membersWithIds.length === 0) {
      alert('At least one valid member is required');
      return;
    }

    const completeGroup: Omit<Group, 'id'> = {
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      members: membersWithIds,
      createdAt: new Date(),
      groupType: 'private',
      inviteCode: crypto.randomUUID(),
      settings: {
        currency: 'USD',
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
      },
      isArchived: false,
    };

    try {
      await addGroup(completeGroup, user.uid);
      setFormData({ name: '', description: '' });
      setMembers([{ name: '', email: '' }]);
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to create group:', error);
      alert(`Failed to create group: ${error.message || error}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-green-500" />
            <span>Create New Group</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Trip to Paris, Flatmates, Office Lunch"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What's this group for?"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Group Members</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMember}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Member
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    value={userProfile?.name || userProfile?.displayName || 'Current User'}
                    disabled
                    className="bg-green-100"
                  />
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-green-100"
                  />
                </div>
                <span className="text-sm text-green-600 font-medium">
                  Admin
                </span>
              </div>

              {members.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      value={member.name}
                      onChange={(e) =>
                        handleMemberChange(index, 'name', e.target.value)
                      }
                      placeholder="Name"
                    />
                    <Input
                      value={member.email}
                      onChange={(e) =>
                        handleMemberChange(index, 'email', e.target.value)
                      }
                      placeholder="Email"
                      type="email"
                    />
                  </div>
                  {members.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
