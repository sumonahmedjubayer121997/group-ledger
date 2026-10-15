import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QuickAdd, type QuickAddPrefill } from "@/components/QuickAdd";
import { GroupForm } from "@/components/GroupForm";
import { JoinGroupDialog } from "@/components/JoinGroupDialog";
import { InstallAppDialog } from "@/components/InstallAppDialog";
import { promptInstall, useInstallState, type InstallState } from "@/lib/install";
import { SettlementDialog } from "@/components/SettlementDialog";
import type { DebtView } from "@/stores/useLedger";

type AppActions = {
  /** Opens quick add, pre-selecting `groupId` (or the group page you're on); `prefill` repeats an expense. */
  openAddExpense: (groupId?: string, source?: string, prefill?: QuickAddPrefill) => void;
  openNewGroup: () => void;
  /** Scan a group's QR code or paste its invite link. */
  openJoinGroup: () => void;
  /** "prompt" or "ios" when the app can be installed from here. */
  installState: InstallState;
  openInstall: () => void;
  /** "Mark as paid" for one debt, from a balance list, a person's page or the command bar. */
  openSettle: (debt: DebtView) => void;
  setCurrentGroup: (groupId: string | null) => void;
};

const AppActionsContext = createContext<AppActions | null>(null);

/** The app-wide "Add expense", "New group", "Join a group" and "Mark as paid" dialogs, reachable from anywhere. */
export function AppActionsProvider({ children }: { children: ReactNode }) {
  const [expense, setExpense] = useState<{ open: boolean; groupId?: string; source?: string; prefill?: QuickAddPrefill; n: number }>({
    open: false,
    n: 0,
  });
  const [groupOpen, setGroupOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const installState = useInstallState();
  const [settling, setSettling] = useState<DebtView | null>(null);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);

  const value = useMemo<AppActions>(
    () => ({
      openAddExpense: (groupId, source, prefill) =>
        setExpense((prev) => ({ open: true, groupId: groupId ?? currentGroup ?? undefined, source, prefill, n: prev.n + 1 })),
      openNewGroup: () => setGroupOpen(true),
      openJoinGroup: () => setJoinOpen(true),
      installState,
      openInstall: () => (installState === "ios" ? setIosInstallOpen(true) : void promptInstall()),
      openSettle: setSettling,
      setCurrentGroup,
    }),
    [currentGroup, installState]
  );

  return (
    <AppActionsContext.Provider value={value}>
      {children}
      {/* A fresh form each time it opens, so nothing from the last expense lingers. */}
      {expense.open && (
        <QuickAdd
          key={expense.n}
          isOpen={expense.open}
          defaultGroupId={expense.groupId}
          source={expense.source}
          prefill={expense.prefill}
          onClose={() => setExpense((prev) => ({ ...prev, open: false }))}
        />
      )}
      <GroupForm isOpen={groupOpen} onClose={() => setGroupOpen(false)} />
      <JoinGroupDialog open={joinOpen} onOpenChange={setJoinOpen} />
      <InstallAppDialog open={iosInstallOpen} onOpenChange={setIosInstallOpen} />
      {settling && (
        <SettlementDialog
          key={`${settling.groupId}-${settling.from}-${settling.to}`}
          isOpen
          onClose={() => setSettling(null)}
          fromMember={{ id: settling.from, userId: settling.from, name: settling.fromPerson.name, email: settling.fromPerson.email ?? "" }}
          toMember={{ id: settling.to, userId: settling.to, name: settling.toPerson.name, email: settling.toPerson.email ?? "" }}
          amount={settling.cents / 100}
          currency={settling.currency}
          groupId={settling.groupId}
        />
      )}
    </AppActionsContext.Provider>
  );
}

export function useAppActions() {
  const actions = useContext(AppActionsContext);
  if (!actions) throw new Error("useAppActions must be used inside AppActionsProvider");
  return actions;
}

/** While a group page is open, "Add expense" anywhere defaults to that group. */
export function useCurrentGroup(groupId: string | undefined) {
  const { setCurrentGroup } = useAppActions();
  useEffect(() => {
    setCurrentGroup(groupId ?? null);
    return () => setCurrentGroup(null);
  }, [groupId, setCurrentGroup]);
}
