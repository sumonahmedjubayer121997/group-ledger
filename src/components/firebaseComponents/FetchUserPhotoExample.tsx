import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  fetchUserPhotoUsingId,
  fetchMultipleUserPhotos,
  userHasPhoto,
  fetchUserPhotoWithFallback,
} from "./fetchUserInfoUsingId";
import {
  Loader2,
  Camera,
  Search,
  Users,
  AlertCircle,
  ImageIcon,
} from "lucide-react";

export const FetchUserPhotoExample: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [multipleIds, setMultipleIds] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [multiplePhotos, setMultiplePhotos] = useState<{
    [userId: string]: string | null;
  }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null);

  const handleFetchSinglePhoto = async () => {
    if (!userId.trim()) {
      setError("Please enter a user ID");
      return;
    }

    setLoading(true);
    setError(null);
    setPhotoURL(null);
    setHasPhoto(null);

    try {
      // Check if user has photo
      const hasPhotoResult = await userHasPhoto(userId);
      setHasPhoto(hasPhotoResult);

      // Fetch the actual photo URL
      const fetchedPhotoURL = await fetchUserPhotoUsingId(userId);
      setPhotoURL(fetchedPhotoURL);

      if (fetchedPhotoURL) {
        console.log("✅ Photo URL fetched:", fetchedPhotoURL);
      } else {
        console.log("❌ No photo found for user");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user photo"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPhotoWithFallback = async () => {
    if (!userId.trim()) {
      setError("Please enter a user ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const photoWithFallback = await fetchUserPhotoWithFallback(
        userId,
        "https://via.placeholder.com/150/007ACC/ffffff?text=User"
      );
      setPhotoURL(photoWithFallback);
      console.log("✅ Photo with fallback:", photoWithFallback);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user photo"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMultiplePhotos = async () => {
    if (!multipleIds.trim()) {
      setError("Please enter multiple user IDs (comma-separated)");
      return;
    }

    setLoading(true);
    setError(null);
    setMultiplePhotos({});

    try {
      // Split IDs by comma and clean them
      const idsArray = multipleIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (idsArray.length === 0) {
        setError("Please provide valid user IDs");
        return;
      }

      const fetchedPhotos = await fetchMultipleUserPhotos(idsArray);
      setMultiplePhotos(fetchedPhotos);
      console.log("✅ Multiple photos fetched:", fetchedPhotos);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch multiple photos"
      );
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Single Photo Fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fetch Single User Photo
          </CardTitle>
          <CardDescription>
            Enter a user ID to fetch their profile photo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter user ID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchSinglePhoto()}
            />
            <Button onClick={handleFetchSinglePhoto} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Fetch Photo
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchPhotoWithFallback}
              disabled={loading}
            >
              <ImageIcon className="h-4 w-4" />
              With Fallback
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {hasPhoto !== null && (
            <div className="flex items-center gap-2">
              <Badge variant={hasPhoto ? "default" : "secondary"}>
                {hasPhoto ? "Has Photo" : "No Photo"}
              </Badge>
            </div>
          )}

          {photoURL && (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoURL} alt="User Photo" />
                <AvatarFallback>{getInitials(userId)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">Photo URL:</h3>
                <p className="text-sm text-muted-foreground break-all">
                  {photoURL}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigator.clipboard.writeText(photoURL)}
                >
                  Copy URL
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multiple Photos Fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Fetch Multiple User Photos
          </CardTitle>
          <CardDescription>
            Enter multiple user IDs (comma-separated) to fetch their photos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter user IDs separated by commas..."
              value={multipleIds}
              onChange={(e) => setMultipleIds(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleFetchMultiplePhotos()
              }
            />
            <Button onClick={handleFetchMultiplePhotos} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Fetch All
            </Button>
          </div>

          {Object.keys(multiplePhotos).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(multiplePhotos).map(([userId, photoURL]) => (
                <div key={userId} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={photoURL || undefined}
                        alt={`User ${userId}`}
                      />
                      <AvatarFallback>{getInitials(userId)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        User ID: {userId}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={photoURL ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {photoURL ? "Has Photo" : "No Photo"}
                        </Badge>
                      </div>
                      {photoURL && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {photoURL}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Available Functions:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                • <code>fetchUserPhotoUsingId(id)</code> - Get photo URL
              </li>
              <li>
                • <code>getUserPhotoById(id)</code> - Alternative name
              </li>
              <li>
                • <code>fetchMultipleUserPhotos(ids[])</code> - Get multiple
                photos
              </li>
              <li>
                • <code>userHasPhoto(id)</code> - Check if user has photo
              </li>
              <li>
                • <code>fetchUserPhotoWithFallback(id, fallback)</code> - Get
                photo with fallback
              </li>
            </ul>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <h4 className="font-semibold text-sm mb-2">Code Example:</h4>
            <pre className="text-xs text-muted-foreground overflow-x-auto">
              {`import { fetchUserPhotoUsingId } from './fetchUserInfoUsingId';

const getUserPhoto = async (userId: string) => {
  try {
    const photoURL = await fetchUserPhotoUsingId(userId);
    if (photoURL) {
      console.log('User photo:', photoURL);
    } else {
      console.log('No photo found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
