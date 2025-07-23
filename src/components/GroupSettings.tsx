
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { Settings, Upload, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupSettingsProps {
  group: Group;
}

export const GroupSettings: React.FC<GroupSettingsProps> = ({ group }) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [location, setLocation] = useState(group.location || '');
  const [tags, setTags] = useState(group.tags?.join(', ') || '');
  const [currency, setCurrency] = useState(group.settings?.currency || 'USD');
  const [simplifyDebts, setSimplifyDebts] = useState(group.settings?.simplifyDebts ?? true);
  const [notifications, setNotifications] = useState(group.settings?.notifications ?? true);
  const [recurringBills, setRecurringBills] = useState(group.settings?.recurringBills ?? false);
  const [groupType, setGroupType] = useState(group.groupType || 'private');

  const { updateGroup } = useExpenseStore();
  const { toast } = useToast();

  const handleSave = () => {
    updateGroup(group.id, {
      name,
      description,
      location: location || undefined,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      groupType: groupType as 'private' | 'public',
      settings: {
        currency,
        simplifyDebts,
        notifications,
        recurringBills,
      },
    });

    toast({
      title: "Settings Updated",
      description: "Group settings have been saved successfully.",
    });
  };

  const validCurrencies = [
    { value: 'USD', label: '$ USD' },
    { value: 'EUR', label: '€ EUR' },
    { value: 'GBP', label: '£ GBP' },
    { value: 'CAD', label: '$ CAD' },
    { value: 'AUD', label: '$ AUD' },
    { value: 'JPY', label: '¥ JPY' },
  ].filter(curr => curr.value && curr.value.trim() !== '');

  const validGroupTypes = [
    { value: 'private', label: 'Private (Invite Only)' },
    { value: 'public', label: 'Public (Join with link)' },
  ].filter(type => type.value && type.value.trim() !== '');

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
              <Select value={groupType} onValueChange={(value) => setGroupType(value)}>
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
            <h3 className="text-lg font-medium">Customization</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Group Photo</Label>
                <div className="mt-2 flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    {group.photo ? (
                      <img src={group.photo} alt="Group" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
              </div>

              <div>
                <Label>Cover Image</Label>
                <div className="mt-2 flex items-center space-x-3">
                  <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                    {group.coverImage ? (
                      <img src={group.coverImage} alt="Cover" className="w-full h-full object-cover rounded" />
                    ) : (
                      <Upload className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Cover
                  </Button>
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
                <Input value={group.inviteCode || 'LOADING'} readOnly className="font-mono" />
                <Button variant="outline" size="sm">
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
