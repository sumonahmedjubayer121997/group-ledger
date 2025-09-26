import { db } from "@/lib/firebase"; // your Firebase config
import { doc, getDoc } from "firebase/firestore";

// 🔥 Fetch group name using group ID
export const getGroupName = async (groupId: string) => {
  // Reference the group document in the 'groups' collection
  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);

  // Return the group name if document exists, otherwise return null
  if (groupSnap.exists()) {
    const groupData = groupSnap.data();
    return groupData.name || null; // Assuming 'name' field exists in the document
  } else {
    return null; // Group not found
  }
};
