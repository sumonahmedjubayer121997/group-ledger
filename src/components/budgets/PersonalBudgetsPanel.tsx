import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { deferWithUndo, useHidden } from "@/lib/undo";
import { useToast } from "@/hooks/use-toast";
import { useBudgetStore, type Budget } from "@/stores/budgetStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { useCurrencyOf } from "@/stores/useLedger";
import { SUPPORTED_CURRENCIES, expenseShares, makeResolver, toCurrencyCode } from "@/lib/money";
import { toDate } from "@/lib/dates";
import { BudgetCard } from "./BudgetCard";

type Period = Budget["period"];

const periodStart = (period: Period, now = new Date()) => {
  if (period === "weekly") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d;
  }
  if (period === "yearly") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const emptyForm = { name: "", limit: "", currency: "", period: "monthly" as Period, alertThreshold: "80" };

/** Your own spending limits: each counts your share of expenses in one currency. */
export function PersonalBudgetsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const budgets = useBudgetStore((s) => s.budgets);
  const addBudget = useBudgetStore((s) => s.addBudget);
  const updateBudget = useBudgetStore((s) => s.updateBudget);
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const groups = useExpenseStore((s) => s.groups);
  const expenses = useExpenseStore((s) => s.expenses);
  const currencyOf = useCurrencyOf();

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [open, setOpen] = useState(false);
  const hidden = useHidden((s) => s.hidden);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; limit?: string }>({});

  const mine = budgets.filter((b) => b.type === "individual" && b.isActive && (!b.userId || b.userId === user?.uid) && !hidden.has(`budget-${b.id}`));

  // Older budgets have no currency: use the one most of your expenses are in.
  const mainCurrency = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) counts.set(currencyOf(e.groupId), (counts.get(currencyOf(e.groupId)) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  }, [expenses, currencyOf]);

  const spentFor = useMemo(() => {
    const resolvers = new Map(groups.map((g) => [g.id, makeResolver(g.members)]));
    return (budget: Budget) => {
      const currency = toCurrencyCode(budget.currency || mainCurrency);
      const start = periodStart(budget.period);
      let cents = 0;
      for (const e of expenses) {
        if (currencyOf(e.groupId) !== currency) continue;
        const date = toDate(e.date);
        if (!date || date < start) continue;
        const resolve = resolvers.get(e.groupId);
        if (!resolve || !user) continue;
        const me = resolve({ id: user.uid, email: user.email });
        cents += (me && expenseShares(e, resolve).get(me)) || 0;
      }
      return cents;
    };
  }, [groups, expenses, currencyOf, mainCurrency, user]);

  const startNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, currency: mainCurrency });
    setErrors({});
    setOpen(true);
  };
  const startEdit = (budget: Budget) => {
    setEditing(budget);
    setForm({
      name: budget.name,
      limit: String(budget.limit),
      currency: toCurrencyCode(budget.currency || mainCurrency),
      period: budget.period,
      alertThreshold: String(budget.alertThreshold ?? 80),
    });
    setErrors({});
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(form.limit.replace(",", "."));
    const problems: typeof errors = {};
    if (!form.name.trim()) problems.name = "Give the budget a name.";
    if (!(limit > 0)) problems.limit = "Set a limit above zero.";
    setErrors(problems);
    if (problems.name || problems.limit || !user || saving) return;
    const data = {
      name: form.name.trim(),
      type: "individual" as const,
      userId: user.uid,
      limit,
      currency: form.currency,
      period: form.period,
      alertThreshold: Math.min(100, Math.max(1, parseInt(form.alertThreshold, 10) || 80)),
      isActive: true,
    };
    setSaving(true);
    try {
      if (editing) await updateBudget(editing.id, data, user.uid);
      else await addBudget(data, user.uid);
      toast({ title: editing ? `Saved "${data.name}"` : `Added the "${data.name}" budget` });
      setOpen(false);
    } catch {
      toast({ title: "Couldn't save the budget", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /** Gone at once, with Undo; the real delete happens 8 seconds later. */
  const remove = (budget: Budget) =>
    deferWithUndo({
      id: `budget-${budget.id}`,
      title: `Deleted the "${budget.name}" budget`,
      description: "Your expenses aren't affected.",
      run: () => deleteBudget(budget.id, user?.uid || ""),
    });

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Personal budgets count your share of expenses in every group that uses the budget's currency.
      </p>
      {mine.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">You haven't set any personal budgets.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {mine.map((budget) => {
            const currency = toCurrencyCode(budget.currency || mainCurrency);
            return (
              <BudgetCard
                key={budget.id}
                budget={budget}
                spentCents={spentFor(budget)}
                currency={currency}
                detail={`Your share in ${currency} groups · ${budget.period}`}
                onEdit={() => startEdit(budget)}
                onDelete={() => remove(budget)}
              />
            );
          })}
        </ul>
      )}
      <Button variant="outline" size="sm" className="mt-4" onClick={startNew}>
        <Plus aria-hidden="true" />
        Add personal budget
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit personal budget" : "New personal budget"}</DialogTitle>
            <DialogDescription>Set a limit for your own share of shared spending.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="pb-name">Name</Label>
              <Input
                id="pb-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrors((er) => ({ ...er, name: undefined }));
                }}
                placeholder="e.g. Eating out"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "pb-name-error" : undefined}
              />
              {errors.name && (
                <p id="pb-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pb-limit">Limit</Label>
                <Input
                  id="pb-limit"
                  inputMode="decimal"
                  className="money"
                  value={form.limit}
                  onChange={(e) => {
                    setForm({ ...form, limit: e.target.value.replace(/[^\d.,]/g, "") });
                    setErrors((er) => ({ ...er, limit: undefined }));
                  }}
                  aria-invalid={!!errors.limit}
                  aria-describedby={errors.limit ? "pb-limit-error" : undefined}
                />
                {errors.limit && (
                  <p id="pb-limit-error" className="text-sm text-destructive">
                    {errors.limit}
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pb-currency">Currency</Label>
                <Select value={form.currency} onValueChange={(currency) => setForm({ ...form, currency })}>
                  <SelectTrigger id="pb-currency">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pb-period">Period</Label>
                <Select value={form.period} onValueChange={(period) => setForm({ ...form, period: period as Period })}>
                  <SelectTrigger id="pb-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly (last 7 days)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pb-alert">Warn at (%)</Label>
                <Input id="pb-alert" inputMode="numeric" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
