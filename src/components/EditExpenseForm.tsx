import React, { useMemo, useState } from 'react';
import { checkSplit, formatMoney, splitFieldsToSave, toCents, toCurrencyCode } from '@/lib/money';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenseStore, Expense } from '@/stores/expenseStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useOfflineStore } from '@/stores/offlineStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CategoryManagement } from '@/components/CategoryManagement';
import { cn } from '@/lib/utils';

interface EditExpenseFormProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
}

type SplitType = 'equal' | 'exact' | 'percentage';
type Errors = { amount?: string; description?: string; split?: string };

const splitLabels: Record<SplitType, string> = { equal: 'Equally', exact: 'Exact amounts', percentage: 'Percentages' };

const isoDay = (value: Date | string) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Edit an expense. Problems show under the field they're about; nothing typed is lost. */
export const EditExpenseForm: React.FC<EditExpenseFormProps> = ({ expense, isOpen, onClose }) => {
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const groups = useExpenseStore((s) => s.groups);
  const getAllAvailableCategories = useCategoryStore((s) => s.getAllAvailableCategories);
  const { user } = useAuth();
  const { toast } = useToast();

  const group = groups.find((g) => g.id === expense.groupId);
  const currency = toCurrencyCode(group?.settings?.currency);
  const members = group?.members ?? [];
  const splitAmong = expense.splitAmong?.length ? expense.splitAmong : members;
  const categories = useMemo(
    () => [...new Set([...(user ? getAllAvailableCategories(user.uid) : []), expense.category].filter(Boolean))],
    [user, getAllAvailableCategories, expense.category]
  );

  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));
  // A payer whose name was claimed later shows as the person who claimed it.
  const [paidBy, setPaidBy] = useState(group?.aliases?.[expense.paidBy?.id ?? ''] ?? expense.paidBy?.id ?? '');
  const [category, setCategory] = useState(expense.category || 'Other');
  const [date, setDate] = useState(isoDay(expense.date));
  const [splitType, setSplitType] = useState<SplitType>((expense.splitType as SplitType) || 'equal');
  // Percent splits saved since splitVersion 2 keep the percentages separately from the amounts.
  const [splitData, setSplitData] = useState<Record<string, number>>(
    () => (expense.splitType === 'percentage' && expense.splitPercentages ? expense.splitPercentages : expense.splitData) || {}
  );
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [manageCategories, setManageCategories] = useState(false);

  const nameOf = (id: string, name: string) => {
    const realId = group?.aliases?.[id] ?? id;
    return realId === user?.uid ? 'You' : members.find((m) => m.id === realId)?.name ?? name;
  };
  const amountCents = toCents(amount);
  const assigned =
    splitType === 'percentage'
      ? splitAmong.reduce((sum, m) => sum + (Number(splitData[m.id]) || 0), 0)
      : splitAmong.reduce((sum, m) => sum + toCents(splitData[m.id] ?? 0), 0);
  const leftText =
    splitType === 'percentage'
      ? assigned === 100
        ? 'Shared out exactly.'
        : assigned < 100
          ? `${Number((100 - assigned).toFixed(2))}% still to share out`
          : `${Number((assigned - 100).toFixed(2))}% too much`
      : assigned === amountCents
        ? 'Shared out exactly.'
        : assigned < amountCents
          ? `${formatMoney(amountCents - assigned, currency)} still to share out`
          : `${formatMoney(assigned - amountCents, currency)} more than the bill`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !group) return;
    const payer = members.find((m) => m.id === paidBy) ?? expense.paidBy;
    const value = amountCents / 100;
    const participantIds = splitAmong.map((m) => m.id);
    const problems: Errors = {};
    if (!(amountCents > 0)) problems.amount = 'Add an amount.';
    if (!description.trim()) problems.description = 'Say what it was for.';
    const check = checkSplit(splitType, value, splitData, participantIds);
    if (!problems.amount && !check.ok) problems.split = check.message;
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const split = splitFieldsToSave(splitType, value, splitData, participantIds, payer.id);
    setSaving(true);
    try {
      await updateExpense(expense.id, {
        description: description.trim(),
        amount: value,
        paidBy: payer,
        category,
        date: new Date(`${date}T12:00:00`),
        splitType,
        // undefined removes a field, so switching back to "equal" clears old split details
        splitData: split.splitData,
        splitPercentages: split.splitPercentages,
        splitVersion: split.splitVersion,
      });
      const offline = !useOfflineStore.getState().isOnline;
      toast({
        title: `Saved "${description.trim()}"`,
        description: offline ? "Will sync when you're back online." : undefined,
      });
      onClose();
    } catch {
      toast({ title: "Couldn't save your changes", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Edit expense</DialogTitle>
          <DialogDescription>{group ? `In ${group.name}` : 'Change what was spent and how it is split.'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-description">What was it for?</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((er) => ({ ...er, description: undefined }));
                }}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'edit-description-error' : undefined}
              />
              {errors.description && (
                <p id="edit-description-error" className="text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-amount">Amount ({currency})</Label>
              <Input
                id="edit-amount"
                inputMode="decimal"
                className="money"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'));
                  setErrors((er) => ({ ...er, amount: undefined }));
                }}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? 'edit-amount-error' : undefined}
              />
              {errors.amount && (
                <p id="edit-amount-error" className="text-sm text-destructive">
                  {errors.amount}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-paid-by">Paid by</Label>
              <Select value={paidBy} onValueChange={(v) => v && setPaidBy(v)}>
                <SelectTrigger id="edit-paid-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {nameOf(m.id, m.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-category">Category</Label>
                <button
                  type="button"
                  onClick={() => setManageCategories(true)}
                  className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Manage
                </button>
              </div>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-date">Date</Label>
            <Input id="edit-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Split</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How to split">
              {(Object.keys(splitLabels) as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={splitType === type}
                  onClick={() => {
                    setSplitType(type);
                    setErrors((er) => ({ ...er, split: undefined }));
                  }}
                  className={cn(
                    'h-8 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    splitType === type ? 'border-foreground bg-foreground text-background' : 'hover:bg-secondary'
                  )}
                >
                  {splitLabels[type]}
                </button>
              ))}
            </div>

            {splitType === 'equal' ? (
              <p className="text-sm text-muted-foreground">
                Between {splitAmong.map((m) => nameOf(m.id, m.name.trim().split(/\s+/)[0] || m.name)).join(', ')}.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                {splitAmong.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3">
                    <Label htmlFor={`edit-split-${m.id}`} className="min-w-0 truncate font-normal">
                      {nameOf(m.id, m.name)}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`edit-split-${m.id}`}
                        inputMode="decimal"
                        className="money h-8 w-24 text-right"
                        value={splitData[m.id] ?? ''}
                        onChange={(e) => {
                          setSplitData((v) => ({ ...v, [m.id]: Number(e.target.value.replace(',', '.')) || 0 }));
                          setErrors((er) => ({ ...er, split: undefined }));
                        }}
                      />
                      <span className="w-8 text-sm text-muted-foreground">{splitType === 'percentage' ? '%' : currency}</span>
                    </div>
                  </div>
                ))}
                {amountCents > 0 && <p className="money pt-1 text-sm text-muted-foreground">{leftText}</p>}
              </div>
            )}
            {errors.split && <p className="text-sm text-destructive">{errors.split}</p>}
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
      <CategoryManagement isOpen={manageCategories} onClose={() => setManageCategories(false)} />
    </Dialog>
  );
};
