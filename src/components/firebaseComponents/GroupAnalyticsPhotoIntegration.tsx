// Example of how to integrate photo fetching into GroupAnalytics.tsx

import React from "react";
import {
  fetchMultipleUserPhotos,
  fetchUserPhotoWithFallback,
  fetchUserPhotoUsingId,
  userHasPhoto,
} from "./fetchUserInfoUsingId";

// Enhanced UserAvatar component using the new photo functions
const EnhancedUserAvatar: React.FC<{
  userId: string;
  name: string;
  bgColor: string;
  textColor: string;
  size?: "sm" | "md" | "lg";
}> = ({ userId, name, bgColor, textColor, size = "md" }) => {
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Size configurations
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base",
  };

  React.useEffect(() => {
    const loadUserPhoto = async () => {
      try {
        setLoading(true);

        // Use the new photo fetching function with fallback
        const photo = await fetchUserPhotoWithFallback(
          userId,
          "" // Empty fallback to show initials instead
        );

        // Only set photoURL if it's not the fallback (empty string)
        setPhotoURL(photo || null);

        console.log(`📸 Photo loaded for ${name}:`, photo);
      } catch (error) {
        console.error(`❌ Error loading photo for ${name}:`, error);
        setPhotoURL(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserPhoto();
    }
  }, [userId, name]);

  const getInitials = (displayName: string) => {
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center overflow-hidden relative`}
    >
      {loading ? (
        <div className="animate-pulse bg-gray-300 w-full h-full rounded-full" />
      ) : photoURL ? (
        <img
          src={photoURL}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setPhotoURL(null)}
        />
      ) : (
        <span className={`${textColor} font-medium`}>{getInitials(name)}</span>
      )}
    </div>
  );
};

// Optimized approach for GroupAnalytics component
const OptimizedGroupAnalyticsPhotoLoader: React.FC<{ group: any }> = ({
  group,
}) => {
  const [userPhotos, setUserPhotos] = React.useState<{
    [userId: string]: string | null;
  }>({});
  const [photoLoadingStates, setPhotoLoadingStates] = React.useState<{
    [userId: string]: boolean;
  }>({});

  React.useEffect(() => {
    const loadAllUserPhotos = async () => {
      try {
        console.log("🔍 Loading photos for all group members...");

        // Extract user IDs from group members
        const userIds = group.members
          .map((member: any) => member.id || member.userId)
          .filter((id: string) => id);

        if (userIds.length === 0) {
          console.warn("⚠️ No valid user IDs found in group members");
          return;
        }

        // Set loading state for all users
        const loadingStates = userIds.reduce((acc: any, id: string) => {
          acc[id] = true;
          return acc;
        }, {});
        setPhotoLoadingStates(loadingStates);

        // Use the batch photo fetching function for better performance
        const photos = await fetchMultipleUserPhotos(userIds);
        setUserPhotos(photos);

        // Clear loading states
        const clearedLoadingStates = userIds.reduce((acc: any, id: string) => {
          acc[id] = false;
          return acc;
        }, {});
        setPhotoLoadingStates(clearedLoadingStates);

        console.log("✅ All user photos loaded:", photos);

        // Log photo availability
        Object.entries(photos).forEach(([userId, photoURL]) => {
          const member = group.members.find(
            (m: any) => (m.id || m.userId) === userId
          );
          const memberName = member?.name || "Unknown User";

          if (photoURL) {
            console.log(`📸 ${memberName} (${userId}): ${photoURL}`);
          } else {
            console.log(`❌ ${memberName} (${userId}): No photo`);
          }
        });
      } catch (error) {
        console.error("❌ Error loading user photos:", error);

        // Clear loading states on error
        const userIds = group.members
          .map((member: any) => member.id || member.userId)
          .filter((id: string) => id);

        const clearedLoadingStates = userIds.reduce((acc: any, id: string) => {
          acc[id] = false;
          return acc;
        }, {});
        setPhotoLoadingStates(clearedLoadingStates);
      }
    };

    if (group.members && group.members.length > 0) {
      loadAllUserPhotos();
    }
  }, [group.members]);

  // Function to get photo URL for a specific user
  const getUserPhoto = (userId: string): string | null => {
    return userPhotos[userId] || null;
  };

  // Function to check if a user's photo is loading
  const isPhotoLoading = (userId: string): boolean => {
    return photoLoadingStates[userId] || false;
  };

  // Render your analytics with optimized photo loading
  return (
    <div>
      <h3>Group Members</h3>
      <div className="flex flex-wrap gap-2">
        {group.members.map((member: any, index: number) => {
          const userId = member.id || member.userId;
          const photoURL = getUserPhoto(userId);
          const loading = isPhotoLoading(userId);

          return (
            <div key={userId || index} className="flex flex-col items-center">
              <EnhancedUserAvatar
                userId={userId}
                name={member.name}
                bgColor="bg-blue-500"
                textColor="text-white"
                size="lg"
              />
              <span className="text-xs mt-1">{member.name}</span>
              {loading && (
                <span className="text-xs text-gray-500">Loading...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Alternative: Single photo fetcher hook
export const useUserPhoto = (userId: string) => {
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadPhoto = async () => {
      try {
        setLoading(true);
        setError(null);

        const photo = await fetchUserPhotoUsingId(userId);
        setPhotoURL(photo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load photo");
        setPhotoURL(null);
      } finally {
        setLoading(false);
      }
    };

    loadPhoto();
  }, [userId]);

  return { photoURL, loading, error };
};

// Alternative: Multiple photos hook
export const useMultipleUserPhotos = (userIds: string[]) => {
  const [photos, setPhotos] = React.useState<{
    [userId: string]: string | null;
  }>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setLoading(false);
      return;
    }

    const loadPhotos = async () => {
      try {
        setLoading(true);
        setError(null);

        const userPhotos = await fetchMultipleUserPhotos(userIds);
        setPhotos(userPhotos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load photos");
        setPhotos({});
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [userIds.join(",")]); // Join for dependency comparison

  return { photos, loading, error };
};

export { EnhancedUserAvatar, OptimizedGroupAnalyticsPhotoLoader };
