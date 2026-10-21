import React, { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExpenseStore, type Member } from '@/stores/expenseStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatMoney, toCents, toCurrencyCode } from '@/lib/money';
import { doneWithUndo } from '@/lib/undo';
import { track } from '@/lib/usage';
import { cn } from '@/lib/utils';
import { lastMethod, methodsFor, rememberMethod } from '@/lib/paymentMethods';
import { formatCalendarDate } from '@/lib/dates';
import { REMINDER_GAP_DAYS, lastReminder, sendReminder } from '@/services/reminders';

interface SettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fromMember: Member;
  toMember: Member;
  amount: number;
  currency?: string;
  groupId: string;
}

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "Mark as paid": the full amount and your usual method are filled in, so it's one more tap. */
export const SettlementDialog: React.FC<SettlementDialogProps> = ({ isOpen, onClose, fromMember, toMember, amount, currency = 'USD', groupId }) => {
  const addSettlement = useExpenseStore((s) => s.addSettlement);
  const removeSettlement = useExpenseStore((s) => s.removeSettlement);
  const { user } = useAuth();
  const { toast } = useToast();
  const code = toCurrencyCode(currency);
  const owed = toCents(amount);
  const [paid, setPaid] = useState((owed / 100).toFixed(2));
  // bKash and Nagad for taka, Venmo and Zelle for dollars, and so on; the last one used comes first.
  const methods = methodsFor(code);
  const [method, setMethod] = useState(() => lastMethod(code));
  const [noteOpen, setNoteOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Polite reminders: when you're the one owed, you can remind them once a week (see reminders.ts).
  const group = useExpenseStore((s) => s.groups.find((g) => g.id === groupId));
  const debtorHasAccount = !!group?.members.find((m) => m.id === fromMember.id && !m.isTemporary);
  const canRemind = !!user && toMember.id === user.uid && debtorHasAccount;
  const [reminded, setReminded] = useState<Date | null>(null);
  const [reminding, setReminding] = useState(false);
  useEffect(() => {
    if (isOpen && canRemind && user) void lastReminder(groupId, user.uid, fromMember.id).then(setReminded);
  }, [isOpen, canRemind, user, groupId, fromMember.id]);
  const nextReminder = reminded ? addDays(reminded, REMINDER_GAP_DAYS) : null;
  const remindLater = !!nextReminder && nextReminder > new Date();

  const remind = async () => {
    if (!user || !group || reminding) return;
    setReminding(true);
    const me = first(group.members.find((m) => m.id === user.uid)?.name ?? 'Someone');
    try {
      await sendReminder({
        groupId,
        from: user.uid,
        to: fromMember.id,
        title: `Reminder from ${me}`,
        message: `You owe ${me} ${formatMoney(owed, code)} in ${group.name}. Tap to settle up.`,
      });
      setReminded(new Date());
      toast({ title: `Reminder sent to ${first(fromMember.name)}`, description: `You can send another in ${REMINDER_GAP_DAYS} days.` });
    } catch {
      toast({ title: "Couldn't send the reminder", description: 'You can send one a week. Please try again later.', variant: 'destructive' });
    } finally {
      setReminding(false);
    }
  };

  const who = (m: Member) => (m.id === user?.uid ? 'you' : first(m.name));
  const sentence = `${who(fromMember) === 'you' ? 'You' : who(fromMember)} paid ${who(toMember)}`;

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    const cents = toCents(paid);
    if (cents <= 0) return setError('Enter the amount that was paid.');
    if (cents > owed) return setError(`That's more than the ${formatMoney(owed, code)} owed.`);
    setSaving(true);
    try {
      const created = await addSettlement(
        { fromMemberId: fromMember.id, toMemberId: toMember.id, amount: cents / 100, paymentMethod: method, notes, referenceId: uuidv4(), date: new Date() },
        groupId,
        user.uid
      );
      rememberMethod(code, method);
      track('payment_confirmed', { source: cents < owed ? 'partial' : 'full' });
      onClose();
      doneWithUndo({
        title: 'Marked as paid',
        description: `${sentence} ${formatMoney(cents, code)}.`,
        undo: () => removeSettlement(created.id, { undo: true }),
      });
    } catch {
      toast({ title: "Couldn't record the payment", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-sm:bottom-0 max-sm:top-auto max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl sm:max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl">Mark as paid</DialogTitle>
          <DialogDescription>
            {sentence} <span className="money font-medium text-foreground">{formatMoney(owed, code)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={confirm} className="space-y-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="paid-amount">Amount paid ({code})</Label>
            <Input
              id="paid-amount"
              inputMode="decimal"
              className="money"
              value={paid}
              onChange={(e) => {
                setPaid(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'));
                setError('');
              }}
              aria-invalid={!!error}
              aria-describedby={error ? 'paid-error' : 'paid-hint'}
            />
            {error ? (
              <p id="paid-error" className="text-sm text-destructive">
                {error}
              </p>
            ) : (
              <p id="paid-hint" className="text-xs text-muted-foreground">
                Change it for a part payment.
              </p>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">How</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
              {methods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={method === m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    'h-8 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    method === m.value ? 'border-foreground bg-foreground text-background' : 'hover:bg-secondary'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>
          {noteOpen ? (
            <div className="grid gap-1.5">
              <Label htmlFor="paid-notes">Note</Label>
              <Textarea id="paid-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. bank reference" />
            </div>
          ) : (
            <button type="button" onClick={() => setNoteOpen(true)} className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Add a note
            </button>
          )}
          {canRemind && (
            <p className="border-t pt-3 text-sm text-muted-foreground">
              {remindLater ? (
                <>
                  You reminded {first(fromMember.name)} on {formatCalendarDate(reminded)}. You can send another from{' '}
                  {formatCalendarDate(nextReminder)}.
                </>
              ) : (
                <>
                  Not paid yet?{' '}
                  <button
                    type="button"
                    onClick={() => void remind()}
                    disabled={reminding}
                    className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    {reminding ? 'Sending…' : `Send ${first(fromMember.name)} a reminder`}
                  </button>
                </>
              )}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Confirm payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
