import { db } from '@/lib/firebase'; // your Firebase config
import {
  doc,
  collection,
  getDocs,
  getDoc,
} from 'firebase/firestore';

// 🔁 Fetch all group members with their photoURLs
export const fetchGroupMembersWithPhotos = async (groupId: string) => {
  const membersRef = collection(db, 'groups', groupId, 'members');
  const membersSnap = await getDocs(membersRef);

  const membersWithPhotos = await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const userId = memberDoc.id;

      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);

      const userData = userSnap.exists() ? userSnap.data() : null;

      return {
        userId,
        ...memberDoc.data(),
        photoURL: userData?.photoURL || null,
        name: userData?.name || 'Unnamed',
        email: userData?.email || '',
      };
    })
  );

  return membersWithPhotos;
};
