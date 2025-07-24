import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { Member } from "@/types/index";

interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupForm = ({ isOpen, onClose }: GroupFormProps) => {
  const { user } = useAuth();
  const { addGroup } = useExpenseStore();
  const [groupName, setGroupName] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMemberField = () => {
    setMemberEmails([...memberEmails, ""]);
  };

  const removeMemberField = (index: number) => {
    setMemberEmails(memberEmails.filter((_, i) => i !== index));
  };

  const updateMemberEmail = (index: number, email: string) => {
    const updated = [...memberEmails];
    updated[index] = email;
    setMemberEmails(updated);
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
        ...memberEmails
          .filter(email => email.trim() !== "")
          .map(email => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            email: email.trim(),
            name: email.trim(),
            role: "member" as const,
          })),
      ];

      await addGroup({
        name: groupName,
        description: "",
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
      setMemberEmails([""]);
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            {memberEmails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={email}
                  onChange={(e) => updateMemberEmail(index, e.target.value)}
                  placeholder="Enter email address"
                  type="email"
                />
                {memberEmails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMemberField(index)}
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
              onClick={addMemberField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
