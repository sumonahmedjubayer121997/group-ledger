# Fetch User Info Using ID - Documentation

This module provides functions to fetch user information and photos from the Firebase Firestore database using a user ID.

## Functions

## User Information Functions

### 1. `fetchUserInfoUsingId(id: string): Promise<UserProfile | null>`

**Description:** Fetches complete user information from the database using the user ID.

**Parameters:**

- `id` (string): The user ID to search for

**Returns:**

- `Promise<UserProfile | null>`: Returns user profile if found, null if not found

**Example Usage:**

```typescript
import { fetchUserInfoUsingId } from "./fetchUserInfoUsingId";

const getUserInfo = async (userId: string) => {
  try {
    const userInfo = await fetchUserInfoUsingId(userId);
    if (userInfo) {
      console.log("User found:", userInfo);
      console.log("Name:", userInfo.name);
      console.log("Email:", userInfo.email);
      console.log("Verified:", userInfo.verified);
    } else {
      console.log("User not found");
    }
  } catch (error) {
    console.error("Error fetching user:", error);
  }
};
```

### 2. `getUserById(id: string): Promise<UserProfile | null>`

**Description:** Alternative function name for `fetchUserInfoUsingId`. Same functionality.

### 3. `userExists(id: string): Promise<boolean>`

**Description:** Checks if a user exists in the database without fetching full data.

**Parameters:**

- `id` (string): The user ID to check

**Returns:**

- `Promise<boolean>`: Returns true if user exists, false otherwise

**Example Usage:**

```typescript
import { userExists } from "./fetchUserInfoUsingId";

const checkUser = async (userId: string) => {
  try {
    const exists = await userExists(userId);
    if (exists) {
      console.log("User exists in database");
    } else {
      console.log("User does not exist");
    }
  } catch (error) {
    console.error("Error checking user existence:", error);
  }
};
```

### 4. `fetchBasicUserInfo(id: string): Promise<{name: string, email: string, photoURL?: string} | null>`

**Description:** Fetches only basic user information (name, email, photoURL).

**Parameters:**

- `id` (string): The user ID to search for

**Returns:**

- `Promise<{name: string, email: string, photoURL?: string} | null>`: Returns basic user info if found, null if not found

**Example Usage:**

```typescript
import { fetchBasicUserInfo } from "./fetchUserInfoUsingId";

const getBasicInfo = async (userId: string) => {
  try {
    const basicInfo = await fetchBasicUserInfo(userId);
    if (basicInfo) {
      console.log("User:", basicInfo.name);
      console.log("Email:", basicInfo.email);
      if (basicInfo.photoURL) {
        console.log("Photo:", basicInfo.photoURL);
      }
    } else {
      console.log("User not found");
    }
  } catch (error) {
    console.error("Error fetching basic user info:", error);
  }
};
```

## Photo Fetching Functions

### 5. `fetchUserPhotoUsingId(id: string): Promise<string | null>`

**Description:** Fetches only the user's photo URL from the database.

**Parameters:**

- `id` (string): The user ID to search for

**Returns:**

- `Promise<string | null>`: Returns photo URL if found, null if not found or no photo

**Example Usage:**

```typescript
import { fetchUserPhotoUsingId } from "./fetchUserInfoUsingId";

const getUserPhoto = async (userId: string) => {
  try {
    const photoURL = await fetchUserPhotoUsingId(userId);
    if (photoURL) {
      console.log("User photo URL:", photoURL);
      // Use the photo URL in your component
      setUserPhoto(photoURL);
    } else {
      console.log("No photo found for user");
      // Use default/placeholder image
      setUserPhoto("/placeholder.svg");
    }
  } catch (error) {
    console.error("Error fetching user photo:", error);
  }
};
```

### 6. `getUserPhotoById(id: string): Promise<string | null>`

**Description:** Alternative function name for `fetchUserPhotoUsingId`. Same functionality.

### 7. `fetchMultipleUserPhotos(ids: string[]): Promise<{[userId: string]: string | null}>`

**Description:** Fetches photo URLs for multiple users at once.

**Parameters:**

- `ids` (string[]): Array of user IDs to search for

**Returns:**

- `Promise<{[userId: string]: string | null}>`: Returns object with userId as key and photoURL as value

**Example Usage:**

```typescript
import { fetchMultipleUserPhotos } from "./fetchUserInfoUsingId";

const getMultipleUserPhotos = async (userIds: string[]) => {
  try {
    const photos = await fetchMultipleUserPhotos(userIds);
    console.log("User photos:", photos);

    // Usage example:
    // photos = { 'user1': 'https://...', 'user2': null, 'user3': 'https://...' }
    Object.entries(photos).forEach(([userId, photoURL]) => {
      if (photoURL) {
        console.log(`User ${userId} has photo: ${photoURL}`);
      } else {
        console.log(`User ${userId} has no photo`);
      }
    });
  } catch (error) {
    console.error("Error fetching multiple user photos:", error);
  }
};
```

### 8. `userHasPhoto(id: string): Promise<boolean>`

**Description:** Checks if a user has a photo URL without fetching the actual URL.

**Parameters:**

- `id` (string): The user ID to check

**Returns:**

- `Promise<boolean>`: Returns true if user has a photo, false otherwise

**Example Usage:**

```typescript
import { userHasPhoto } from "./fetchUserInfoUsingId";

const checkUserPhoto = async (userId: string) => {
  try {
    const hasPhoto = await userHasPhoto(userId);
    if (hasPhoto) {
      console.log("User has a profile photo");
      // Show photo icon or fetch actual photo
    } else {
      console.log("User has no profile photo");
      // Show default avatar
    }
  } catch (error) {
    console.error("Error checking user photo:", error);
  }
};
```

### 9. `fetchUserPhotoWithFallback(id: string, fallbackURL?: string): Promise<string>`

**Description:** Fetches user photo URL with a fallback option if no photo is found.

**Parameters:**

- `id` (string): The user ID to search for
- `fallbackURL` (string, optional): Fallback URL to return if no photo found (default: "/placeholder.svg")

**Returns:**

- `Promise<string>`: Always returns a string - either the photo URL or fallback URL

**Example Usage:**

```typescript
import { fetchUserPhotoWithFallback } from "./fetchUserInfoUsingId";

const getUserPhotoWithFallback = async (userId: string) => {
  try {
    // Will always return a photo URL, either real or fallback
    const photoURL = await fetchUserPhotoWithFallback(
      userId,
      "https://via.placeholder.com/150/007ACC/ffffff?text=User"
    );

    console.log("Photo URL (with fallback):", photoURL);
    // This can be directly used in img src or Avatar component
    setUserPhoto(photoURL);
  } catch (error) {
    console.error("Error fetching user photo with fallback:", error);
    // Even in error case, you might want to use the fallback
    setUserPhoto("/placeholder.svg");
  }
};
```

## UserProfile Interface

The `UserProfile` interface includes the following properties:

```typescript
interface UserProfile {
  uid: string; // User ID
  name: string; // User's display name
  email: string; // User's email address
  photoURL?: string; // User's profile picture URL (optional)
  joinedAt: Date; // When user joined
  lastActivity: Date; // Last activity timestamp
  verified: boolean; // Email verification status
  preferences: {
    // User preferences
    currency: string;
    theme: string;
    language: string;
    notifications?: boolean;
  };
  stats: {
    // User statistics
    groupsJoined: number;
    totalPaid: number;
    totalOwed: number;
  };
  displayName?: string; // Alternative display name
  emailVerified?: boolean; // Email verification status
  role?: "user" | "admin"; // User role
  createdAt?: Date; // Account creation date
  lastLoginAt?: Date; // Last login timestamp
}
```

## Error Handling

All functions include proper error handling:

- Invalid or empty IDs return null or false
- Network errors are caught and re-thrown with descriptive messages
- Console logging for debugging purposes

## Usage in Components

### Basic User Info Component

```typescript
import React, { useState, useEffect } from "react";
import { fetchUserInfoUsingId, UserProfile } from "./fetchUserInfoUsingId";

const UserDisplayComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const userInfo = await fetchUserInfoUsingId(userId);
        setUser(userInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>Verified: {user.verified ? "Yes" : "No"}</p>
    </div>
  );
};
```

### Photo-focused Component

```typescript
import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchUserPhotoWithFallback,
  fetchUserInfoUsingId,
} from "./fetchUserInfoUsingId";

const UserAvatarComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const [photoURL, setPhotoURL] = useState<string>("/placeholder.svg");
  const [userName, setUserName] = useState<string>("User");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPhoto = async () => {
      try {
        setLoading(true);

        // Method 1: Get photo with fallback (always returns a URL)
        const photo = await fetchUserPhotoWithFallback(
          userId,
          "https://via.placeholder.com/150/007ACC/ffffff?text=User"
        );
        setPhotoURL(photo);

        // Method 2: Get user name for fallback initials
        const userInfo = await fetchUserInfoUsingId(userId);
        if (userInfo) {
          setUserName(userInfo.name);
        }
      } catch (error) {
        console.error("Error loading user photo:", error);
        setPhotoURL("/placeholder.svg");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserPhoto();
    }
  }, [userId]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <Avatar className="h-10 w-10">
        <AvatarFallback>...</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className="h-10 w-10">
      <AvatarImage src={photoURL} alt={userName} />
      <AvatarFallback>{getInitials(userName)}</AvatarFallback>
    </Avatar>
  );
};
```

### Multiple Users Photo Grid

```typescript
import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchMultipleUserPhotos,
  fetchUserInfoUsingId,
} from "./fetchUserInfoUsingId";

const UserPhotoGrid: React.FC<{ userIds: string[] }> = ({ userIds }) => {
  const [photos, setPhotos] = useState<{ [userId: string]: string | null }>({});
  const [userNames, setUserNames] = useState<{ [userId: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsersData = async () => {
      try {
        setLoading(true);

        // Fetch all photos at once
        const userPhotos = await fetchMultipleUserPhotos(userIds);
        setPhotos(userPhotos);

        // Fetch user names for fallback initials
        const namePromises = userIds.map(async (id) => {
          try {
            const userInfo = await fetchUserInfoUsingId(id);
            return { id, name: userInfo?.name || "User" };
          } catch {
            return { id, name: "User" };
          }
        });

        const nameResults = await Promise.all(namePromises);
        const namesMap = nameResults.reduce((acc, { id, name }) => {
          acc[id] = name;
          return acc;
        }, {} as { [userId: string]: string });

        setUserNames(namesMap);
      } catch (error) {
        console.error("Error loading users data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userIds.length > 0) {
      loadUsersData();
    }
  }, [userIds]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
};
```

## Performance Tips

### 1. Photo Caching

For better performance, consider caching photo URLs:

```typescript
const photoCache = new Map<string, string>();

const getCachedUserPhoto = async (userId: string): Promise<string> => {
  if (photoCache.has(userId)) {
    return photoCache.get(userId)!;
  }

  const photoURL = await fetchUserPhotoWithFallback(userId);
  photoCache.set(userId, photoURL);
  return photoURL;
};
```

### 2. Batch Photo Requests

When you need multiple photos, use `fetchMultipleUserPhotos` instead of multiple individual calls:

```typescript
// ❌ Don't do this
const photos = await Promise.all(
  userIds.map((id) => fetchUserPhotoUsingId(id))
);

// ✅ Do this instead
const photos = await fetchMultipleUserPhotos(userIds);
```

### 3. Check Existence First

For conditional loading, check if user has photo first:

```typescript
const hasPhoto = await userHasPhoto(userId);
if (hasPhoto) {
  const photoURL = await fetchUserPhotoUsingId(userId);
  // Use the photo
}
```

## Notes

- All functions are async and return Promises
- Functions validate input parameters
- Comprehensive logging for debugging
- Compatible with existing Firebase setup
- Uses Firestore 'users' collection
- Handles both old and new user document formats
- Photo URLs are returned as-is from the database
- Fallback options available for better UX
- Supports batch operations for better performance
