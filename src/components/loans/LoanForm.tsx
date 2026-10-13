import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loanBalance, type Loan, type LoanDirection } from "@/lib/loans";
import { SUPPORTED_CURRENCIES, formatMoney, toCents, toCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createLoan, saveLoan } from "@/services/loans";
import { useExpenseStore } from "@/stores/expenseStore";

const CURRENCY_KEY = "splitwize:last-loan-currency";

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIsoDay = (value: string) => new Date(`${value}T12:00:00`);

const readCurrency = () => {
  try {
    return localStorage.getItem(CURRENCY_KEY);
  } catch {
    return null;
  }
};

type Errors = { person?: string; amount?: string; due?: string };

/** Add or edit a personal loan: which way, who, how much, when. Due date and a note are optional. */
export function LoanForm({ open, onOpenChange, loan }: { open: boolean; onOpenChange: (open: boolean) => void; loan?: Loan | null }) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const groups = useExpenseStore((s) => s.groups);
  const editing = !!loan;

  // People from your groups, so a typed name can link the loan to their page. A name that belongs to
  // more than one account isn't linked.
  const people = useMemo(() => {
    const ids = new Map<string, Set<string>>();
    const names = new Map<string, string>();
    for (const g of groups)
      for (const m of g.members) {
        const name = m.name?.trim();
        if (!name || m.id === user?.uid) continue;
        const key = name.toLowerCase();
        names.set(key, name);
        ids.set(key, (ids.get(key) ?? new Set<string>()).add(m.id));
      }
    const idFor = (name: string) => {
      const found = ids.get(name.trim().toLowerCase());
      return found?.size === 1 ? [...found][0] : null;
    };
    return { idFor, names: [...names.values()].sort((a, b) => a.localeCompare(b)) };
  }, [groups, user?.uid]);

  const [direction, setDirection] = useState<LoanDirection>(loan?.direction ?? "lent");
  const [person, setPerson] = useState(loan?.person ?? "");
  const [amount, setAmount] = useState(loan ? (loan.amountCents / 100).toFixed(2) : "");
  const [currency, setCurrency] = useState(loan?.currency ?? toCurrencyCode(readCurrency() ?? userProfile?.preferences?.currency));
  const [date, setDate] = useState(isoDay(loan?.date ?? new Date()));
  const [dueDate, setDueDate] = useState(loan?.dueDate ? isoDay(loan.dueDate) : "");
  const [note, setNote] = useState(loan?.note ?? "");
  const [more, setMore] = useState(!!(loan?.dueDate || loan?.note));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const repaid = loan ? loanBalance(loan).repaidCents : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    const cents = toCents(amount);
    const problems: Errors = {};
    if (!person.trim()) problems.person = direction === "lent" ? "Who did you lend it to?" : "Who did you borrow it from?";
    if (!(cents > 0)) problems.amount = "Add an amount.";
    else if (cents < repaid) problems.amount = `${formatMoney(repaid, currency)} has already been paid back, so it can't be less.`;
    if (dueDate && dueDate < date) problems.due = "The due date is before the loan date.";
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const data = {
      direction,
      person: person.trim(),
      personId: people.idFor(person),
      amountCents: cents,
      currency,
      date: fromIsoDay(date),
      dueDate: dueDate ? fromIsoDay(dueDate) : null,
      note: note.trim(),
      repayments: loan?.repayments ?? [],
    };
    setSaving(true);
    try {
      if (loan) await saveLoan(user.uid, loan.id, data);
      else await createLoan(user.uid, data);
      try {
        localStorage.setItem(CURRENCY_KEY, currency);
      } catch {
        /* only a convenience */
      }
      const money = formatMoney(cents, currency);
      toast({
        title: editing ? "Loan saved" : direction === "lent" ? `${data.person} owes you ${money}` : `You owe ${data.person} ${money}`,
        description: editing ? undefined : "Added to your loans.",
      });
      onOpenChange(false);
    } catch {
      toast({ title: "Couldn't save the loan", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const clear = (key: keyof Errors) => setErrors((er) => ({ ...er, [key]: undefined }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit loan" : "Add a loan"}</DialogTitle>
          <DialogDescription>Only you can see your loans.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex gap-2" role="radiogroup" aria-label="Which way">
            {(["lent", "borrowed"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={direction === d}
                onClick={() => {
                  setDirection(d);
                  clear("person");
                }}
                className={cn(
                  "h-11 flex-1 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  direction === d ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"
                )}
              >
                {d === "lent" ? "I lent" : "I borrowed"}
              </button>
            ))}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="loan-person">{direction === "lent" ? "To" : "From"}</Label>
            <Input
              id="loan-person"
              value={person}
              onChange={(e) => {
                setPerson(e.target.value);
                clear("person");
              }}
              list="loan-people"
              placeholder="Name"
              autoComplete="off"
              maxLength={80}
              aria-invalid={!!errors.person}
              aria-describedby={errors.person ? "loan-person-error" : undefined}
            />
            <datalist id="loan-people">
              {people.names.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {errors.person && (
              <p id="loan-person-error" className="text-sm text-destructive">
                {errors.person}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_8.5rem] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="loan-amount">Amount</Label>
              <Input
                id="loan-amount"
                inputMode="decimal"
                className="money"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^\d.,]/g, "").replace(",", "."));
                  clear("amount");
                }}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "loan-amount-error" : undefined}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="loan-currency">Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger id="loan-currency">
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
            {errors.amount && (
              <p id="loan-amount-error" className="col-span-2 -mt-2 text-sm text-destructive">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="loan-date">Date</Label>
            <Input id="loan-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>

          {more ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="loan-due">Due back by (optional)</Label>
                <Input
                  id="loan-due"
                  type="date"
                  value={dueDate}
                  min={date}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    clear("due");
                  }}
                  aria-invalid={!!errors.due}
                  aria-describedby={errors.due ? "loan-due-error" : undefined}
                />
                {errors.due && (
                  <p id="loan-due-error" className="text-sm text-destructive">
                    {errors.due}
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="loan-note">Note (optional)</Label>
                <Textarea id="loan-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. for the rent deposit" />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="justify-self-start rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Add a due date or note
            </button>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add loan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
