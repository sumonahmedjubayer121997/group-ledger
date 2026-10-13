import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Loan } from "@/lib/loans";

/** Personal loans live in users/{uid}/loans; the rules let only that user read or write them. */

export type LoanInput = Omit<Loan, "id">;

const loans = (uid: string) => collection(db, "users", uid, "loans");
const loanRef = (uid: string, id: string) => doc(db, "users", uid, "loans", id);

const asDate = (value: unknown): Date | null =>
  value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : null;

const fromDoc = (id: string, d: DocumentData): Loan => ({
  id,
  direction: d.direction === "borrowed" ? "borrowed" : "lent",
  person: String(d.person ?? ""),
  personId: typeof d.personId === "string" ? d.personId : null,
  amountCents: Number(d.amountCents) || 0,
  currency: String(d.currency ?? "USD"),
  date: asDate(d.date) ?? new Date(0),
  dueDate: asDate(d.dueDate),
  note: String(d.note ?? ""),
  repayments: Array.isArray(d.repayments)
    ? d.repayments.map((r: DocumentData) => ({
        id: String(r.id),
        amountCents: Number(r.amountCents) || 0,
        date: asDate(r.date) ?? new Date(0),
        note: String(r.note ?? ""),
      }))
    : [],
});

const toData = (loan: LoanInput) => ({
  direction: loan.direction,
  person: loan.person.trim(),
  personId: loan.personId,
  amountCents: Math.round(loan.amountCents),
  currency: loan.currency,
  date: Timestamp.fromDate(loan.date),
  dueDate: loan.dueDate ? Timestamp.fromDate(loan.dueDate) : null,
  note: loan.note.trim(),
  repayments: loan.repayments.map((r) => ({
    id: r.id,
    amountCents: Math.round(r.amountCents),
    date: Timestamp.fromDate(r.date),
    note: r.note.trim(),
  })),
});

export const subscribeToLoans = (uid: string, onChange: (loans: Loan[]) => void, onError: (error: Error) => void) =>
  onSnapshot(
    loans(uid),
    (snap) => onChange(snap.docs.map((d) => fromDoc(d.id, d.data()))),
    onError
  );

export const createLoan = async (uid: string, loan: LoanInput) =>
  (await addDoc(loans(uid), { ...toData(loan), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id;

export const saveLoan = (uid: string, id: string, loan: LoanInput) =>
  updateDoc(loanRef(uid, id), { ...toData(loan), updatedAt: serverTimestamp() });

export const deleteLoan = (uid: string, id: string) => deleteDoc(loanRef(uid, id));
