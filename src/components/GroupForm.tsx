import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useExpenseStore } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { X, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupForm: React.FC<GroupFormProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addGroup } = useExpenseStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupType: 'private' as 'private' | 'public',
    currency: 'USD',
    memberEmails: [''],
    tags: [] as string[],
    newTag: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const members = [
      {
        id: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        role: 'admin' as const
      }
    ];

    // Add other members from emails
    formData.memberEmails.forEach((email, index) => {
      if (email.trim()) {
        members.push({
          id: `temp-${index}`,
          name: email.split('@')[0],
          email: email.trim(),
          role: 'member' as const
        });
      }
    });

    const newGroup = {
      name: formData.name,
      description: formData.description,
      members,
      createdAt: new Date(),
      groupType: formData.groupType,
      inviteCode: uuidv4(),
      settings: {
        currency: formData.currency,
        simplifyDebts: true,
        notifications: true,
        recurringBills: false
      },
      isArchived: false,
      tags: formData.tags
    };

    try {
      await addGroup(newGroup, user.uid);
      onClose();
      setFormData({
        name: '',
        description: '',
        groupType: 'private',
        currency: 'USD',
        memberEmails: [''],
        tags: [],
        newTag: ''
      });
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const addMemberEmail = () => {
    setFormData(prev => ({
      ...prev,
      memberEmails: [...prev.memberEmails, '']
    }));
  };

  const removeMemberEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      memberEmails: prev.memberEmails.filter((_, i) => i !== index)
    }));
  };

  const updateMemberEmail = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      memberEmails: prev.memberEmails.map((e, i) => i === index ? email : e)
    }));
  };

  const addTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter group name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="groupType">Group Type</Label>
              <Select value={formData.groupType} onValueChange={(value: 'private' | 'public') => setFormData(prev => ({ ...prev, groupType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Member Emails</Label>
            <div className="space-y-2">
              {formData.memberEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={email}
                    onChange={(e) => updateMemberEmail(index, e.target.value)}
                    placeholder="Enter email address"
                    type="email"
                    className="flex-1"
                  />
                  {formData.memberEmails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeMemberEmail(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMemberEmail}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={formData.newTag}
                onChange={(e) => setFormData(prev => ({ ...prev, newTag: e.target.value }))}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag} className="shrink-0">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button type="button" variant="outline" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button type="submit" className="order-1 sm:order-2">Create Group</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
