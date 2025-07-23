
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt: Date;
  preferences?: {
    currency?: string;
    notifications?: boolean;
    theme?: 'light' | 'dark';
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  members: string[];
  currency?: string;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category?: string;
  date: Date;
  createdAt: Date;
}

// Generate a simple UUID-like string for group IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const createUserProfile = async (userData: Partial<UserProfile> & { uid: string; email: string }): Promise<UserProfile> => {
  try {
    const userProfile: UserProfile = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || 'User',
      name: userData.name || userData.displayName || 'User',
      photoURL: userData.photoURL || null,
      phoneNumber: userData.phoneNumber || null,
      emailVerified: userData.emailVerified || false,
      role: userData.role || 'user',
      createdAt: userData.createdAt || new Date(),
      lastLoginAt: userData.lastLoginAt || new Date(),
      preferences: {
        currency: 'USD',
        notifications: true,
        theme: 'light',
        ...userData.preferences,
      },
    };

    await setDoc(doc(db, 'users', userData.uid), {
      ...userProfile,
      createdAt: Timestamp.fromDate(userProfile.createdAt),
      lastLoginAt: Timestamp.fromDate(userProfile.lastLoginAt),
    });

    console.log('✅ User profile created successfully:', userData.uid);
    return userProfile;
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate?.() || new Date(),
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const docRef = doc(db, 'users', uid);
    const updateData = { ...updates };
    
    // Convert dates to Timestamps if present
    if (updateData.createdAt) {
      updateData.createdAt = Timestamp.fromDate(updateData.createdAt) as any;
    }
    if (updateData.lastLoginAt) {
      updateData.lastLoginAt = Timestamp.fromDate(updateData.lastLoginAt) as any;
    }
    
    await updateDoc(docRef, updateData);
    console.log('✅ User profile updated successfully:', uid);
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<{ uid: string; data: UserProfile } | null> => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        uid: doc.id,
        data: {
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate?.() || new Date(),
        } as UserProfile
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

export const mergeTemporaryUserWithRealUser = async (realUser: User): Promise<void> => {
  try {
    if (!realUser.email) {
      console.error('❌ No email found for real user');
      return;
    }

    console.log(`🔍 Checking for existing user with email: ${realUser.email}`);
    
    // Find existing user by email
    const existingUser = await findUserByEmail(realUser.email);
    
    if (!existingUser || existingUser.uid === realUser.uid) {
      console.log('✅ No merge needed - user is already correct or doesn\'t exist');
      return;
    }

    const tempUid = existingUser.uid;
    const realUid = realUser.uid;
    
    console.log(`🔄 Merging temporary user ${tempUid} → real user ${realUid}`);
    
    const batch = writeBatch(db);
    
    // 1. Create or update the real user profile
    const realUserProfile: UserProfile = {
      ...existingUser.data,
      uid: realUid,
      lastLoginAt: new Date(),
      emailVerified: realUser.emailVerified,
      photoURL: realUser.photoURL || existingUser.data.photoURL,
      displayName: realUser.displayName || existingUser.data.displayName,
      name: realUser.displayName || existingUser.data.name || existingUser.data.displayName,
    };
    
    batch.set(doc(db, 'users', realUid), {
      ...realUserProfile,
      createdAt: Timestamp.fromDate(realUserProfile.createdAt),
      lastLoginAt: Timestamp.fromDate(realUserProfile.lastLoginAt),
    });
    
    // 2. Find and update all groups where tempUid is referenced
    const groupsQuery = query(collection(db, 'groups'));
    const groupsSnapshot = await getDocs(groupsQuery);
    
    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      let groupNeedsUpdate = false;
      const groupUpdates: any = {};
      
      // Update members array
      if (groupData.members && groupData.members.includes(tempUid)) {
        groupUpdates.members = groupData.members.map((id: string) => 
          id === tempUid ? realUid : id
        );
        groupNeedsUpdate = true;
      }
      
      // Update createdBy if it matches tempUid
      if (groupData.createdBy === tempUid) {
        groupUpdates.createdBy = realUid;
        groupNeedsUpdate = true;
      }
      
      // Update users object if it exists
      if (groupData.users && groupData.users[tempUid]) {
        groupUpdates[`users.${realUid}`] = groupData.users[tempUid];
        groupUpdates[`users.${tempUid}`] = null; // Remove old reference
        groupNeedsUpdate = true;
      }
      
      if (groupNeedsUpdate) {
        batch.update(doc(db, 'groups', groupDoc.id), groupUpdates);
        console.log(`📝 Updated group ${groupDoc.id} references from ${tempUid} to ${realUid}`);
      }
    }
    
    // 3. Update expenses where tempUid is referenced
    const expensesQuery = query(collection(db, 'expenses'));
    const expensesSnapshot = await getDocs(expensesQuery);
    
    for (const expenseDoc of expensesSnapshot.docs) {
      const expenseData = expenseDoc.data();
      let expenseNeedsUpdate = false;
      const expenseUpdates: any = {};
      
      // Update paidBy
      if (expenseData.paidBy === tempUid) {
        expenseUpdates.paidBy = realUid;
        expenseNeedsUpdate = true;
      }
      
      // Update splitBetween array
      if (expenseData.splitBetween && expenseData.splitBetween.includes(tempUid)) {
        expenseUpdates.splitBetween = expenseData.splitBetween.map((id: string) => 
          id === tempUid ? realUid : id
        );
        expenseNeedsUpdate = true;
      }
      
      if (expenseNeedsUpdate) {
        batch.update(doc(db, 'expenses', expenseDoc.id), expenseUpdates);
        console.log(`💰 Updated expense ${expenseDoc.id} references from ${tempUid} to ${realUid}`);
      }
    }
    
    // 4. Delete the temporary user document
    batch.delete(doc(db, 'users', tempUid));
    
    // Execute all updates in a single batch
    await batch.commit();
    
    console.log(`✅ Successfully merged temporary user ${tempUid} with real user ${realUid}`);
    
  } catch (error) {
    console.error('❌ Error merging temporary user with real user:', error);
    throw error;
  }
};

export const createGroup = async (groupData: Omit<Group, 'id' | 'createdAt'>): Promise<Group> => {
  try {
    const groupId = generateId();
    const newGroup: Group = {
      id: groupId,
      createdAt: new Date(),
      ...groupData,
    };

    await setDoc(doc(db, 'groups', groupId), {
      ...newGroup,
      createdAt: Timestamp.fromDate(newGroup.createdAt),
    });

    console.log('✅ Group created successfully:', groupId);
    return newGroup;
  } catch (error) {
    console.error('❌ Error creating group:', error);
    throw error;
  }
};

export const getGroup = async (groupId: string): Promise<Group | null> => {
  try {
    const docRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      } as Group;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting group:', error);
    throw error;
  }
};

export const updateGroup = async (groupId: string, updates: Partial<Group>): Promise<void> => {
  try {
    const docRef = doc(db, 'groups', groupId);
    const updateData = { ...updates };
    
    // Convert dates to Timestamps if present
    if (updateData.createdAt) {
      updateData.createdAt = Timestamp.fromDate(updateData.createdAt) as any;
    }
    
    await updateDoc(docRef, updateData);
    console.log('✅ Group updated successfully:', groupId);
  } catch (error) {
    console.error('❌ Error updating group:', error);
    throw error;
  }
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'groups', groupId));
    console.log('✅ Group deleted successfully:', groupId);
  } catch (error) {
    console.error('❌ Error deleting group:', error);
    throw error;
  }
};

export const createExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>, userId: string): Promise<Expense> => {
  try {
    const expenseId = generateId();
    const newExpense: Expense = {
      id: expenseId,
      createdAt: new Date(),
      ...expenseData,
    };

    await setDoc(doc(db, 'expenses', expenseId), {
      ...newExpense,
      date: Timestamp.fromDate(newExpense.date),
      createdAt: Timestamp.fromDate(newExpense.createdAt),
    });

    console.log('✅ Expense added successfully:', expenseId);
    return newExpense;
  } catch (error) {
    console.error('❌ Error adding expense:', error);
    throw error;
  }
};

export const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
  try {
    const expenseId = generateId();
    const newExpense: Expense = {
      id: expenseId,
      createdAt: new Date(),
      ...expenseData,
    };

    await setDoc(doc(db, 'expenses', expenseId), {
      ...newExpense,
      date: Timestamp.fromDate(newExpense.date),
      createdAt: Timestamp.fromDate(newExpense.createdAt),
    });

    console.log('✅ Expense added successfully:', expenseId);
    return newExpense;
  } catch (error) {
    console.error('❌ Error adding expense:', error);
    throw error;
  }
};

export const getExpense = async (expenseId: string): Promise<Expense | null> => {
  try {
    const docRef = doc(db, 'expenses', expenseId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        date: data.date?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
      } as Expense;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting expense:', error);
    throw error;
  }
};

export const updateExpense = async (groupId: string, expenseId: string, updates: Partial<Expense>): Promise<void> => {
  try {
    const docRef = doc(db, 'expenses', expenseId);
    const updateData = { ...updates };
    
    // Convert dates to Timestamps if present
    if (updateData.date) {
      updateData.date = Timestamp.fromDate(updateData.date) as any;
    }
    if (updateData.createdAt) {
      updateData.createdAt = Timestamp.fromDate(updateData.createdAt) as any;
    }
    
    await updateDoc(docRef, updateData);
    console.log('✅ Expense updated successfully:', expenseId);
  } catch (error) {
    console.error('❌ Error updating expense:', error);
    throw error;
  }
};

export const deleteExpense = async (groupId: string, expenseId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    console.log('✅ Expense deleted successfully:', expenseId);
  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    throw error;
  }
};

export const addUserToGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayUnion(userId),
    });
    console.log(`✅ User ${userId} added to group ${groupId}`);
  } catch (error) {
    console.error('❌ Error adding user to group:', error);
    throw error;
  }
};

export const removeUserFromGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'groups', groupId);
    await updateDoc(docRef, {
      members: arrayRemove(userId),
    });
    console.log(`✅ User ${userId} removed from group ${groupId}`);
  } catch (error) {
    console.error('❌ Error removing user from group:', error);
    throw error;
  }
};

// Aliases for compatibility
export const addMemberToGroup = addUserToGroup;
export const removeMemberFromGroup = removeUserFromGroup;

// Real-time subscription functions
export const subscribeToUserGroups = (userId: string, callback: (groups: any[]) => void): (() => void) => {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
    callback(groups);
  });
};

export const subscribeToGroupExpenses = (groupId: string, callback: (expenses: any[]) => void): (() => void) => {
  const q = query(
    collection(db, 'expenses'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
    callback(expenses);
  });
};

export const getUserGroups = async (userId: string): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error getting user groups:', error);
    throw error;
  }
};
