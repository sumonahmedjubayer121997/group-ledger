import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const findSimilarEmailUIDs = async (inputEmail: string): Promise<{ email: string, uid: string }[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const input = inputEmail.trim().toLowerCase();
    const similarUsers: { email: string, uid: string }[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.email?.trim().toLowerCase();

      if (!email) return;

      // Check for similarity
      if (email === input || email.includes(input) || input.includes(email)) {
        similarUsers.push({ email, uid: doc.id });  // `doc.id` is the UID
      }
    });

    if (similarUsers.length > 0) {
      console.log(`🔍 Similar emails to "${inputEmail}":`, similarUsers);
    } else {
      console.log(`✅ No similar emails found for: "${inputEmail}"`);
    }

    return similarUsers;
  } catch (error) {
    console.error('❌ Error checking similar emails:', error);
    return [];
  }
};
