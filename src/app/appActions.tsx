import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { GroupForm } from "@/components/GroupForm";

type AppActions = {
  /** Opens "Add expense", pre-selecting `groupId` (or the group page you're on). */
  openAddExpense: (groupId?: string) => void;
  openNewGroup: () => void;
  setCurrentGroup: (groupId: string | null) => void;
};

const AppActionsContext = createContext<AppActions | null>(null);

/** The app-wide "Add expense" and "New group" dialogs, reachable from the header, bottom bar and pages. */
export function AppActionsProvider({ children }: { children: ReactNode }) {
  const [expense, setExpense] = useState<{ open: boolean; groupId?: string; n: number }>({ open: false, n: 0 });
  const [groupOpen, setGroupOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);

  const value = useMemo<AppActions>(
    () => ({
      openAddExpense: (groupId) =>
        setExpense((prev) => ({ open: true, groupId: groupId ?? currentGroup ?? undefined, n: prev.n + 1 })),
      openNewGroup: () => setGroupOpen(true),
      setCurrentGroup,
    }),
    [currentGroup]
  );

  return (
    <AppActionsContext.Provider value={value}>
      {children}
      {/* A fresh form each time it opens, so nothing from the last expense lingers. */}
      <ExpenseForm
        key={expense.n}
        isOpen={expense.open}
        defaultGroupId={expense.groupId}
        onClose={() => setExpense((prev) => ({ ...prev, open: false }))}
      />
      <GroupForm isOpen={groupOpen} onClose={() => setGroupOpen(false)} />
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
