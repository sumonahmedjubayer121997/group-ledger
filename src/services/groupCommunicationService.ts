import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationFirebaseService } from './notificationFirebaseService';

// Chat Messages
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  text: string;
  createdAt: Date;
}

export const sendChatMessage = async (groupId: string, senderId: string, senderName: string, text: string, senderPhotoURL?: string, groupName?: string, groupMembers?: string[]) => {
  try {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    
    // First, check if we have more than 100 messages
    const allMessagesQuery = query(messagesRef, orderBy('createdAt', 'desc'));
    const allMessagesSnapshot = await getDocs(allMessagesQuery);
    
    // If we have 100 or more messages, delete the oldest ones
    if (allMessagesSnapshot.size >= 100) {
      const messagesToDelete = allMessagesSnapshot.docs.slice(99); // Keep latest 99, delete the rest
      const deletePromises = messagesToDelete.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }
    
    // Add the new message
    const docRef = await addDoc(messagesRef, {
      senderId,
      senderName,
      senderPhotoURL: senderPhotoURL || null,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    
    // Send notifications to group members (except the sender)
    if (groupName && groupMembers) {
      const membersToNotify = groupMembers.filter(memberId => memberId !== senderId);
      
      for (const memberId of membersToNotify) {
        try {
          await notificationFirebaseService.notifyChatMessage(
            memberId,
            groupId,
            groupName,
            senderName,
            text
          );
        } catch (notificationError) {
          console.error('Error sending chat notification:', notificationError);
          // Don't throw - let the message be sent even if notification fails
        }
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const subscribeToGroupChat = (
  groupId: string, 
  messageLimit: number = 10,
  callback: (messages: ChatMessage[]) => void
) => {
  const messagesRef = collection(db, 'groups', groupId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(messageLimit));
  
  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        senderName: data.senderName,
        senderPhotoURL: data.senderPhotoURL,
        text: data.text,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });
    
    // Reverse to show oldest first, newest last
    callback(messages.reverse());
  });
};

export const getMessageCount = async (groupId: string): Promise<number> => {
  try {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const snapshot = await getDocs(messagesRef);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
};

// Pinned Notes
export interface PinnedNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createPinnedNote = async (groupId: string, content: string, createdBy: string, createdByName: string) => {
  try {
    const notesRef = collection(db, 'groups', groupId, 'pinnedNotes');
    const docRef = await addDoc(notesRef, {
      content: content.trim(),
      createdBy,
      createdByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating pinned note:', error);
    throw error;
  }
};

export const updatePinnedNote = async (groupId: string, noteId: string, content: string) => {
  try {
    const noteRef = doc(db, 'groups', groupId, 'pinnedNotes', noteId);
    await updateDoc(noteRef, {
      content: content.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating pinned note:', error);
    throw error;
  }
};

export const deletePinnedNote = async (groupId: string, noteId: string) => {
  try {
    const noteRef = doc(db, 'groups', groupId, 'pinnedNotes', noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    console.error('Error deleting pinned note:', error);
    throw error;
  }
};

export const subscribeToGroupNotes = (groupId: string, callback: (notes: PinnedNote[]) => void) => {
  const notesRef = collection(db, 'groups', groupId, 'pinnedNotes');
  const q = query(notesRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const notes: PinnedNote[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notes.push({
        id: doc.id,
        content: data.content,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });
    callback(notes);
  });
};

// Tasks
export interface GroupTask {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const createTask = async (groupId: string, taskData: Omit<GroupTask, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const tasksRef = collection(db, 'groups', groupId, 'tasks');
    const docRef = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (groupId: string, taskId: string, updates: Partial<GroupTask>) => {
  try {
    const taskRef = doc(db, 'groups', groupId, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (groupId: string, taskId: string) => {
  try {
    const taskRef = doc(db, 'groups', groupId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const subscribeToGroupTasks = (groupId: string, callback: (tasks: GroupTask[]) => void) => {
  const tasksRef = collection(db, 'groups', groupId, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const tasks: GroupTask[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        completed: data.completed || false,
        dueDate: data.dueDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });
    callback(tasks);
  });
};

// Polls
export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted for this option
}

export interface GroupPoll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export const createPoll = async (groupId: string, question: string, options: string[], createdBy: string, createdByName: string, expiresAt?: Date) => {
  try {
    const pollsRef = collection(db, 'groups', groupId, 'polls');
    const pollOptions: PollOption[] = options.map((text, index) => ({
      id: `option_${index}`,
      text,
      votes: [],
    }));
    
    const docRef = await addDoc(pollsRef, {
      question,
      options: pollOptions,
      createdBy,
      createdByName,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt || null,
      active: true,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating poll:', error);
    throw error;
  }
};

export const votePoll = async (groupId: string, pollId: string, optionId: string, userId: string) => {
  try {
    const pollRef = doc(db, 'groups', groupId, 'polls', pollId);
    const pollSnap = await getDoc(pollRef);
    
    if (!pollSnap.exists()) return;
    
    const pollData = pollSnap.data();
    const options = pollData.options.map((option: PollOption) => {
      // Remove user's vote from all options first
      const filteredVotes = option.votes.filter((vote: string) => vote !== userId);
      
      // Add vote to selected option
      if (option.id === optionId) {
        return { ...option, votes: [...filteredVotes, userId] };
      }
      
      return { ...option, votes: filteredVotes };
    });
    
    await updateDoc(pollRef, { options });
  } catch (error) {
    console.error('Error voting on poll:', error);
    throw error;
  }
};

export const closePoll = async (groupId: string, pollId: string) => {
  try {
    const pollRef = doc(db, 'groups', groupId, 'polls', pollId);
    await updateDoc(pollRef, { active: false });
  } catch (error) {
    console.error('Error closing poll:', error);
    throw error;
  }
};

export const subscribeToGroupPolls = (groupId: string, callback: (polls: GroupPoll[]) => void) => {
  const pollsRef = collection(db, 'groups', groupId, 'polls');
  const q = query(pollsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const polls: GroupPoll[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      polls.push({
        id: doc.id,
        question: data.question,
        options: data.options,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate(),
        active: data.active,
      });
    });
    callback(polls);
  });
};
