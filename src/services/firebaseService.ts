
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
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Group, Expense, Member, Settlement } from '@/stores/expenseStore';

// Group Operations
export const createGroup = async (groupData: Omit<Group, 'id'>, userId: string) => {
  try {
    console.log('Creating group with userId:', userId);
    console.log('Group data members:', groupData.members);
    
    // Transform members array to object for Firestore rules
    // Ensure the current user (userId) is included as admin
    const membersObj: Record<string, string> = {};
    const memberNames: Record<string, string> = {};
    const memberEmails: Record<string, string> = {};
    const joinedAt: Record<string, any> = {};
    
    // First, add the current user as admin
    membersObj[userId] = 'admin';
    
    // Find the current user in the members array to get their name and email
    const currentUserMember = groupData.members.find(member => member.id === userId);
    if (currentUserMember) {
      memberNames[userId] = currentUserMember.name;
      memberEmails[userId] = currentUserMember.email;
    } else {
      // If current user is not in members array, this shouldn't happen but add fallback
      memberNames[userId] = 'Current User';
      memberEmails[userId] = '';
    }
    joinedAt[userId] = serverTimestamp();
    
    // Add other members (excluding the current user to avoid duplicates)
    groupData.members.forEach(member => {
      if (member.id !== userId) {
        membersObj[member.id] = member.role || 'member';
        memberNames[member.id] = member.name;
        memberEmails[member.id] = member.email;
        joinedAt[member.id] = serverTimestamp();
      }
    });

    const firestoreGroup = {
      name: groupData.name,
      description: groupData.description,
      members: membersObj,
      memberNames,
      memberEmails,
      joinedAt,
      createdAt: serverTimestamp(),
      createdBy: userId, // Use the authenticated user's uid
      groupType: groupData.groupType || 'private',
      inviteCode: groupData.inviteCode || crypto.randomUUID(),
      settings: groupData.settings || {
        currency: 'USD',
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
      },
      tags: groupData.tags || [],
      location: groupData.location || '',
      isArchived: groupData.isArchived || false,
      photo: groupData.photo,
      coverImage: groupData.coverImage,
    };

    console.log('Creating group with data:', firestoreGroup);
    const docRef = await addDoc(collection(db, 'groups'), firestoreGroup);
    
    // Return the complete group object with the generated ID
    return {
      id: docRef.id,
      ...groupData,
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
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where(`members.${userId}`, 'in', ['admin', 'member'])
    );
    
    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];
    
    console.log('Found groups:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing group:', doc.id, data);
      
      // Transform members object back to array - handle both old and new format
      const membersArray = Object.keys(data.members || {}).map(memberId => ({
        id: memberId,
        name: data.memberNames?.[memberId] || 'Unknown',
        email: data.memberEmails?.[memberId] || '',
        role: data.members[memberId] as 'admin' | 'member',
        joinedAt: data.joinedAt?.[memberId]?.toDate() || new Date(),
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
        tags: data.tags || [],
        location: data.location || '',
        isArchived: data.isArchived || false,
        photo: data.photo,
        coverImage: data.coverImage,
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
    where(`members.${userId}`, 'in', ['admin', 'member'])
  );
  
  return onSnapshot(q, (snapshot) => {
    console.log('Groups snapshot received, size:', snapshot.size);
    const groups: Group[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing group from subscription:', doc.id, data);
      
      // Transform members object back to array
      const membersArray = Object.keys(data.members || {}).map(memberId => ({
        id: memberId,
        name: data.memberNames?.[memberId] || 'Unknown',
        email: data.memberEmails?.[memberId] || '',
        role: data.members[memberId] as 'admin' | 'member',
        joinedAt: data.joinedAt?.[memberId]?.toDate() || new Date(),
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
        tags: data.tags || [],
        location: data.location || '',
        isArchived: data.isArchived || false,
        photo: data.photo,
        coverImage: data.coverImage,
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

// Member management
export const addMemberToGroup = async (groupId: string, member: Member, userId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      [`members.${member.id}`]: 'member',
      [`memberNames.${member.id}`]: member.name,
      [`memberEmails.${member.id}`]: member.email,
      [`joinedAt.${member.id}`]: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding member to group:', error);
    throw error;
  }
};

export const removeMemberFromGroup = async (groupId: string, memberId: string) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      [`members.${memberId}`]: null,
      [`memberNames.${memberId}`]: null,
      [`memberEmails.${memberId}`]: null,
      [`joinedAt.${memberId}`]: null,
    });
  } catch (error) {
    console.error('Error removing member from group:', error);
    throw error;
  }
};
