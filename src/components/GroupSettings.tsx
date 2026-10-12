import React, { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, toCurrencyCode } from '@/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseStore, Group } from '@/stores/expenseStore';
import { Settings, Upload, Save, Copy, RefreshCw } from 'lucide-react';
import { regenerateInviteLink, setLinkJoining } from '@/services/firebaseService';
import { toast } from "sonner";
import { GroupPictureUpload } from '@/components/GroupPictureUpload';

interface GroupSettingsProps {
  group: Group;
}

// Saved as ISO codes ("GBP"); older groups stored a symbol ("£"), which toCurrencyCode() understands.
const validCurrencies = SUPPORTED_CURRENCIES.map(({ code, label }) => ({ value: code, label }));


export const GroupSettings: React.FC<GroupSettingsProps> = ({ group }) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [location, setLocation] = useState(group.location || '');
  const [tags, setTags] = useState(group.tags?.join(', ') || '');
  const [currency, setCurrency] = useState(toCurrencyCode(group.settings?.currency));
  const [simplifyDebts, setSimplifyDebts] = useState(group.settings?.simplifyDebts ?? true);
  const [notifications, setNotifications] = useState(group.settings?.notifications ?? true);
  const [recurringBills, setRecurringBills] = useState(group.settings?.recurringBills ?? false);
  const [photo, setPhoto] = useState(group.photo || '');
  const [coverImage, setCoverImage] = useState(group.coverImage || '');
  const [linkBusy, setLinkBusy] = useState(false);

  const { updateGroup } = useExpenseStore();

  // Keep local state in sync if group prop changes
  useEffect(() => {
    setName(group.name);
    setDescription(group.description);
    setLocation(group.location || '');
    setTags(group.tags?.join(', ') || '');
    setCurrency(toCurrencyCode(group.settings?.currency));
    setSimplifyDebts(group.settings?.simplifyDebts ?? true);
    setNotifications(group.settings?.notifications ?? true);
    setRecurringBills(group.settings?.recurringBills ?? false);
    setPhoto(group.photo || '');
    setCoverImage(group.coverImage || '');
  }, [group]);

  const handlePhotoChange = (newPhoto: string) => {
    setPhoto(newPhoto);
  };

  const handleCoverImageChange = (newCoverImage: string) => {
  setCoverImage(newCoverImage);
};
  const linkEnabled = group.groupType === 'public';
  // Codes shorter than a UUID come from older versions and never had a working link.
  const inviteLink = group.inviteCode?.length >= 16 ? `${window.location.origin}/join/${group.inviteCode}` : '';

  const toggleLink = async (enabled: boolean) => {
    setLinkBusy(true);
    try {
      await setLinkJoining(group, enabled);
      toast.success(enabled ? 'Invite link turned on' : 'Invite link turned off. Old links no longer work.');
    } catch {
      toast.error("Couldn't change the invite link.");
    } finally {
      setLinkBusy(false);
    }
  };

  const regenerateLink = async () => {
    setLinkBusy(true);
    try {
      await regenerateInviteLink(group);
      toast.success('New invite link created. The old one no longer works.');
    } catch {
      toast.error("Couldn't create a new link.");
    } finally {
      setLinkBusy(false);
    }
  };

  const handleSave = async () => {
  try {
    // Log all values you are about to save
    console.log("Saving group with values:", {
      name,
      description,
      location,
      tags,
      settings: {
        currency,
        simplifyDebts,
        notifications,
        recurringBills,
      },
      photo,
      coverImage,
    });

   await updateGroup(group.id, {
  name,
  description,
  location: location || undefined,
  tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
  settings: {
    currency,
    simplifyDebts,
    notifications,
    recurringBills,
  },
  photo,
  coverImage,
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
          </div>

          {/* Financial Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Settings</h3>
            <div>
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
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
                <p className="text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
                  Receive notifications for group activities
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
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
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
          {photo ? (
            <img src={photo} alt="Group" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
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
        <div className="w-32 h-16 bg-muted rounded-lg flex items-center justify-center">
          {coverImage ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
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

          {/* Invite link */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invite link</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="link-joining">Anyone with the link can join</Label>
                <p className="text-sm text-muted-foreground">
                  When off, the group is invite-only and members add people by email.
                </p>
              </div>
              <Switch id="link-joining" checked={linkEnabled} onCheckedChange={toggleLink} disabled={linkBusy} />
            </div>
            {linkEnabled && (
              <div className="flex items-center space-x-2">
                <Input
                  value={inviteLink}
                  placeholder="No link yet. Create one."
                  readOnly
                  className="text-sm"
                  aria-label="Invite link"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Copy invite link"
                  disabled={!inviteLink}
                  onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('Link copied'))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={regenerateLink} disabled={linkBusy}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New link
                </Button>
              </div>
            )}
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