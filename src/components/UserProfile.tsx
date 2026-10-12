import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileBasicInfo } from "./profile/ProfileBasicInfo";
import { ProfileFinancialSummary } from "./profile/ProfileFinancialSummary";
import { ProfileAccountSettings } from "./profile/ProfileAccountSettings";
import { ProfilePreferences } from "./profile/ProfilePreferences";
import { ProfilePrivacySecurity } from "./profile/ProfilePrivacySecurity";
import { ProfileActivityFeed } from "./profile/ProfileActivityFeed";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { PageSkeleton } from "./PageSkeleton";

const tabs = [
  { value: "overview", label: "Overview" },
  { value: "financial", label: "Money" },
  { value: "activity", label: "Activity" },
  { value: "settings", label: "Account" },
  { value: "preferences", label: "Preferences" },
  { value: "privacy", label: "Privacy" },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

export const UserProfile: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || "");

  // The profile document arrives a moment after sign-in.
  if (!user || !userProfile) return <PageSkeleton />;

  const name = userProfile.name || userProfile.displayName || user.displayName || "You";

  return (
    <>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar className="h-20 w-20 border">
            <AvatarImage src={photoURL || userProfile.photoURL || undefined} alt="" className="object-cover" />
            <AvatarFallback className="bg-secondary text-lg font-medium">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <ProfilePictureUpload currentPhotoURL={photoURL || userProfile.photoURL || undefined} onPhotoChange={setPhotoURL} />
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[34px] leading-[38px] tracking-[-0.01em] sm:text-[44px] sm:leading-[48px]">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="truncate">{user.email}</span>
            {user.emailVerified && (
              <span className="inline-flex items-center gap-1 text-settled">
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
              </span>
            )}
            <Link to="/budgets" className="rounded-sm underline-offset-4 hover:text-foreground hover:underline">
              Your budgets
            </Link>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-4">
          <ProfileBasicInfo user={user} userProfile={userProfile} />
        </TabsContent>
        <TabsContent value="financial" className="mt-6 space-y-4">
          <ProfileFinancialSummary userProfile={userProfile} />
        </TabsContent>
        <TabsContent value="activity" className="mt-6 space-y-4">
          <ProfileActivityFeed userProfile={userProfile} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6 space-y-4">
          <ProfileAccountSettings user={user} userProfile={userProfile} />
        </TabsContent>
        <TabsContent value="preferences" className="mt-6 space-y-4">
          <ProfilePreferences userProfile={userProfile} />
        </TabsContent>
        <TabsContent value="privacy" className="mt-6 space-y-4">
          <ProfilePrivacySecurity user={user} userProfile={userProfile} />
        </TabsContent>
      </Tabs>
    </>
  );
};
