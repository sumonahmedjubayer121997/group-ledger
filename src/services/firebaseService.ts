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
    // Transform members array to object for Firestore rules
    const membersObj = groupData.members.reduce((acc, member) => {
      acc[member.id] = member.id === userId ? 'admin' : 'member';
      return acc;
    }, {} as Record<string, string>);

    // Create member names and emails objects
    const memberNames = groupData.members.reduce((acc, member) => {
      acc[member.id] = member.name;
      return acc;
    }, {} as Record<string, string>);

    const memberEmails = groupData.members.reduce((acc, member) => {
      acc[member.id] = member.email;
      return acc;
    }, {} as Record<string, string>);

    const joinedAt = groupData.members.reduce((acc, member) => {
      acc[member.id] = serverTimestamp();
      return acc;
    }, {} as Record<string, any>);

    const firestoreGroup = {
      ...groupData,
      members: membersObj,
      memberNames,
      memberEmails,
      joinedAt,
      createdAt: serverTimestamp(),
      createdBy: userId,
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
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where(`members.${userId}`, 'in', ['admin', 'member'])
    );
    
    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Transform members object back to array
      const membersArray = Object.keys(data.members).map(memberId => ({
        id: memberId,
        name: data.memberNames?.[memberId] || 'Unknown',
        email: data.memberEmails?.[memberId] || '',
        role: data.members[memberId] as 'admin' | 'member',
        joinedAt: data.joinedAt?.[memberId]?.toDate() || new Date(),
      }));

      groups.push({
        id: doc.id,
        ...data,
        members: membersArray,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Group);
    });
    
    return groups;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

// Expense Operations
export const createExpense = async (expenseData: Omit<Expense, 'id'>, userId: string) => {
  try {
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

    console.log('Creating expense with data:', cleanExpenseData);
    const docRef = await addDoc(expenseRef, cleanExpenseData);
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
  const groupsRef = collection(db, 'groups');
  const q = query(
    groupsRef,
    where(`members.${userId}`, 'in', ['admin', 'member'])
  );
  
  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Transform members object back to array
      const membersArray = Object.keys(data.members || {}).map(memberId => ({
        id: memberId,
        name: data.memberNames?.[memberId] || 'Unknown',
        email: data.memberEmails?.[memberId] || '',
        role: data.members[memberId] as 'admin' | 'member',
        joinedAt: data.joinedAt?.[memberId]?.toDate() || new Date(),
      }));

      groups.push({
        id: doc.id,
        ...data,
        members: membersArray,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Group);
    });
    
    console.log('Firebase groups subscription updated:', groups);
    callback(groups);
  }, (error) => {
    console.error('Error in groups subscription:', error);
  });
};

export const subscribeToGroupExpenses = (groupId: string, callback: (expenses: Expense[]) => void) => {
  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  const q = query(expensesRef, orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
      } as Expense);
    });
    callback(expenses);
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
