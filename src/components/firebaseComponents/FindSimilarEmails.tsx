import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const findSimilarEmails = async (inputEmail: string): Promise<string[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const input = inputEmail.trim().toLowerCase();
    const similarEmails: string[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.email?.trim().toLowerCase();

      if (!email) return;

      // Basic similarity logic (exact match or partial match)
      if (email === input || email.includes(input) || input.includes(email)) {
        similarEmails.push(email);
      }
    });

    if (similarEmails.length > 0) {
      console.log(`🔍 Similar emails to "${inputEmail}":`, similarEmails);
    } else {
      console.log(`✅ No similar emails found for: "${inputEmail}"`);
    }

    return similarEmails;
  } catch (error) {
    console.error('❌ Error checking similar emails:', error);
    return [];
  }
};
