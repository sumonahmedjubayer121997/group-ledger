import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, Auth, User } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, Firestore } from 'firebase/firestore';
import { FirebaseOptions } from '@firebase/app';
import { Expense, Group } from '@/types';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Authentication functions
const signUp = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

const signIn = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

const signOutUser = () => {
  return signOut(auth);
};

const updateDisplayName = (user: User, displayName: string) => {
  return updateProfile(user, { displayName: displayName });
};

// Firestore functions
const addGroup = async (userId: string, groupName: string) => {
  try {
    const docRef = await addDoc(collection(db, "groups"), {
      name: groupName,
      createdBy: userId,
      members: [userId],
    });
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    return null;
  }
};

const getGroups = async (userId: string): Promise<Group[]> => {
  const q = query(collection(db, "groups"), where("members", "array-contains", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    createdBy: doc.data().createdBy,
    members: doc.data().members,
  })) as Group[];
};

const deleteGroup = async (groupId: string) => {
  try {
    await deleteDoc(doc(db, "groups", groupId));
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};

const updateGroup = async (groupId: string, updates: Partial<Group>) => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    await updateDoc(groupDocRef, updates);
    console.log("Document successfully updated!");
  } catch (error) {
    console.error("Error updating document: ", error);
  }
};

const addExpense = async (groupId: string, description: string, amount: number, paidBy: string, splitAmong: string[]) => {
  try {
    const docRef = await addDoc(collection(db, "expenses"), {
      groupId: groupId,
      description: description,
      amount: amount,
      paidBy: paidBy,
      splitAmong: splitAmong,
      timestamp: new Date(),
    });
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    return null;
  }
};

const getExpenses = async (groupId: string): Promise<Expense[]> => {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    groupId: doc.data().groupId,
    description: doc.data().description,
    amount: doc.data().amount,
    paidBy: doc.data().paidBy,
    splitAmong: doc.data().splitAmong,
    timestamp: doc.data().timestamp,
  })) as Expense[];
};

const deleteExpense = async (expenseId: string) => {
  try {
    await deleteDoc(doc(db, "expenses", expenseId));
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};

const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
  try {
    const expenseDocRef = doc(db, "expenses", expenseId);
    await updateDoc(expenseDocRef, updates);
    console.log("Document successfully updated!");
  } catch (error) {
    console.error("Error updating document: ", error);
  }
};

export {
  auth,
  db,
  signUp,
  signIn,
  signOutUser,
  updateDisplayName,
  addGroup,
  getGroups,
  deleteGroup,
  updateGroup,
  addExpense,
  getExpenses,
  deleteExpense,
  updateExpense,
};
