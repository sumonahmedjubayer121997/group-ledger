import { useEffect, useRef } from "react";
import { buildWeeklySummary, summaryWeekKey } from "@/lib/weeklySummary";
import { notificationFirebaseService } from "@/services/notificationFirebaseService";
import { useExpenseStore } from "./expenseStore";
import { useLoanStore } from "./loanStore";
import { useNotificationStore } from "./notificationStore";
import { useUserBalances } from "./useLedger";

// Expenses arrive group by group after the groups list; give them a moment before summing.
const SETTLE_MS = 5000;

/**
 * Writes the weekly "where you stand" note into your own notifications, the first time the app is
 * opened after Sunday 18:00 (the free Firebase plan has no scheduled jobs, push or email). Once per
 * week across all your devices; nothing when everything's settled; off when you switch it off.
 */
export function useWeeklySummary(userId: string) {
  const balances = useUserBalances(userId);
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const loansLoaded = useLoanStore((s) => s.loaded);
  const settingsLoaded = useNotificationStore((s) => s.settingsLoaded);
  const wanted = useNotificationStore((s) => s.weeklySummary);
  const latest = useRef(balances);
  latest.current = balances;
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || !groupsLoaded || !loansLoaded || !settingsLoaded || !wanted) return;
    const timer = window.setTimeout(async () => {
      tried.current = true;
      const now = new Date();
      const summary = buildWeeklySummary(
        latest.current.perGroup.filter((p) => !p.group.isArchived).map((p) => ({ groupName: p.group.name, currency: p.currency, net: p.net })),
        useLoanStore.getState().loans,
        now
      );
      if (!summary) return;
      try {
        if (!(await notificationFirebaseService.claimSummaryWeek(userId, summaryWeekKey(now)))) return;
        await notificationFirebaseService.send({ to: userId, from: userId, type: "weekly_summary", title: summary.title, message: summary.message, route: "/" });
      } catch {
        /* next time the app opens */
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [userId, groupsLoaded, loansLoaded, settingsLoaded, wanted]);
}
