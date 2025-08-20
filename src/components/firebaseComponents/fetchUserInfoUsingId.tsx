import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// User Profile Interface (reused from firebaseService.ts)
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
  role?: "user" | "admin";
  createdAt?: Date;
  lastLoginAt?: Date;
}

/**
 * Fetches user information from the database using the user ID
 * @param id - The user ID to search for
 * @returns Promise<UserProfile | null> - Returns user profile if found, null if not found
 */
export const fetchUserInfoUsingId = async (
  id: string
): Promise<UserProfile | null> => {
  try {
    // Validate input
    if (!id || typeof id !== "string" || id.trim() === "") {
      console.warn(
        "❌ fetchUserInfoUsingId: Invalid or empty user ID provided"
      );
      return null;
    }

    const trimmedId = id.trim();
    console.log(`🔍 Fetching user info for ID: ${trimmedId}`);

    // Reference to the user document in Firestore
    const userRef = doc(db, "users", trimmedId);

    // Fetch the document
    const userDoc = await getDoc(userRef);

    // Check if the document exists
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log(`✅ User found for ID ${trimmedId}:`, data);

      // Transform the data to match the UserProfile interface
      const userProfile: UserProfile = {
        uid: userDoc.id,
        name: data.name || "",
        email: data.email || "",
        photoURL: data.photoURL || undefined,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),
        verified: data.verified || false,
        preferences: {
          currency: data.preferences?.currency || "USD",
          theme: data.preferences?.theme || "light",
          language: data.preferences?.language || "en",
          notifications: data.preferences?.notifications || true,
        },
        stats: {
          groupsJoined: data.stats?.groupsJoined || 0,
          totalPaid: data.stats?.totalPaid || 0,
          totalOwed: data.stats?.totalOwed || 0,
        },
        // Additional compatibility properties
        displayName: data.name || data.displayName || "",
        emailVerified: data.verified || data.emailVerified || false,
        role: data.role || "user",
        createdAt:
          data.joinedAt?.toDate() || data.createdAt?.toDate() || new Date(),
        lastLoginAt:
          data.lastActivity?.toDate() ||
          data.lastLoginAt?.toDate() ||
          new Date(),
      };

      console.log(`✅ Processed user profile for ${trimmedId}:`, userProfile);
      return userProfile;
    } else {
      console.log(`❌ No user found with ID: ${trimmedId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching user info for ID ${id}:`, error);

    // Re-throw the error so the calling function can handle it
    throw new Error(
      `Failed to fetch user info: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Alternative function name for better clarity
 * Same functionality as fetchUserInfoUsingId
 */
export const getUserById = fetchUserInfoUsingId;

/**
 * Checks if a user exists in the database
 * @param id - The user ID to check
 * @returns Promise<boolean> - Returns true if user exists, false otherwise
 */
export const userExists = async (id: string): Promise<boolean> => {
  try {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return false;
    }

    const trimmedId = id.trim();
    const userRef = doc(db, "users", trimmedId);
    const userDoc = await getDoc(userRef);

    const exists = userDoc.exists();
    console.log(`🔍 User existence check for ${trimmedId}: ${exists}`);

    return exists;
  } catch (error) {
    console.error(`❌ Error checking user existence for ID ${id}:`, error);
    return false;
  }
};

/**
 * Fetches basic user information (name, email, photoURL only)
 * @param id - The user ID to search for
 * @returns Promise<{name: string, email: string, photoURL?: string} | null>
 */
export const fetchBasicUserInfo = async (
  id: string
): Promise<{ name: string; email: string; photoURL?: string } | null> => {
  try {
    const userProfile = await fetchUserInfoUsingId(id);

    if (userProfile) {
      return {
        name: userProfile.name,
        email: userProfile.email,
        photoURL: userProfile.photoURL,
      };
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching basic user info for ID ${id}:`, error);
    throw error;
  }
};

/**
 * Fetches user photo URL using user ID
 * @param id - The user ID to search for
 * @returns Promise<string | null> - Returns photo URL if found, null if not found or no photo
 */
export const fetchUserPhotoUsingId = async (
  id: string
): Promise<string | null> => {
  try {
    // Validate input
    if (!id || typeof id !== "string" || id.trim() === "") {
      console.warn(
        "❌ fetchUserPhotoUsingId: Invalid or empty user ID provided"
      );
      return null;
    }

    const trimmedId = id.trim();
    console.log(`🔍 Fetching user photo for ID: ${trimmedId}`);

    // Reference to the user document in Firestore
    const userRef = doc(db, "users", trimmedId);

    // Fetch the document
    const userDoc = await getDoc(userRef);

    // Check if the document exists
    if (userDoc.exists()) {
      const data = userDoc.data();
      const photoURL = data.photoURL;

      if (photoURL && typeof photoURL === "string" && photoURL.trim() !== "") {
        console.log(`✅ Photo URL found for ${trimmedId}: ${photoURL}`);
        return photoURL;
      } else {
        console.log(`❌ No photo URL found for user ${trimmedId}`);
        return null;
      }
    } else {
      console.log(`❌ No user found with ID: ${trimmedId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching user photo for ID ${id}:`, error);
    throw new Error(
      `Failed to fetch user photo: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Alternative function name for better clarity
 * Same functionality as fetchUserPhotoUsingId
 */
export const getUserPhotoById = fetchUserPhotoUsingId;

/**
 * Fetches multiple user photos using an array of user IDs
 * @param ids - Array of user IDs to search for
 * @returns Promise<{[userId: string]: string | null}> - Returns object with userId as key and photoURL as value
 */
export const fetchMultipleUserPhotos = async (
  ids: string[]
): Promise<{ [userId: string]: string | null }> => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.warn("❌ fetchMultipleUserPhotos: Invalid or empty IDs array");
      return {};
    }

    console.log(`🔍 Fetching photos for ${ids.length} users`);

    const photoPromises = ids.map(async (id) => {
      try {
        const photoURL = await fetchUserPhotoUsingId(id);
        return { id, photoURL };
      } catch (error) {
        console.error(`❌ Error fetching photo for user ${id}:`, error);
        return { id, photoURL: null };
      }
    });

    const results = await Promise.all(photoPromises);

    // Convert array to object
    const photoMap: { [userId: string]: string | null } = {};
    results.forEach(({ id, photoURL }) => {
      photoMap[id] = photoURL;
    });

    console.log(`✅ Fetched photos for ${ids.length} users:`, photoMap);
    return photoMap;
  } catch (error) {
    console.error("❌ Error fetching multiple user photos:", error);
    throw new Error(
      `Failed to fetch user photos: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Checks if a user has a photo URL
 * @param id - The user ID to check
 * @returns Promise<boolean> - Returns true if user has a photo, false otherwise
 */
export const userHasPhoto = async (id: string): Promise<boolean> => {
  try {
    const photoURL = await fetchUserPhotoUsingId(id);
    return photoURL !== null;
  } catch (error) {
    console.error(`❌ Error checking if user has photo for ID ${id}:`, error);
    return false;
  }
};

/**
 * Fetches user photo with fallback options
 * @param id - The user ID to search for
 * @param fallbackURL - Optional fallback URL if no photo found
 * @returns Promise<string> - Returns photo URL or fallback URL
 */
export const fetchUserPhotoWithFallback = async (
  id: string,
  fallbackURL: string = "/placeholder.svg"
): Promise<string> => {
  try {
    const photoURL = await fetchUserPhotoUsingId(id);
    return photoURL || fallbackURL;
  } catch (error) {
    console.error(
      `❌ Error fetching user photo with fallback for ID ${id}:`,
      error
    );
    return fallbackURL;
  }
};
