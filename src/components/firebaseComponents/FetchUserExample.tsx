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
  fetchUserInfoUsingId,
  userExists,
  fetchBasicUserInfo,
  UserProfile,
} from "./fetchUserInfoUsingId";
import { Loader2, User, Search, AlertCircle } from "lucide-react";

export const FetchUserExample: React.FC = () => {
  const [userId, setUserId] = useState("");
  const [userInfo, setUserInfo] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);

  const handleFetchUser = async () => {
    if (!userId.trim()) {
      setError("Please enter a user ID");
      return;
    }

    setLoading(true);
    setError(null);
    setUserInfo(null);
    setExists(null);

    try {
      // First check if user exists
      const userExistsResult = await userExists(userId);
      setExists(userExistsResult);

      if (userExistsResult) {
        // Fetch full user info
        const fetchedUser = await fetchUserInfoUsingId(userId);
        setUserInfo(fetchedUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchBasicInfo = async () => {
    if (!userId.trim()) {
      setError("Please enter a user ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const basicInfo = await fetchBasicUserInfo(userId);
      if (basicInfo) {
        console.log("Basic user info:", basicInfo);
        alert(`User: ${basicInfo.name} (${basicInfo.email})`);
      } else {
        alert("User not found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch basic user info"
      );
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Fetch User Information
          </CardTitle>
          <CardDescription>
            Enter a user ID to fetch their information from the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter user ID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchUser()}
            />
            <Button onClick={handleFetchUser} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Fetch Full Info
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchBasicInfo}
              disabled={loading}
            >
              Basic Info
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {exists !== null && (
            <div className="flex items-center gap-2">
              <Badge variant={exists ? "default" : "destructive"}>
                {exists ? "User Exists" : "User Not Found"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {userInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userInfo.photoURL} />
                <AvatarFallback>{getInitials(userInfo.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{userInfo.name}</h3>
                <p className="text-muted-foreground">{userInfo.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={userInfo.verified ? "default" : "secondary"}>
                    {userInfo.verified ? "Verified" : "Not Verified"}
                  </Badge>
                  <Badge variant="outline">{userInfo.role}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Account Details</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">User ID:</span> {userInfo.uid}
                  </p>
                  <p>
                    <span className="font-medium">Joined:</span>{" "}
                    {formatDate(userInfo.joinedAt)}
                  </p>
                  <p>
                    <span className="font-medium">Last Activity:</span>{" "}
                    {formatDate(userInfo.lastActivity)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Groups Joined:</span>{" "}
                    {userInfo.stats.groupsJoined}
                  </p>
                  <p>
                    <span className="font-medium">Total Paid:</span>{" "}
                    {userInfo.preferences.currency}
                    {userInfo.stats.totalPaid.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium">Total Owed:</span>{" "}
                    {userInfo.preferences.currency}
                    {userInfo.stats.totalOwed.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Preferences</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Currency:</span>{" "}
                    {userInfo.preferences.currency}
                  </p>
                  <p>
                    <span className="font-medium">Theme:</span>{" "}
                    {userInfo.preferences.theme}
                  </p>
                  <p>
                    <span className="font-medium">Language:</span>{" "}
                    {userInfo.preferences.language}
                  </p>
                  <p>
                    <span className="font-medium">Notifications:</span>{" "}
                    {userInfo.preferences.notifications ? "On" : "Off"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
