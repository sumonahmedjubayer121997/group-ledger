import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Your Firebase instance

export const logAllUserEmails = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    console.log(`📋 Found ${snapshot.size} users:`);

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📧 ${data.email} (uid: ${doc.id})`);
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
  }
};
