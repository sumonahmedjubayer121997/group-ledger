import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAppActions } from "@/app/appActions";
import { useExpenseStore, type Member } from "@/stores/expenseStore";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_CURRENCIES, toCurrencyCode } from "@/lib/money";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SAMPLE_FRIENDS, SAMPLE_GROUP_DESCRIPTION, SAMPLE_GROUP_NAME, sampleTripExpenses } from "@/lib/sampleTrip";
import { cn } from "@/lib/utils";
import { LitPanel } from "@/components/fx/LitPanel";
import { glassRow } from "@/components/fx/glass";

const hiddenKey = (uid: string) => `splitwize:checklist-hidden:${uid}`;
export const sampleKey = (uid: string) => `splitwize:sample-group:${uid}`;

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** How many of the three steps are done, as a ring that fills in green. */
function ProgressRing({ done, of }: { done: number; of: number }) {
  const reduce = useReducedMotion();
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--fx-rim)" strokeWidth="5" />
      <motion.circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="hsl(var(--settled))"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={reduce ? false : { strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.max(done, 0.15) / of) }}
        transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.15 }}
      />
    </svg>
  );
}

/**
 * Three first steps for a new account: create a group, invite someone, add an expense. Each ticks
 * itself off from what's in your groups (the sample trip doesn't count), and the list goes away
 * when all three are done or you hide it.
 */
export function FirstRunChecklist() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const { openAddExpense, openNewGroup, openJoinGroup } = useAppActions();
  const groups = useExpenseStore((s) => s.groups);
  const expenses = useExpenseStore((s) => s.expenses);
  const addGroup = useExpenseStore((s) => s.addGroup);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hidden, setHidden] = useState(() => (user ? read(hiddenKey(user.uid)) === "1" : false));
  const [makingSample, setMakingSample] = useState(false);
  const currency = toCurrencyCode(userProfile?.preferences?.currency);
  const saveCurrency = async (value: string) => {
    if (!userProfile || value === currency) return;
    try {
      await updateUserProfile({ preferences: { ...userProfile.preferences, currency: value } });
    } catch {
      toast({ title: "Couldn't save the currency", description: "Please try again.", variant: "destructive" });
    }
  };

  if (!user || hidden) return null;
  const sampleId = read(sampleKey(user.uid));
  const real = groups.filter((g) => g.id !== sampleId);
  const realIds = new Set(real.map((g) => g.id));
  const firstGroup = real.find((g) => !g.isArchived) ?? real[0];

  const steps = [
    {
      label: "Create a group",
      hint: "For a trip, a flat, or a regular dinner.",
      done: real.length > 0,
      action: { label: "New group", run: openNewGroup },
    },
    {
      label: "Invite someone",
      hint: "Share the group's link, or add people by name.",
      done: real.some((g) => g.members.length > 1),
      action: firstGroup ? { label: "Open group", run: () => navigate(`/groups/${firstGroup.id}`) } : null,
    },
    {
      label: "Add the first expense",
      hint: "Amount and what it was for; the rest is filled in.",
      done: expenses.some((e) => realIds.has(e.groupId)),
      action: real.length > 0 ? { label: "Add expense", run: () => openAddExpense(firstGroup?.id, "checklist") } : null,
    },
  ];
  if (steps.every((s) => s.done)) return null;
  const next = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  const hide = () => {
    try {
      localStorage.setItem(hiddenKey(user.uid), "1");
    } catch {
      /* hiding just won't be remembered */
    }
    setHidden(true);
  };

  const makeSample = async () => {
    if (makingSample) return;
    setMakingSample(true);
    try {
      const me: Member = { userId: user.uid, id: user.uid, email: user.email || "", name: userProfile?.name || user.displayName || "You", role: "admin" };
      const friends: Member[] = SAMPLE_FRIENDS.map((name) => {
        const id = `temp-${crypto.randomUUID()}`;
        return { userId: id, id, email: "", name, role: "member" };
      });
      const groupId = await addGroup(
        {
          name: SAMPLE_GROUP_NAME,
          description: SAMPLE_GROUP_DESCRIPTION,
          members: [me, ...friends],
          createdAt: new Date(),
          createdBy: user.uid,
          photo: "",
          coverImage: "",
          groupType: "private" as const,
          inviteCode: crypto.randomUUID(),
          settings: { currency: toCurrencyCode(userProfile?.preferences?.currency), simplifyDebts: true, notifications: false, recurringBills: false },
          tags: [],
          location: "",
          isArchived: false,
        },
        user.uid
      );
      try {
        localStorage.setItem(sampleKey(user.uid), groupId);
      } catch {
        /* the sample would then count towards the steps; harmless */
      }
      for (const expense of sampleTripExpenses(me, friends)) {
        await addExpense({ ...expense, groupId }, user.uid);
      }
      toast({ title: "Your sample trip is ready", description: "Delete it from the group's Settings when you're done." });
      navigate(`/groups/${groupId}`);
    } catch {
      toast({ title: "Couldn't make the sample trip", description: "Please try again.", variant: "destructive" });
    } finally {
      setMakingSample(false);
    }
  };

  return (
    <LitPanel tone="settled" light="top-left" className="p-5 sm:p-6" aria-labelledby="first-steps-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <ProgressRing done={doneCount} of={steps.length} />
            <div>
              <h2 id="first-steps-title" className="font-display text-[22px] leading-tight">
                Get set up
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {doneCount} of 3 done
              </p>
            </div>
          </div>
          {/* Guessed from the phone's region when the account was made (see guessCurrency). */}
          {real.length === 0 && userProfile && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span id="checklist-currency">New groups start in</span>
              <Select value={currency} onValueChange={saveCurrency}>
                <SelectTrigger className="h-8 w-auto gap-1 px-2 text-foreground" aria-labelledby="checklist-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 text-muted-foreground" onClick={hide} aria-label="Hide these steps">
          <X aria-hidden="true" />
        </Button>
      </div>

      <ol className="mt-4 space-y-1.5">
        {steps.map((step, i) => (
          // The next step sits on glass; the others stay flat.
          <li key={step.label} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", i === next ? glassRow : "border border-transparent")}>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors",
                step.done ? "border-settled bg-settled/10 text-settled" : i === next ? "border-settled/50 text-foreground" : "text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                {step.label}
                <span className="sr-only">{step.done ? " (done)" : ""}</span>
              </p>
              {!step.done && <p className="text-xs text-muted-foreground">{step.hint}</p>}
            </div>
            {!step.done && step.action && (
              <Button size="sm" variant={i === next ? "default" : "ghost"} onClick={step.action.run}>
                {step.action.label}
              </Button>
            )}
          </li>
        ))}
      </ol>

      {real.length === 0 && (
        <p className="mt-4 border-t border-[color:var(--fx-rim)] pt-4 text-sm text-muted-foreground">
          Got an invite?{" "}
          <button
            type="button"
            onClick={openJoinGroup}
            className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Join a group
          </button>{" "}
          by scanning its QR code or pasting the link.
        </p>
      )}

      {groups.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Just looking?{" "}
          <button
            type="button"
            onClick={makeSample}
            disabled={makingSample}
            className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:no-underline disabled:opacity-60"
          >
            {makingSample ? "Making a sample trip…" : "Try it with a sample trip"}
          </button>
          , a made-up group you can delete afterwards.
        </p>
      )}
    </LitPanel>
  );
}
