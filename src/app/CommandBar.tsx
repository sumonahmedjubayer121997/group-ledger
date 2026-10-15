import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, HandCoins, Home, Keyboard, MonitorDown, Plus, QrCode, Receipt, User, UserPlus, Users, Wallet } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { useCurrencyOf, useUserBalances, type DebtView } from "@/stores/useLedger";
import { formatAmount, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { track } from "@/lib/usage";
import { useAppActions } from "./appActions";

const pages = [
  { label: "Overview", to: "/", icon: Home, keys: "G H" },
  { label: "Expenses", to: "/expenses", icon: Receipt, keys: "G E" },
  { label: "Loans", to: "/personal", icon: Banknote, keys: "G L" },
  { label: "My budgets", to: "/personal?tab=budgets", icon: Wallet, keys: "G B" },
  { label: "Profile and settings", to: "/profile", icon: User, keys: "G P" },
];

const includes = (text: string | undefined, term: string) => !!text && text.toLowerCase().includes(term);
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

type Action = { id: string; label: string; detail?: string; keys?: string; icon: typeof Plus; run: () => void };

/** Ctrl+K / ⌘K or /: find any expense, group or person, run an action, or jump to a page. */
export function CommandBar({
  open,
  onOpenChange,
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAddExpense, openNewGroup, openJoinGroup, openSettle, installState, openInstall } = useAppActions();
  const groups = useExpenseStore((s) => s.groups);
  const expenses = useExpenseStore((s) => s.expenses);
  const currencyOf = useCurrencyOf();
  const balances = useUserBalances(user?.uid);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    track("command_bar_opened");
  }, [open]);

  const term = q.trim().toLowerCase();
  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  // Run once the bar has closed, so the next dialog gets focus.
  const run = (fn: () => void) => () => {
    onOpenChange(false);
    window.setTimeout(fn, 0);
  };
  const go = (to: string) => run(() => navigate(to));

  const actions = useMemo<Action[]>(() => {
    const settle = (d: DebtView): Action => {
      const youOwe = d.from === user?.uid;
      const other = first(youOwe ? d.toPerson.name : d.fromPerson.name);
      const amount = formatMoney(d.cents, d.currency);
      return {
        id: `settle-${d.groupId}-${d.from}-${d.to}`,
        label: youOwe ? `Mark as paid: you owe ${other} ${amount}` : `Mark as paid: ${other} owes you ${amount}`,
        detail: d.groupName,
        icon: HandCoins,
        run: () => openSettle(d),
      };
    };
    const writable = groups.filter(
      (g) => !g.isArchived && ["admin", "member"].includes(g.members.find((m) => m.id === user?.uid)?.role ?? "")
    );
    return [
      { id: "add", label: "Add expense", keys: "N", icon: Plus, run: () => openAddExpense(undefined, "command-bar") },
      { id: "group", label: "New group", icon: Users, run: openNewGroup },
      { id: "join", label: "Join a group (scan a QR code or paste a link)", icon: QrCode, run: openJoinGroup },
      { id: "loan", label: "Add a loan (lent or borrowed)", icon: Banknote, run: () => navigate("/personal?add=loan") },
      ...balances.debts.filter((d) => !d.fromPerson.isFormer && !d.toPerson.isFormer).map(settle),
      ...writable.map((g) => ({
        id: `invite-${g.id}`,
        label: `Invite people to ${g.name}`,
        icon: UserPlus,
        run: () => navigate(`/groups/${g.id}?invite=1`),
      })),
      { id: "keys", label: "Keyboard shortcuts", keys: "?", icon: Keyboard, run: onShowShortcuts },
      ...(installState === "prompt" || installState === "ios"
        ? [{ id: "install", label: "Install the app on this device", icon: MonitorDown, run: openInstall }]
        : []),
    ];
  }, [groups, balances.debts, user?.uid, openAddExpense, openNewGroup, openJoinGroup, openSettle, navigate, onShowShortcuts, installState, openInstall]);

  const results = useMemo(() => {
    // With nothing typed: add, new group and what you can settle. Typing finds the rest ("invite", "settle", a name…).
    const matchedActions = term
      ? actions.filter((a) => includes(a.label, term) || includes(a.detail, term) || ("settle up".includes(term) && a.id.startsWith("settle")))
      : actions.filter((a) => !a.id.startsWith("invite") && a.id !== "keys").slice(0, 5);
    const matchedGroups = groups.filter((g) => !term || includes(g.name, term)).slice(0, term ? 5 : 4);
    // Each person once, with the groups you share, so two people with the same name can be told apart.
    const people = new Map<string, { id: string; name: string; groups: string[] }>();
    for (const g of groups)
      for (const m of g.members)
        if (m.id !== user?.uid && (!term || includes(m.name, term) || includes(m.email, term))) {
          const entry = people.get(m.id) ?? { id: m.id, name: m.name, groups: [] };
          entry.groups.push(g.name);
          people.set(m.id, entry);
        }
    const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const matchedExpenses = term
      ? sorted.filter((e) => includes(e.description, term) || includes(e.category, term) || includes(e.paidBy?.name, term)).slice(0, 8)
      : sorted.slice(0, 4);
    const matchedPages = pages.filter((p) => !term || includes(p.label, term));
    return { actions: matchedActions, groups: matchedGroups, people: [...people.values()].slice(0, 5), expenses: matchedExpenses, pages: matchedPages };
  }, [actions, groups, expenses, term, user?.uid]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl max-sm:bottom-auto max-sm:top-3 max-sm:w-[calc(100%-1.5rem)] max-sm:rounded-xl max-sm:pb-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search SplitWize</DialogTitle>
        <Command
          shouldFilter={false}
          label="Search SplitWize"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:gap-3 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5"
        >
          <CommandInput value={q} onValueChange={setQ} placeholder="Search, or type an action like “settle”" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>Nothing matches "{q}".</CommandEmpty>

            {results.actions.length > 0 && (
              <CommandGroup heading="Actions">
                {results.actions.map((a) => (
                  <CommandItem key={a.id} value={a.id} onSelect={run(a.run)}>
                    <a.icon className="text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    {a.detail && <span className="shrink-0 text-xs text-muted-foreground">{a.detail}</span>}
                    {a.keys && <CommandShortcut>{a.keys}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.expenses.length > 0 && (
              <CommandGroup heading={term ? "Expenses" : "Recent expenses"}>
                {results.expenses.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`expense-${e.id}`}
                    onSelect={go(`/expenses?q=${encodeURIComponent(e.description)}&group=${e.groupId}`)}
                  >
                    <Receipt className="text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{e.description || "Expense"}</span>
                    <span className="money shrink-0 text-xs text-muted-foreground">
                      {groupName.get(e.groupId)} · {formatDate(e.date)} · {formatAmount(e.amount, currencyOf(e.groupId))}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.groups.length > 0 && (
              <CommandGroup heading="Groups">
                {results.groups.map((g) => (
                  <CommandItem key={g.id} value={`group-${g.id}`} onSelect={go(`/groups/${g.id}`)}>
                    <Users className="text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 truncate">{g.name}</span>
                    {g.isArchived && <span className="text-xs text-muted-foreground">archived</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.people.length > 0 && (
              <CommandGroup heading="People">
                {results.people.map((p) => (
                  <CommandItem key={p.id} value={`person-${p.id}`} onSelect={go(`/people/${p.id}`)}>
                    <User className="text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">{p.groups.join(", ")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.pages.length > 0 && (
              <CommandGroup heading="Go to">
                {results.pages.map((p) => (
                  <CommandItem key={p.to} value={`page-${p.to}`} onSelect={go(p.to)}>
                    <p.icon className="text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1">{p.label}</span>
                    <CommandShortcut>{p.keys}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
