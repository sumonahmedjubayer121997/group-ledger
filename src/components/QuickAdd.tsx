import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryManagement } from "@/components/CategoryManagement";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCategoryStore } from "@/stores/categoryStore";
import { useExpenseStore, type Expense, type Group } from "@/stores/expenseStore";
import { checkSplit, formatMoney, splitFieldsToSave, toCents, toCurrencyCode, type SplitMode } from "@/lib/money";
import { suggestCategory } from "@/lib/suggestCategory";
import { track } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { useOfflineStore } from "@/stores/offlineStore";

/** Everything but the date, e.g. from "Add again" on an existing expense. */
export type QuickAddPrefill = {
  groupId: string;
  description: string;
  amount: number;
  category?: string;
  paidById?: string;
  participantIds?: string[];
  splitType?: SplitMode;
  splitValues?: Record<string, number>;
};

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string;
  source?: string;
  prefill?: QuickAddPrefill;
}

const today = () => new Date().toISOString().slice(0, 10);
const lastGroupKey = (uid?: string) => `splitwize:last-group:${uid ?? ""}`;
const splitLabels: Record<SplitMode, string> = { equal: "Split equally", exact: "Exact amounts", percentage: "By percentage" };

const chip =
  "inline-flex h-8 max-w-full items-center gap-1 rounded-full border bg-card px-3 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary";

/** The newest expense in a group, to repeat its way of splitting. */
const lastIn = (expenses: Expense[], groupId: string) =>
  expenses
    .filter((e) => e.groupId === groupId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

/**
 * Add an expense in four actions: open, amount, what it was for, Enter. The group, payer, split
 * and category are guessed and shown as chips; tapping a chip changes that one value.
 */
export function QuickAdd({ isOpen, onClose, defaultGroupId, source, prefill }: QuickAddProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const groups = useExpenseStore((s) => s.groups);
  const expenses = useExpenseStore((s) => s.expenses);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const { getAllAvailableCategories, initializeDefaultCategories } = useCategoryStore();

  useEffect(() => {
    if (user?.uid) initializeDefaultCategories(user.uid);
  }, [user?.uid, initializeDefaultCategories]);
  const categories = useMemo(() => [...new Set(user ? getAllAvailableCategories(user.uid) : [])], [user, getAllAvailableCategories]);

  // Groups you can add to: active ones where you aren't a viewer.
  const writable = useMemo(
    () => groups.filter((g) => !g.isArchived && g.members.find((m) => m.id === user?.uid)?.role !== "viewer"),
    [groups, user?.uid]
  );

  const pickGroup = (): Group | undefined => {
    const wanted = prefill?.groupId ?? defaultGroupId ?? localStorage.getItem(lastGroupKey(user?.uid)) ?? undefined;
    return writable.find((g) => g.id === wanted) ?? writable[0];
  };

  const [groupId, setGroupId] = useState(() => pickGroup()?.id ?? "");
  const group = writable.find((g) => g.id === groupId) ?? groups.find((g) => g.id === groupId);
  const currency = toCurrencyCode(group?.settings?.currency);

  const defaultsFor = (g: Group | undefined) => {
    const last = g ? lastIn(expenses, g.id) : undefined;
    const ids = g?.members.map((m) => m.id) ?? [];
    const lastIds = last?.splitAmong?.map((m) => m.id).filter((id) => ids.includes(id));
    return {
      payerId: g?.members.some((m) => m.id === user?.uid) ? user!.uid : ids[0] ?? "",
      participantIds: lastIds && lastIds.length > 0 ? lastIds : ids,
    };
  };

  const initial = defaultsFor(group);
  const [payerId, setPayerId] = useState(prefill?.paidById ?? initial.payerId);
  const [participantIds, setParticipantIds] = useState<string[]>(prefill?.participantIds ?? initial.participantIds);
  const [splitType, setSplitType] = useState<SplitMode>(prefill?.splitType ?? "equal");
  const [splitValues, setSplitValues] = useState<Record<string, number>>(prefill?.splitValues ?? {});
  const [amount, setAmount] = useState(prefill ? String(prefill.amount) : "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [category, setCategory] = useState(prefill?.category ?? "");
  const [categoryChosen, setCategoryChosen] = useState(!!prefill?.category);
  const [date, setDate] = useState(today());
  const [moreOpen, setMoreOpen] = useState(prefill?.splitType ? prefill.splitType !== "equal" : false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string; split?: string; group?: string }>({});
  const [saving, setSaving] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);
  const guessesChanged = useRef(0);
  const openedAt = useRef(Date.now());
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    openedAt.current = Date.now();
    track("quick_add_opened", { source });
  }, [isOpen, source]);

  // Your past expenses, newest first, teach the category suggestion.
  const history = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );
  useEffect(() => {
    if (categoryChosen) return;
    setCategory(suggestCategory(description, history, categories) ?? (categories.includes("Other") ? "Other" : categories[0] ?? ""));
  }, [description, history, categories, categoryChosen]);

  // The three things added most often in this group, as one-tap starters.
  const templates = useMemo(() => {
    if (!group) return [];
    const byName = new Map<string, { expense: Expense; count: number }>();
    for (const e of history) {
      if (e.groupId !== group.id || !e.description) continue;
      const key = e.description.trim().toLowerCase();
      const seen = byName.get(key);
      if (seen) seen.count += 1;
      else byName.set(key, { expense: e, count: 1 });
    }
    return [...byName.values()].filter((t) => t.count >= 2).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [history, group]);

  const changeGroup = (id: string) => {
    const next = writable.find((g) => g.id === id);
    setGroupId(id);
    const d = defaultsFor(next);
    setPayerId(d.payerId);
    setParticipantIds(d.participantIds);
    setSplitValues({});
    guessesChanged.current += 1;
  };

  const applyTemplate = (e: Expense) => {
    setDescription(e.description);
    setAmount(String(e.amount));
    if (e.category && categories.includes(e.category)) {
      setCategory(e.category);
      setCategoryChosen(true);
    }
  };

  const members = group?.members ?? [];
  const payerName = members.find((m) => m.id === payerId)?.id === user?.uid ? "You paid" : `${members.find((m) => m.id === payerId)?.name.trim() ?? "Someone"} paid`;
  const splitChip =
    splitType === "equal" && participantIds.length < members.length
      ? `Split equally · ${participantIds.length} of ${members.length}`
      : splitLabels[splitType];

  const amountNumber = toCents(amount) / 100;
  const assigned =
    splitType === "exact" ? participantIds.reduce((s, id) => s + toCents(splitValues[id] ?? 0), 0) : participantIds.reduce((s, id) => s + (Number(splitValues[id]) || 0), 0);

  const reset = () => {
    setAmount("");
    setDescription("");
    setCategoryChosen(false);
    setSplitValues({});
    setErrors({});
    guessesChanged.current = 0;
    openedAt.current = Date.now();
    window.setTimeout(() => amountRef.current?.focus(), 0);
  };

  const save = async (another: boolean) => {
    if (saving) return;
    const problems: typeof errors = {};
    if (!group) problems.group = "Pick a group first.";
    if (!(toCents(amount) > 0)) problems.amount = "Add an amount.";
    if (!description.trim()) problems.description = "Say what it was for.";
    const check = checkSplit(splitType, amountNumber, splitValues, participantIds);
    if (!problems.amount && !check.ok) problems.split = check.message;
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !group || !user) {
      if (problems.split) setMoreOpen(true);
      return;
    }

    const payer = members.find((m) => m.id === payerId);
    if (!payer) return;
    setSaving(true);
    try {
      await addExpense(
        {
          description: description.trim(),
          amount: amountNumber,
          paidBy: payer,
          splitAmong: members.filter((m) => participantIds.includes(m.id)),
          groupId: group.id,
          category: category || "Other",
          date: new Date(`${date}T12:00:00`),
          splitType,
          ...splitFieldsToSave(splitType, amountNumber, splitValues, participantIds, payer.id),
        },
        user.uid
      );
      track("expense_saved", { durationMs: Date.now() - openedAt.current, guessesChanged: guessesChanged.current, source });
      localStorage.setItem(lastGroupKey(user.uid), group.id);
      const offline = !useOfflineStore.getState().isOnline;
      toast({
        title: `Added ${formatMoney(toCents(amount), currency)} to ${group.name}`,
        description: offline ? `${description.trim()}. Will sync when you're back online.` : description.trim(),
      });
      if (another) reset();
      else onClose();
    } catch {
      toast({ title: "Couldn't add the expense", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save(false);
  };
  // Shift+Enter saves and starts the next one.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      void save(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-5 max-sm:bottom-0 max-sm:top-auto max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl">Add an expense</DialogTitle>
          <DialogDescription className="sr-only">Amount, what it was for, then Enter. Tap a chip to change a guess.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="mt-4 space-y-4" noValidate>
          <div>
            <Label htmlFor="qa-amount" className="sr-only">
              Amount in {currency}
            </Label>
            <div className="flex items-baseline gap-2 border-b pb-1 focus-within:border-foreground">
              <span className="font-display text-3xl text-muted-foreground" aria-hidden="true">
                {formatMoney(0, currency).replace(/[\d.,\s]/g, "") || currency}
              </span>
              <input
                id="qa-amount"
                ref={amountRef}
                autoFocus
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "qa-amount-error" : undefined}
                className="money w-full bg-transparent font-display text-[40px] leading-tight outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            {errors.amount && (
              <p id="qa-amount-error" className="mt-1 text-sm text-destructive">
                {errors.amount}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="qa-description" className="sr-only">
              What was it for?
            </Label>
            <Input
              id="qa-description"
              placeholder="What was it for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "qa-description-error" : undefined}
            />
            {errors.description && (
              <p id="qa-description-error" className="mt-1 text-sm text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          {!description && templates.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Added often">
              {templates.map(({ expense }) => (
                <button key={expense.id} type="button" className={cn(chip, "text-muted-foreground")} onClick={() => applyTemplate(expense)}>
                  <span className="truncate">{expense.description}</span>
                  <span className="money">· {formatMoney(toCents(expense.amount), currency)}</span>
                </button>
              ))}
            </div>
          )}

          {/* The guesses, each one tap away from changing. */}
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className={chip} aria-label={`Group: ${group?.name ?? "none"}. Change`}>
                <span className="truncate">{group?.name ?? "Pick a group"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup value={groupId} onValueChange={changeGroup}>
                  {writable.map((g) => (
                    <DropdownMenuRadioItem key={g.id} value={g.id}>
                      {g.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={chip} aria-label={`${payerName}. Change who paid`}>
                {payerName}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Who paid?</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={payerId}
                  onValueChange={(id) => {
                    setPayerId(id);
                    guessesChanged.current += 1;
                  }}
                >
                  {members.map((m) => (
                    <DropdownMenuRadioItem key={m.id} value={m.id}>
                      {m.id === user?.uid ? "You" : m.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={chip} aria-label={`${splitChip}. Change how it's split`}>
                {splitChip}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={splitType}
                  onValueChange={(v) => {
                    setSplitType(v as SplitMode);
                    setSplitValues({});
                    if (v !== "equal") setMoreOpen(true);
                    guessesChanged.current += 1;
                  }}
                >
                  {(Object.keys(splitLabels) as SplitMode[]).map((mode) => (
                    <DropdownMenuRadioItem key={mode} value={mode}>
                      {splitLabels[mode]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={chip} aria-label={`Category: ${category || "none"}. Change`}>
                <span className="truncate">{category || "Category"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                <DropdownMenuRadioGroup
                  value={category}
                  onValueChange={(c) => {
                    setCategory(c);
                    setCategoryChosen(true);
                    guessesChanged.current += 1;
                  }}
                >
                  {categories.map((c) => (
                    <DropdownMenuRadioItem key={c} value={c}>
                      {c}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setManageCategories(true)}>
                  <Settings2 aria-hidden="true" />
                  Manage categories
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {errors.group && <p className="text-sm text-destructive">{errors.group}</p>}

          <div>
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              More options
              <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {moreOpen && (
              <div className="mt-3 space-y-4 rounded-xl border p-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="qa-date">Date</Label>
                  <Input
                    id="qa-date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value || today());
                      guessesChanged.current += 1;
                    }}
                  />
                </div>
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm font-medium">
                    Split between{splitType !== "equal" && ` (${splitType === "exact" ? currency : "%"})`}
                  </legend>
                  {members.map((m) => {
                    const included = participantIds.includes(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`qa-in-${m.id}`}
                          checked={included}
                          onCheckedChange={(on) => {
                            setParticipantIds((ids) => (on ? [...ids, m.id] : ids.filter((id) => id !== m.id)));
                            guessesChanged.current += 1;
                          }}
                        />
                        <Label htmlFor={`qa-in-${m.id}`} className="flex-1 font-normal">
                          {m.id === user?.uid ? "You" : m.name}
                        </Label>
                        {splitType !== "equal" && included && (
                          <Input
                            aria-label={`${m.name}'s ${splitType === "exact" ? "share" : "percentage"}`}
                            inputMode="decimal"
                            className="money h-8 w-24 text-right"
                            value={splitValues[m.id] ?? ""}
                            onChange={(e) => setSplitValues((v) => ({ ...v, [m.id]: Number(e.target.value.replace(",", ".")) || 0 }))}
                          />
                        )}
                      </div>
                    );
                  })}
                  {splitType === "exact" && amountNumber > 0 && (
                    <p className="money text-sm text-muted-foreground">
                      {toCents(amount) - assigned === 0
                        ? "Shared out exactly."
                        : toCents(amount) > assigned
                          ? `${formatMoney(toCents(amount) - assigned, currency)} still to share out`
                          : `${formatMoney(assigned - toCents(amount), currency)} more than the bill`}
                    </p>
                  )}
                  {splitType === "percentage" && <p className="money text-sm text-muted-foreground">{assigned}% of 100% shared out</p>}
                </fieldset>
              </div>
            )}
            {errors.split && <p className="mt-2 text-sm text-destructive">{errors.split}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => void save(true)} disabled={saving}>
              Add another
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </div>
          <p className="hidden text-center text-xs text-muted-foreground sm:block">Enter to add · Shift+Enter to add another</p>
        </form>
        <CategoryManagement isOpen={manageCategories} onClose={() => setManageCategories(false)} />
      </DialogContent>
    </Dialog>
  );
}
