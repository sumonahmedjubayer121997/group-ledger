import { useEffect } from "react";
import { create } from "zustand";
import type { Loan } from "@/lib/loans";
import { subscribeToLoans } from "@/services/loans";

type LoanState = { loans: Loan[]; loaded: boolean; failed: boolean };

/** Your personal loans, kept in sync while you're signed in (see useLoanSync). */
export const useLoanStore = create<LoanState>(() => ({ loans: [], loaded: false, failed: false }));

export function useLoanSync(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    const stop = subscribeToLoans(
      uid,
      (loans) => useLoanStore.setState({ loans, loaded: true, failed: false }),
      (error) => {
        console.error("Error loading loans:", error);
        useLoanStore.setState({ loaded: true, failed: true });
      }
    );
    return () => {
      stop();
      useLoanStore.setState({ loans: [], loaded: false, failed: false });
    };
  }, [uid]);
}
