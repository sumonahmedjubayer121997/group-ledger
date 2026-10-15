import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loanBalance, type Loan } from "@/lib/loans";
import { formatMoney, toCents } from "@/lib/money";
import { doneWithUndo } from "@/lib/undo";
import { saveLoan } from "@/services/loans";

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Rahim paid you back" / "You paid Anik back": the whole amount is filled in; change it for part of it. */
export function RepaymentDialog({ loan, open, onOpenChange }: { loan: Loan; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { remainingCents } = loanBalance(loan);
  const [amount, setAmount] = useState((remainingCents / 100).toFixed(2));
  const [date, setDate] = useState(isoDay(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lent = loan.direction === "lent";
  const sentence = lent ? `${loan.person} paid you back` : `You paid ${loan.person} back`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    const cents = toCents(amount);
    if (!(cents > 0)) return setError("Enter the amount paid back.");
    if (cents > remainingCents) return setError(`That's more than the ${formatMoney(remainingCents, loan.currency)} still owed.`);
    const before = loan.repayments;
    const { id, ...rest } = loan;
    setSaving(true);
    try {
      await saveLoan(user.uid, id, {
        ...rest,
        repayments: [...before, { id: crypto.randomUUID(), amountCents: cents, date: new Date(`${date}T12:00:00`), note: note.trim() }],
      });
      onOpenChange(false);
      const left = remainingCents - cents;
      doneWithUndo({
        title: `${sentence} ${formatMoney(cents, loan.currency)}`,
        description: left === 0 ? "All paid back." : `${formatMoney(left, loan.currency)} still to go.`,
        undo: () => saveLoan(user.uid, id, { ...rest, repayments: before }),
      });
    } catch {
      toast({ title: "Couldn't record that", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Paid back</DialogTitle>
          <DialogDescription>
            {sentence}. <span className="money font-medium text-foreground">{formatMoney(remainingCents, loan.currency)}</span> is still owed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="repay-amount">Amount ({loan.currency})</Label>
            <Input
              id="repay-amount"
              inputMode="decimal"
              className="money"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."));
                setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "repay-error" : "repay-hint"}
            />
            {error ? (
              <p id="repay-error" className="text-sm text-destructive">
                {error}
              </p>
            ) : (
              <p id="repay-hint" className="text-xs text-muted-foreground">
                Change it for part of the amount.
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="repay-date">Date</Label>
            <Input id="repay-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="repay-note">Note (optional)</Label>
            <Input id="repay-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. bank transfer" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record it"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
