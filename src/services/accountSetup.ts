import type { User } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  createUserProfile,
  getUserProfile,
  mergeTemporaryUserWithRealUser,
  registerEmailIndex,
  updateUserProfile,
  type UserProfile,
} from "./firebaseService";

/**
 * Runs after every sign-in: makes sure the profile exists and is current, publishes the verified
 * email for exact-email lookups, and joins any groups this email was invited to.
 * Loaded on demand by AuthContext so the landing page doesn't download Firestore.
 */
export async function ensureUserProfileExists(
  firebaseUser: User,
  additionalData: Record<string, unknown> = {}
): Promise<UserProfile | null> {
  if (!firebaseUser.email) {
    console.error("No email found for user");
    return null;
  }

  // Old placeholder profiles with this email (created before invites existed) are removed,
  // but only once the email is verified, so nobody can claim someone else's address.
  if (firebaseUser.emailVerified) {
    const sameEmail = await getDocs(query(collection(db, "users"), where("email", "==", firebaseUser.email)));
    for (const other of sameEmail.docs) {
      if (other.id === firebaseUser.uid) continue;
      await deleteDoc(doc(db, "users", other.id)).catch((error) =>
        console.error("Error deleting placeholder profile:", error)
      );
    }
  }

  let profile = await getUserProfile(firebaseUser.uid);
  if (profile) {
    await updateUserProfile(firebaseUser.uid, { verified: firebaseUser.emailVerified }).catch((error) =>
      console.error("Error updating last activity:", error)
    );
    profile = {
      ...profile,
      verified: firebaseUser.emailVerified,
      emailVerified: firebaseUser.emailVerified,
      lastActivity: new Date(),
    };
  } else {
    profile = await createUserProfile({
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || (additionalData.name as string) || "User",
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
      verified: firebaseUser.emailVerified,
      preferences: { currency: "USD", theme: "system", language: "en" },
      ...additionalData,
    });
  }

  await registerEmailIndex(firebaseUser).catch((error) => console.error("Error registering email lookup:", error));
  await mergeTemporaryUserWithRealUser(firebaseUser).catch((error) =>
    console.error("Error joining invited groups:", error)
  );
  return profile;
}
