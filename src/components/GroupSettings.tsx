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
import { Upload, Save, Copy, RefreshCw, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

    toast.success("Saved your changes");
  } catch (err) {
    console.error("Failed to update group settings:", err);
    toast.error("Couldn't save your changes", { description: "Please try again." });
  }
};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Group details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flat 4B" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this group for?" rows={2} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="simplify-debts">Simplify debts</Label>
              <p className="text-sm text-muted-foreground">Settle with the fewest payments, instead of paying back each expense.</p>
            </div>
            <Switch id="simplify-debts" checked={simplifyDebts} onCheckedChange={setSimplifyDebts} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-sm text-muted-foreground">Tell members about new expenses and payments in this group.</p>
            </div>
            <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
          </div>

          {/* Invite link */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="link-joining">Anyone with the link can join</Label>
                <p className="text-sm text-muted-foreground">When off, the group is invite-only and members add people by email.</p>
              </div>
              <Switch id="link-joining" checked={linkEnabled} onCheckedChange={toggleLink} disabled={linkBusy} />
            </div>
            {linkEnabled && (
              <div className="flex items-center gap-2">
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
                  <Copy aria-hidden="true" />
                </Button>
                <Button variant="outline" size="sm" onClick={regenerateLink} disabled={linkBusy}>
                  <RefreshCw aria-hidden="true" />
                  New link
                </Button>
              </div>
            )}
          </div>

          {/* Rarely changed, so out of the way. */}
          <Collapsible className="border-t pt-4">
            <CollapsibleTrigger className="group flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              More details
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Dhaka, London" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Trip, Flatmates" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Group photo</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      {photo ? <img src={photo} alt="" className="h-full w-full rounded-lg object-cover" /> : <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
                    </div>
                    <GroupPictureUpload currentPhotoURL={photo || undefined} onPhotoChange={handlePhotoChange} type="photo" />
                  </div>
                </div>
                <div>
                  <Label>Cover image</Label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-16 w-32 items-center justify-center rounded-lg bg-muted">
                      {coverImage ? <img src={coverImage} alt="" className="h-full w-full rounded-lg object-cover" /> : <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
                    </div>
                    <GroupPictureUpload currentPhotoURL={coverImage || undefined} onPhotoChange={handleCoverImageChange} type="coverImage" />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save aria-hidden="true" />
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};