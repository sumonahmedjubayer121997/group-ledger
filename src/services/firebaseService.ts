import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Group, Expense, Member, Settlement } from '@/stores/expenseStore';

// User Profile Interface
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  joinedAt: Date;
  lastActivity: Date;
  verified: boolean;
  preferences: {
    currency: string;
    theme: string;
    language: string;
    notifications?: boolean;
  };
  stats: {
    groupsJoined: number;
    totalPaid: number;
    totalOwed: number;
  };
  displayName?: string;
  emailVerified?: boolean;
  role?: 'user' | 'admin';
  createdAt?: Date;
  lastLoginAt?: Date;
}

// User Operations
export const createUserProfile = async (userProfile: Omit<UserProfile, 'joinedAt' | 'lastActivity' | 'stats'>): Promise<UserProfile> => {
  try {
    const userRef = doc(db, 'users', userProfile.uid);
    const userData = {
      ...userProfile,
      joinedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      stats: {
        groupsJoined: 0,
        totalPaid: 0,
        totalOwed: 0,
      },
    };
    
    await setDoc(userRef, userData);
    
    // Return with proper Date types and compatibility properties
    return {
      ...userProfile,
      joinedAt: new Date(),
      lastActivity: new Date(),
      stats: {
        groupsJoined: 0,
        totalPaid: 0,
        totalOwed: 0,
      },
      // Add compatibility properties
      displayName: userProfile.name,
      emailVerified: userProfile.verified,
      role: 'user' as const,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
  const profile = {
  uid: userDoc.id,
  ...data,
  joinedAt: data.joinedAt?.toDate() || new Date(),
  lastActivity: data.lastActivity?.toDate() || new Date(),

  // Ensure defaults
  stats: {
    groupsJoined: data.stats?.groupsJoined || 0,
    totalPaid: data.stats?.totalPaid || 0,
    totalOwed: data.stats?.totalOwed || 0,
  },

  // Add compatibility properties
  displayName: data.name,
  emailVerified: data.verified,
  role: 'user' as const,
  createdAt: data.joinedAt?.toDate() || new Date(),
  lastLoginAt: data.lastActivity?.toDate() || new Date(),
} as UserProfile;

    
    return profile;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      lastActivity: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Group Operations
// ✅ Full working createGroup() function fixed with safe fallbacks
export const createGroup = async (groupData: Omit<Group, 'id'>, userId: string) => {
  try {
    console.log('Creating group with userId:', userId);

    // Get current user's profile
    const currentUserProfile = await getUserProfile(userId);
    if (!currentUserProfile) {
      throw new Error('User profile not found');
    }

    // Create users object with safe structure
    const users: Record<string, any> = {};

    // Add current user as admin using profile fallback
    users[userId] = {
      name: currentUserProfile.name || 'Unknown',
      email: currentUserProfile.email || 'unknown@example.com',
      role: 'admin',
      joinedAt: serverTimestamp(),
    };
console.log("🔍 groupData.members", groupData.members);
console.log("📌 Type:", typeof groupData.members);
console.log("📌 IsArray?", Array.isArray(groupData.members));

    // Process members from object map: { uid: role }
    for (const member of groupData.members) {
  const memberId = member.id;
  const existingUser = await getUserProfile(memberId);
  console.log("👤 Checking user profile for memberId:", memberId);

  const name = (member.name || existingUser?.name || 'Unknown').trim();
  const email = (member.email || existingUser?.email || '').trim(); 

  users[memberId] = {
    name,
    email,
    role: member.role,
    joinedAt: serverTimestamp(),
    isTemporary: !existingUser
  };
}

    const firestoreGroup = {
      name: groupData.name.trim(),
      description: groupData.description?.trim() || '',
      users,
      createdBy: userId,
      createdAt: serverTimestamp(),
      groupType: groupData.groupType || 'private',
      inviteCode: groupData.inviteCode || crypto.randomUUID(),
      settings: groupData.settings || {
        currency: 'USD',
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
      },
      isArchived: groupData.isArchived || false,
    };

    console.log('Creating group with new structure:', firestoreGroup);

    const docRef = await addDoc(collection(db, 'groups'), firestoreGroup);
    const groupId = docRef.id;

    const batch = [];
    for (const [uid, userData] of Object.entries(users)) {
      if (!userData.isTemporary) {
        const memberRef = doc(db, 'groups', groupId, 'members', uid);
        batch.push(setDoc(memberRef, {
          role: userData.role,
          joinedAt: serverTimestamp(),
        }));

        const userGroupRef = doc(db, 'users', uid, 'groups', groupId);
        batch.push(setDoc(userGroupRef, {
          groupId,
          role: userData.role,
          joinedAt: serverTimestamp(),
        }));
      }
    }

    await Promise.all(batch);

      await updateUserProfile(userId, {
    stats: {
      groupsJoined: (currentUserProfile.stats?.groupsJoined || 0) + 1,
      totalPaid: currentUserProfile.stats?.totalPaid || 0,
      totalOwed: currentUserProfile.stats?.totalOwed || 0,
    },
  });


    const membersArray = Object.entries(users).map(([id, userData]) => ({
      id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      joinedAt: new Date(),
    }));

    return {
      id: groupId,
      ...groupData,
      members: membersArray,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const updateGroup = async (groupId: string, updates: Partial<Group>) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
};

export const getUserGroups = async (userId: string) => {
  try {
    console.log('Fetching groups for user:', userId);
    
    // Query using the new users structure
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where(`users.${userId}.role`, 'in', ['admin', 'member'])
    );
    
    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];
    
    console.log('Found groups:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing group:', doc.id, data);
      
      // Transform users object to members array
      const membersArray = Object.entries(data.users || {}).map(([uid, userData]: [string, any]) => ({
        id: uid,
        name: userData.name || 'Unknown',
        email: userData.email || '',
        role: userData.role as 'admin' | 'member',
        joinedAt: userData.joinedAt?.toDate() || new Date(),
      }));

      const group: Group = {
        id: doc.id,
        name: data.name || 'Unnamed Group',
        description: data.description || '',
        members: membersArray,
        createdAt: data.createdAt?.toDate() || new Date(),
        groupType: data.groupType || 'private',
        inviteCode: data.inviteCode || '',
        settings: data.settings || {
          currency: 'USD',
          simplifyDebts: true,
          notifications: true,
          recurringBills: false,
        },
        isArchived: data.isArchived || false,
      };

      groups.push(group);
    });
    
    console.log('Processed groups:', groups.length);
    return groups;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

// Expense Operations
export const createExpense = async (expenseData: Omit<Expense, 'id'>, userId: string) => {
  try {
    console.log('Creating expense in Firebase:', expenseData);
    const expenseRef = collection(db, 'groups', expenseData.groupId, 'expenses');
    
    // Clean the expense data to remove undefined fields
    const cleanExpenseData = {
      description: expenseData.description,
      amount: expenseData.amount,
      paidBy: expenseData.paidBy,
      splitAmong: expenseData.splitAmong,
      groupId: expenseData.groupId,
      category: expenseData.category,
      date: expenseData.date,
      splitType: expenseData.splitType,
      userId,
      createdAt: serverTimestamp(),
    };

    // Only add splitData if it's not undefined and not empty
    if (expenseData.splitData && Object.keys(expenseData.splitData).length > 0) {
      (cleanExpenseData as any).splitData = expenseData.splitData;
    }

    console.log('Creating expense with clean data:', cleanExpenseData);
    const docRef = await addDoc(expenseRef, cleanExpenseData);
    console.log('Expense created with ID:', docRef.id);
    return { id: docRef.id, ...expenseData };
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

export const updateExpense = async (groupId: string, expenseId: string, updates: Partial<Expense>) => {
  try {
    const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
    await updateDoc(expenseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

export const deleteExpense = async (groupId: string, expenseId: string) => {
  try {
    const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

export const getGroupExpenses = async (groupId: string) => {
  try {
    const expensesRef = collection(db, 'groups', groupId, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const expenses: Expense[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
      } as Expense);
    });
    
    return expenses;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  console.log('Setting up groups subscription for user:', userId);
  const groupsRef = collection(db, 'groups');
  const q = query(
    groupsRef,
    where(`users.${userId}.role`, 'in', ['admin', 'member'])
  );
  
  return onSnapshot(q, (snapshot) => {
    console.log('Groups snapshot received, size:', snapshot.size);
    const groups: Group[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing group from subscription:', doc.id, data);
      
      // Transform users object to members array
      const membersArray = Object.entries(data.users || {}).map(([uid, userData]: [string, any]) => ({
        id: uid,
        name: userData.name || 'Unknown',
        email: userData.email || '',
        role: userData.role as 'admin' | 'member',
        joinedAt: userData.joinedAt?.toDate() || new Date(),
      }));

      const group: Group = {
        id: doc.id,
        name: data.name || 'Unnamed Group',
        description: data.description || '',
        members: membersArray,
        createdAt: data.createdAt?.toDate() || new Date(),
        groupType: data.groupType || 'private',
        inviteCode: data.inviteCode || '',
        settings: data.settings || {
          currency: 'USD',
          simplifyDebts: true,
          notifications: true,
          recurringBills: false,
        },
        isArchived: data.isArchived || false,
      };

      groups.push(group);
    });
    
    console.log('Firebase groups subscription updated with groups:', groups.length);
    callback(groups);
  }, (error) => {
    console.error('Error in groups subscription:', error);
  });
};

export const subscribeToGroupExpenses = (groupId: string, callback: (expenses: Expense[]) => void) => {
  console.log('Setting up expense subscription for group:', groupId);
  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  const q = query(expensesRef, orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    console.log('Expense subscription triggered for group:', groupId, 'Changes:', snapshot.docChanges().length);
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
      } as Expense);
    });
    console.log('Calling callback with expenses:', expenses);
    callback(expenses);
  }, (error) => {
    console.error('Error in expense subscription for group:', groupId, error);
  });
};

// Member management with new structure
export const addMemberToGroup = async (groupId: string, member: Member, userId: string) => {
  try {
    // Check if user exists in users collection
    let userProfile = await getUserProfile(member.id);
    
    // If user doesn't exist, create their profile
    if (!userProfile) {
      userProfile = await createUserProfile({
        uid: member.id,
        name: member.name,
        email: member.email,
        verified: false,
        preferences: {
          currency: 'USD',
          theme: 'light',
          language: 'en',
        },
      });
    }
    
    // Update group's users object
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      [`users.${member.id}`]: {
        name: userProfile.name,
        email: userProfile.email,
        role: 'member',
        joinedAt: serverTimestamp(),
      },
    });
    
    // Add to members subcollection
    const memberRef = doc(db, 'groups', groupId, 'members', member.id);
    await setDoc(memberRef, {
      role: 'member',
      joinedAt: serverTimestamp(),
    });
    
    // Add to user's groups subcollection
    const userGroupRef = doc(db, 'users', member.id, 'groups', groupId);
    await setDoc(userGroupRef, {
      groupId,
      role: 'member',
      joinedAt: serverTimestamp(),
    });
    
    // Update user stats
    if (userProfile) {
      await updateUserProfile(member.id, {
        stats: {
          ...userProfile.stats,
          groupsJoined: userProfile.stats.groupsJoined + 1,
        },
      });
    }
  } catch (error) {
    console.error('Error adding member to group:', error);
    throw error;
  }
};

export const removeMemberFromGroup = async (groupId: string, memberId: string) => {
  try {
    // Remove from group's users object
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      [`users.${memberId}`]: null,
    });
    
    // Remove from members subcollection
    const memberRef = doc(db, 'groups', groupId, 'members', memberId);
    await deleteDoc(memberRef);
    
    // Remove from user's groups subcollection
    const userGroupRef = doc(db, 'users', memberId, 'groups', groupId);
    await deleteDoc(userGroupRef);
    
    // Update user stats
    const userProfile = await getUserProfile(memberId);
    if (userProfile) {
      await updateUserProfile(memberId, {
        stats: {
          ...userProfile.stats,
          groupsJoined: Math.max(0, userProfile.stats.groupsJoined - 1),
        },
      });
    }
  } catch (error) {
    console.error('Error removing member from group:', error);
    throw error;
  }
};
