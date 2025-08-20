import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBudgetStore } from "@/stores/budgetStore";
import { useExpenseStore } from "@/stores/expenseStore";

export const useBudgetFirebaseSync = () => {
  const { user } = useAuth();
  const { initializeFirebaseSync, cleanup } = useBudgetStore();
  const { groups } = useExpenseStore();

  useEffect(() => {
    if (user) {
      console.log("Initializing Budget Firebase sync for user:", user.uid);
      // Get user's groups for budget sync
      const userGroups = groups.filter((group) =>
        group.members.some((member) =>
          typeof member === "string"
            ? member === user.uid
            : member.id === user.uid
        )
      );
      initializeFirebaseSync(user.uid, userGroups);
    } else {
      console.log("User not authenticated, cleaning up Budget Firebase sync");
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [user, groups, initializeFirebaseSync, cleanup]);
};
