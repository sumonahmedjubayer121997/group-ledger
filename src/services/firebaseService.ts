
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, Auth, User } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, Firestore, onSnapshot, Timestamp, setDoc } from 'firebase/firestore';
import { FirebaseOptions } from '@firebase/app';
import { Expense, Group, UserProfile } from '@/types';

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

// Helper function to convert Timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

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

// User Profile functions
const createUserProfile = async (userProfile: Omit<UserProfile, 'createdAt'> & { createdAt?: Date }): Promise<UserProfile> => {
  try {
    const profileWithDate = {
      ...userProfile,
      createdAt: userProfile.createdAt || new Date(),
    };
    
    await setDoc(doc(db, "users", userProfile.uid), profileWithDate);
    return profileWithDate;
  } catch (error) {
    console.error("Error creating user profile: ", error);
    throw error;
  }
};

const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      return {
        ...userData,
        createdAt: convertTimestamp(userData.createdAt),
        lastLoginAt: userData.lastLoginAt ? convertTimestamp(userData.lastLoginAt) : undefined,
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    return null;
  }
};

const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw error;
  }
};

const mergeTemporaryUserWithRealUser = async (user: User) => {
  // Implementation for merging temporary user data
  console.log('Merging temporary user with real user:', user.uid);
  // This would contain the logic to merge temporary user data
};

// Group functions
const createGroup = async (groupData: Omit<Group, 'id' | 'createdAt'>, userId: string): Promise<Group> => {
  try {
    const group = {
      ...groupData,
      createdAt: new Date(),
      createdBy: userId,
    };
    
    const docRef = await addDoc(collection(db, "groups"), group);
    return { ...group, id: docRef.id };
  } catch (error) {
    console.error("Error creating group: ", error);
    throw error;
  }
};

const addGroup = async (userId: string, groupName: string) => {
  try {
    const docRef = await addDoc(collection(db, "groups"), {
      name: groupName,
      createdBy: userId,
      members: [userId],
      createdAt: new Date(),
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
    createdAt: convertTimestamp(doc.data().createdAt),
    description: doc.data().description,
  })) as Group[];
};

const getUserGroups = async (userId: string): Promise<Group[]> => {
  return getGroups(userId);
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

const deleteGroup = async (groupId: string) => {
  try {
    await deleteDoc(doc(db, "groups", groupId));
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};

const addMemberToGroup = async (groupId: string, member: { id: string; name: string; email: string }, userId: string) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDocs(query(collection(db, "groups"), where("__name__", "==", groupId)));
    
    if (!groupDoc.empty) {
      const currentMembers = groupDoc.docs[0].data().members || [];
      if (!currentMembers.includes(member.id)) {
        await updateDoc(groupRef, {
          members: [...currentMembers, member.id]
        });
      }
    }
  } catch (error) {
    console.error("Error adding member to group: ", error);
    throw error;
  }
};

const removeMemberFromGroup = async (groupId: string, memberId: string) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDocs(query(collection(db, "groups"), where("__name__", "==", groupId)));
    
    if (!groupDoc.empty) {
      const currentMembers = groupDoc.docs[0].data().members || [];
      await updateDoc(groupRef, {
        members: currentMembers.filter((id: string) => id !== memberId)
      });
    }
  } catch (error) {
    console.error("Error removing member from group: ", error);
    throw error;
  }
};

// Subscription functions
const subscribeToUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const q = query(collection(db, "groups"), where("members", "array-contains", userId));
  
  return onSnapshot(q, (querySnapshot) => {
    const groups = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
    })) as Group[];
    
    callback(groups);
  });
};

const subscribeToGroupExpenses = (groupId: string, callback: (expenses: Expense[]) => void) => {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
  
  return onSnapshot(q, (querySnapshot) => {
    const expenses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
    })) as Expense[];
    
    callback(expenses);
  });
};

// Expense functions
const createExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>, userId: string): Promise<Expense> => {
  try {
    const expense = {
      ...expenseData,
      createdAt: new Date(),
    };
    
    const docRef = await addDoc(collection(db, "expenses"), expense);
    return { ...expense, id: docRef.id };
  } catch (error) {
    console.error("Error creating expense: ", error);
    throw error;
  }
};

const addExpense = async (groupId: string, description: string, amount: number, paidBy: string, splitAmong: string[]) => {
  try {
    const docRef = await addDoc(collection(db, "expenses"), {
      groupId: groupId,
      description: description,
      amount: amount,
      paidBy: paidBy,
      splitBetween: splitAmong,
      createdAt: new Date(),
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
    splitBetween: doc.data().splitBetween,
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Expense[];
};

const updateExpense = async (groupId: string, expenseId: string, updates: Partial<Expense>) => {
  try {
    const expenseDocRef = doc(db, "expenses", expenseId);
    await updateDoc(expenseDocRef, updates);
    console.log("Document successfully updated!");
  } catch (error) {
    console.error("Error updating document: ", error);
  }
};

const deleteExpense = async (groupId: string, expenseId: string) => {
  try {
    await deleteDoc(doc(db, "expenses", expenseId));
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};

export {
  auth,
  db,
  signUp,
  signIn,
  signOutUser,
  updateDisplayName,
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  mergeTemporaryUserWithRealUser,
  createGroup,
  addGroup,
  getGroups,
  getUserGroups,
  deleteGroup,
  updateGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  subscribeToUserGroups,
  subscribeToGroupExpenses,
  createExpense,
  addExpense,
  getExpenses,
  deleteExpense,
  updateExpense,
};

export type { UserProfile, Expense, Group };
