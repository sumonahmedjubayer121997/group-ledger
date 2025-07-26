import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { Settings, Upload, Save } from 'lucide-react';
import { toast } from "sonner";
import { GroupPictureUpload } from '@/components/GroupPictureUpload';

interface GroupSettingsProps {
  group: Group;
}

const validCurrencies = [
   { value: '£', label: '£ GBP' },
   {value: '৳', label: '৳ BDT'},
  { value: '$', label: '$ USD' },
  { value: '€', label: '€ EUR' },
  { value: 'CAD $', label: '$ CAD' },
  { value: 'AUS $', label: '$ AUD' },
  { value: '¥', label: '¥ JPY' },
].filter(curr => curr.value && typeof curr.value === 'string' && curr.value.trim() !== '');

const validGroupTypes = [
  { value: 'private', label: 'Private (Invite Only)' },
  { value: 'public', label: 'Public (Join with link)' },
].filter(type => type.value && typeof type.value === 'string' && type.value.trim() !== '');

export const GroupSettings: React.FC<GroupSettingsProps> = ({ group }) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [location, setLocation] = useState(group.location || '');
  const [tags, setTags] = useState(group.tags?.join(', ') || '');
  const [currency, setCurrency] = useState(group.settings?.currency || 'USD');
  const [simplifyDebts, setSimplifyDebts] = useState(group.settings?.simplifyDebts ?? true);
  const [notifications, setNotifications] = useState(group.settings?.notifications ?? true);
  const [recurringBills, setRecurringBills] = useState(group.settings?.recurringBills ?? false);
  const [groupType, setGroupType] = useState<'private' | 'public'>(group.groupType || 'private');
  const [photo, setPhoto] = useState(group.photo || '');
  const [coverImage, setCoverImage] = useState(group.coverImage || '');
  const [inviteCode, setInviteCode] = useState(group.inviteCode || '');

  const { updateGroup } = useExpenseStore();

  // Keep local state in sync if group prop changes
  useEffect(() => {
    setName(group.name);
    setDescription(group.description);
    setLocation(group.location || '');
    setTags(group.tags?.join(', ') || '');
    setCurrency(group.settings?.currency || 'USD');
    setSimplifyDebts(group.settings?.simplifyDebts ?? true);
    setNotifications(group.settings?.notifications ?? true);
    setRecurringBills(group.settings?.recurringBills ?? false);
    setGroupType(group.groupType || 'private');
    setPhoto(group.photo || '');
    setCoverImage(group.coverImage || '');
    setInviteCode(group.inviteCode || '');
  }, [group]);

  const handlePhotoChange = (newPhoto: string) => {
    setPhoto(newPhoto);
  };

  const handleCoverImageChange = (newCoverImage: string) => {
  setCoverImage(newCoverImage);
};
  const handleSave = async () => {
  try {
    // Log all values you are about to save
    console.log("Saving group with values:", {
      name,
      description,
      location,
      tags,
      groupType,
      settings: {
        currency,
        simplifyDebts,
        notifications,
        recurringBills,
      },
      photo,
      coverImage,
      inviteCode,
    });

   await updateGroup(group.id, {
  name,
  description,
  location: location || undefined,
  tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
  groupType: groupType as 'private' | 'public',
  settings: {
    currency,
    simplifyDebts,
    notifications,
    recurringBills,
  },
  photo,
  coverImage,
  inviteCode,
});

    console.log("Group updated successfully!");
    toast.success("Group settings updated successfully!");
  } catch (err) {
    console.error("Failed to update group settings:", err);
    toast.error("Failed to update group settings.");
  }
};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Group Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., New York, Paris"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your group"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., Trip, Flatmates, Office"
              />
            </div>
            <div>
              <Label htmlFor="group-type">Group Type</Label>
              <Select value={groupType} onValueChange={(value) => setGroupType(value as 'private' | 'public')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group type" />
                </SelectTrigger>
                <SelectContent>
                  {validGroupTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Settings</h3>
            <div>
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {validCurrencies.map(curr => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simplify-debts">Simplify Debts</Label>
                <p className="text-sm text-gray-600">
                  Automatically reduce circular debts to minimize transactions
                </p>
              </div>
              <Switch
                id="simplify-debts"
                checked={simplifyDebts}
                onCheckedChange={setSimplifyDebts}
              />
            </div>
          </div>

          {/* Feature Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Features</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive notifications for group activities
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="recurring-bills">Recurring Bills</Label>
                <p className="text-sm text-gray-600">
                  Enable automatic recurring expenses
                </p>
              </div>
              <Switch
                id="recurring-bills"
                checked={recurringBills}
                onCheckedChange={setRecurringBills}
              />
            </div>
          </div>

          {/* Group Customization */}
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             
             <div className="space-y-4">
  <h3 className="text-lg font-medium">Customization</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Group Photo</Label>
      <div className="mt-2 flex items-center space-x-3">
        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
          {photo ? (
            <img src={photo} alt="Group" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Upload className="w-6 h-6 text-gray-400" />
          )}
        </div>
        {/* Enable upload and connect to photo handler */}
        <GroupPictureUpload
  currentPhotoURL={photo || undefined}
  onPhotoChange={handlePhotoChange}
  type="photo"
// Save on photo change 
/>
      </div>
    </div>
    <div>
      <Label>Cover Image</Label>
      <div className="mt-2 flex items-center space-x-3">
        <div className="w-32 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
          {coverImage ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Upload className="w-6 h-6 text-gray-400" />
          )}
        </div>
        {/* Use a separate handler for cover image */}
        <GroupPictureUpload
  currentPhotoURL={coverImage || undefined}
  onPhotoChange={handleCoverImageChange}
  type="coverImage"
/>
      </div>
    </div>
  </div>
</div>
            </div>
          </div>

          {/* Group Code */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Group Code</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Label>Invite Code</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input value={inviteCode || 'LOADING'} readOnly className="font-mono" />
                <Button variant="outline" size="sm" disabled>
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Share this code with others to let them join your group
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};