import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES, toCurrencyCode } from "@/lib/money";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { getUserByEmail } from "@/services/firebaseService";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { Member } from "@/types/index";

interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MemberInput {
  name: string;
  email: string;
}

type Errors = { name?: string; people?: Record<number, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A new group: a name and a currency. People can be added by name now, or invited by link afterwards. */
export const GroupForm = ({ isOpen, onClose }: GroupFormProps) => {
  const { user, userProfile } = useAuth();
  const addGroup = useExpenseStore((s) => s.addGroup);
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  // New groups start in your default currency (Profile → Preferences).
  const [currency, setCurrency] = useState(() => toCurrencyCode(userProfile?.preferences?.currency));
  const [description, setDescription] = useState("");
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [people, setPeople] = useState<MemberInput[]>([{ name: "", email: "" }]);
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePerson = (index: number, field: keyof MemberInput, value: string) => {
    setPeople((list) => list.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    setErrors((e) => ({ ...e, people: { ...e.people, [index]: undefined } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    const problems: Errors = {};
    if (!groupName.trim()) problems.name = "Give the group a name.";
    people.forEach((p, i) => {
      const email = p.email.trim();
      if (email && !EMAIL.test(email)) problems.people = { ...problems.people, [i]: "That email doesn't look right." };
      else if (email && email.toLowerCase() === user.email?.toLowerCase())
        problems.people = { ...problems.people, [i]: "That's you; you're already in the group." };
    });
    setErrors(problems);
    if (problems.name || Object.values(problems.people ?? {}).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      // People with an email that has an account join straight away; everyone else is a placeholder
      // until they open the invite link.
      const resolvedMembers = await Promise.all(
        people
          .filter((p) => p.name.trim() || p.email.trim())
          .map(async (p) => {
            const email = p.email.trim();
            const existingUser = email ? await getUserByEmail(email) : null;
            const id = existingUser ? existingUser.uid : `temp-${crypto.randomUUID()}`;
            return { userId: id, id, email, name: p.name.trim() || existingUser?.name || email, role: "member" as const };
          })
      );

      const members: Member[] = [
        {
          userId: user.uid,
          id: user.uid,
          email: user.email || "",
          name: userProfile?.name || user.displayName || "You",
          role: "admin" as const,
        },
        ...resolvedMembers,
      ];

      const groupId = await addGroup(
        {
          name: groupName.trim(),
          description: description.trim(),
          members,
          createdAt: new Date(),
          createdBy: user.uid,
          photo: "",
          coverImage: "",
          // The invite link is on from the start; admins can turn it off in Settings.
          groupType: "public" as const,
          inviteCode: crypto.randomUUID(),
          settings: {
            currency,
            simplifyDebts: true,
            notifications: true,
            recurringBills: false,
          },
          tags: [],
          location: "",
          isArchived: false,
        },
        user.uid
      );

      toast.success(`Created ${groupName.trim()}`, { description: "Next: invite people or add the first expense." });
      setGroupName("");
      setDescription("");
      setPeople([{ name: "", email: "" }]);
      onClose();
      if (groupId) navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Couldn't create the group", { description: "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>You can invite people with a link once it's made.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="groupName">Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setErrors((er) => ({ ...er, name: undefined }));
                }}
                placeholder="e.g. Flatmates, Lisbon trip"
                autoComplete="off"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "group-name-error" : undefined}
              />
              {errors.name && (
                <p id="group-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="groupCurrency">Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger id="groupCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {descriptionOpen ? (
            <div className="grid gap-1.5">
              <Label htmlFor="groupDescription">Description</Label>
              <Textarea id="groupDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What's this group for?" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDescriptionOpen(true)}
              className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Add a description
            </button>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">People</legend>
            <p className="text-xs text-muted-foreground">You're in it already. Add others by name; an email is optional.</p>
            {people.map((person, index) => {
              const error = errors.people?.[index];
              return (
                <div key={index} className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      value={person.name}
                      onChange={(e) => updatePerson(index, "name", e.target.value)}
                      placeholder="Name"
                      aria-label={`Person ${index + 1} name`}
                      autoComplete="off"
                      className="flex-1"
                    />
                    <Input
                      value={person.email}
                      onChange={(e) => updatePerson(index, "email", e.target.value)}
                      placeholder="Email (optional)"
                      aria-label={`Person ${index + 1} email`}
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      className="flex-1"
                      aria-invalid={!!error}
                      aria-describedby={error ? `person-${index}-error` : undefined}
                    />
                    {people.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPeople((list) => list.filter((_, i) => i !== index))}
                        aria-label={`Remove person ${index + 1}`}
                        className="shrink-0 text-muted-foreground"
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {error && (
                    <p id={`person-${index}-error`} className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="ghost" size="sm" onClick={() => setPeople((list) => [...list, { name: "", email: "" }])}>
              <Plus aria-hidden="true" />
              Add another person
            </Button>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
