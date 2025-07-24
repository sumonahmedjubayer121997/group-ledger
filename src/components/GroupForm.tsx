import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { toast } from "sonner";
import { Plus, X, Users } from "lucide-react";
import type { Member } from "@/types/index";

interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MemberInput {
  name: string;
  email: string;
}

export const GroupForm = ({ isOpen, onClose }: GroupFormProps) => {
  const { user } = useAuth();
  const { addGroup } = useExpenseStore();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [memberInputs, setMemberInputs] = useState<MemberInput[]>([{ name: "", email: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMemberField = () => {
    setMemberInputs([...memberInputs, { name: "", email: "" }]);
  };

  const removeMemberField = (index: number) => {
    setMemberInputs(memberInputs.filter((_, i) => i !== index));
  };

  const updateMemberInput = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...memberInputs];
    updated[index][field] = value;
    setMemberInputs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const members: Member[] = [
        {
          id: user.uid,
          email: user.email || "",
          name: user.displayName || "You",
          role: "admin" as const,
        },
        ...memberInputs
          .filter(member => member.email.trim() !== "")
          .map(member => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            email: member.email.trim(),
            name: member.name.trim() || member.email.trim(),
            role: "member" as const,
          })),
      ];

      await addGroup({
        name: groupName,
        description: description,
        members,
        createdAt: new Date(),
        photo: "",
        coverImage: "",
        groupType: "private" as const,
        inviteCode: crypto.randomUUID(),
        settings: {
          currency: "USD",
          simplifyDebts: true,
          notifications: true,
          recurringBills: false,
        },
        tags: [],
        location: "",
        isArchived: false,
      }, user.uid);

      toast.success("Group created successfully!");
      setGroupName("");
      setDescription("");
      setMemberInputs([{ name: "", email: "" }]);
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Trip to Paris, Flatmates, Office Lunch"
              required
            />
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Group Members</Label>
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
              <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                Admin
              </div>
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
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
