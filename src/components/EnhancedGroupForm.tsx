import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { getUserByEmail } from "@/services/firebaseService";
import { toast } from "sonner";
import { 
  Plus, 
  X, 
  Users, 
  Upload, 
  RefreshCw, 
  MapPin, 
  Tag, 
  Lock, 
  Globe,
  Camera,
  Image as ImageIcon
} from "lucide-react";
import type { Member, Group, GroupSettings } from "@/stores/expenseStore";

interface EnhancedGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group;
  isEditing?: boolean;
}

interface MemberInput {
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD',
  'INR', 'BRL', 'ZAR', 'SGD', 'HKD', 'NOK', 'MXN', 'TRY', 'RUB', 'KRW'
];

const GROUP_TYPES = [
  { value: 'private', label: 'Private (Invite Only)', icon: Lock },
  { value: 'public', label: 'Public (Anyone Can Join)', icon: Globe }
];

export const EnhancedGroupForm = ({ isOpen, onClose, group, isEditing = false }: EnhancedGroupFormProps) => {
  const { user } = useAuth();
  const { addGroup, updateGroup } = useExpenseStore();
  
  // Basic Info
  const [groupName, setGroupName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [location, setLocation] = useState(group?.location || "");
  const [tags, setTags] = useState(group?.tags?.join(', ') || "");
  const [groupType, setGroupType] = useState<'private' | 'public'>(group?.groupType || 'private');
  
  // Settings
  const [settings, setSettings] = useState<GroupSettings>({
    currency: group?.settings?.currency || 'USD',
    simplifyDebts: group?.settings?.simplifyDebts ?? true,
    notifications: group?.settings?.notifications ?? true,
    recurringBills: group?.settings?.recurringBills ?? false,
  });
  
  // Members
  const [memberInputs, setMemberInputs] = useState<MemberInput[]>(
    isEditing && group ? 
      group.members.filter(m => m.id !== user?.uid).map(m => ({
        name: m.name,
        email: m.email,
        role: m.role || 'member'
      })) : 
      [{ name: "", email: "", role: 'member' as const }]
  );
  
  // Photos
  const [groupPhoto, setGroupPhoto] = useState(group?.photo || "");
  const [coverImage, setCoverImage] = useState(group?.coverImage || "");
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState(group?.inviteCode || "");

  useEffect(() => {
    if (group && isEditing) {
      setGroupName(group.name);
      setDescription(group.description || "");
      setLocation(group.location || "");
      setTags(group.tags?.join(', ') || "");
      setGroupType(group.groupType);
      setSettings(group.settings);
      setGroupPhoto(group.photo || "");
      setCoverImage(group.coverImage || "");
      setCurrentInviteCode(group.inviteCode);
    }
  }, [group, isEditing]);

  const generateNewInviteCode = () => {
    const newCode = crypto.randomUUID();
    setCurrentInviteCode(newCode);
    toast.success("New invite code generated!");
  };

  const addMemberField = () => {
    setMemberInputs([...memberInputs, { name: "", email: "", role: 'member' }]);
  };

  const removeMemberField = (index: number) => {
    setMemberInputs(memberInputs.filter((_, i) => i !== index));
  };

  const updateMemberInput = (index: number, field: keyof MemberInput, value: string) => {
    const updated = [...memberInputs];
    updated[index][field] = value as any;
    setMemberInputs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      if (isEditing && group) {
        // Update existing group
        const updates: Partial<Group> = {
          name: groupName.trim(),
          description: description.trim(),
          location: location.trim(),
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          groupType,
          settings,
          photo: groupPhoto,
          coverImage,
          inviteCode: currentInviteCode
        };

        await updateGroup(group.id, updates);
        toast.success("Group updated successfully!");
      } else {
        // Create new group
        const memberPromises = memberInputs
          .filter(member => member.email.trim() !== "")
          .map(async (member) => {
            const existingUser = await getUserByEmail(member.email.trim());
            const id = existingUser ? existingUser.uid : `temp-${Date.now()}-${Math.random()}`;
            return {
              userId: id,
              id: id,
              email: member.email.trim(),
              name: member.name.trim() || existingUser?.name || member.email.trim(),
              role: member.role,
              joinedAt: new Date(),
            };
          });

        const resolvedMembers = await Promise.all(memberPromises);

        const members: Member[] = [
          {
            userId: user.uid,
            id: user.uid,
            email: user.email || "",
            name: user.displayName || "You",
            role: "admin" as const,
            joinedAt: new Date(),
          },
          ...resolvedMembers,
        ];

        await addGroup({
          name: groupName.trim(),
          description: description.trim(),
          location: location.trim(),
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          groupType,
          members,
          createdAt: new Date(),
          createdBy: user.uid,
          photo: groupPhoto,
          coverImage,
          inviteCode: currentInviteCode || crypto.randomUUID(),
          settings,
          isArchived: false,
        }, user.uid);

        toast.success("Group created successfully!");
      }

      // Reset form
      setGroupName("");
      setDescription("");
      setLocation("");
      setTags("");
      setGroupType('private');
      setSettings({
        currency: 'USD',
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
      });
      setMemberInputs([{ name: "", email: "", role: 'member' }]);
      setGroupPhoto("");
      setCoverImage("");
      onClose();
    } catch (error) {
      console.error("Error saving group:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} group. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Edit Group' : 'Create New Group'}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Group Name *</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Trip to Paris, Flatmates"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., New York, Paris"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group for?"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="travel, food, rent (comma-separated)"
                  className="pl-10"
                />
              </div>
              {tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.split(',').map((tag, index) => (
                    tag.trim() && (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    )
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Group Type</Label>
              <Select value={groupType} onValueChange={(value: 'private' | 'public') => setGroupType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        <type.icon className="mr-2 h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Financial Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Simplify Debts</Label>
                  <p className="text-sm text-muted-foreground">Minimize the number of transactions needed</p>
                </div>
                <Switch 
                  checked={settings.simplifyDebts} 
                  onCheckedChange={(checked) => setSettings({ ...settings, simplifyDebts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get notified about group activities</p>
                </div>
                <Switch 
                  checked={settings.notifications} 
                  onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recurring Bills</Label>
                  <p className="text-sm text-muted-foreground">Enable automatic recurring expenses</p>
                </div>
                <Switch 
                  checked={settings.recurringBills} 
                  onCheckedChange={(checked) => setSettings({ ...settings, recurringBills: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Customization</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Group Photo</Label>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={groupPhoto} alt="Group photo" />
                    <AvatarFallback>
                      <Camera className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex items-center space-x-2">
                  <div className="h-16 w-24 bg-muted rounded flex items-center justify-center">
                    {coverImage ? (
                      <img src={coverImage} alt="Cover" className="h-full w-full object-cover rounded" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Cover
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Management - Only show for new groups */}
        {!isEditing && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Group Members</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addMemberField}
                  className="text-primary hover:text-primary/80"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </Button>
              </div>

              {/* Current User (Admin) */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    <Users className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium text-sm">{user?.displayName || "You"}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <Badge variant="default" className="text-xs">Admin</Badge>
              </div>

              {/* Member Input Fields */}
              {memberInputs.map((member, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={member.name}
                      onChange={(e) => updateMemberInput(index, 'name', e.target.value)}
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Input
                      value={member.email}
                      onChange={(e) => updateMemberInput(index, 'email', e.target.value)}
                      placeholder="Email"
                      type="email"
                      className="flex-1"
                    />
                    <Select value={member.role} onValueChange={(value) => updateMemberInput(index, 'role', value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    {memberInputs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMemberField(index)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Invite Code */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Invite Code</h3>
            <div className="flex items-center space-x-2">
              <Input 
                value={currentInviteCode} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={generateNewInviteCode}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with others to let them join your group
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Group" : "Create Group")}
          </Button>
        </div>
      </form>
    </div>
  );
};