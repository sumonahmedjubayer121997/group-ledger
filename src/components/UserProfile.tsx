
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Settings, 
  CreditCard, 
  Bell, 
  Shield, 
  Activity,
  Download,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { ProfileBasicInfo } from './profile/ProfileBasicInfo';
import { ProfileFinancialSummary } from './profile/ProfileFinancialSummary';
import { ProfileAccountSettings } from './profile/ProfileAccountSettings';
import { ProfilePreferences } from './profile/ProfilePreferences';
import { ProfilePrivacySecurity } from './profile/ProfilePrivacySecurity';
import { ProfileActivityFeed } from './profile/ProfileActivityFeed';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { useIsMobile } from '@/hooks/use-mobile';

interface UserProfileProps {
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [profilePhotoURL, setProfilePhotoURL] = useState(userProfile?.photoURL || '');
  const isMobile = useIsMobile();

  console.log('UserProfile render - user:', user?.uid, 'userProfile:', userProfile?.displayName, 'loading:', loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No user found. Please log in.</p>
        </div>
      </div>
    );
  }

  // Create a fallback userProfile if it doesn't exist
  const profileData = userProfile || {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'User',
    photoURL: profilePhotoURL || user.photoURL,
    phoneNumber: user.phoneNumber,
    emailVerified: user.emailVerified,
    role: 'user' as const,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    preferences: {
      currency: 'USD',
      notifications: true,
      theme: 'light' as const,
    },
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handlePhotoChange = (url: string) => {
    setProfilePhotoURL(url);
  };

  const tabItems = [
    { value: 'overview', label: 'Overview', icon: User },
    { value: 'financial', label: 'Financial', icon: CreditCard },
    { value: 'settings', label: 'Settings', icon: Settings },
    { value: 'preferences', label: 'Preferences', icon: Bell },
    { value: 'privacy', label: 'Privacy', icon: Shield },
    { value: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between mb-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <h1 className="text-lg font-semibold">Profile</h1>
            <div className="w-16" /> {/* Spacer */}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                <AvatarImage src={profilePhotoURL || profileData.photoURL || undefined} />
                <AvatarFallback className="text-sm sm:text-lg font-semibold">
                  {getInitials(profileData.displayName || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2">
                <ProfilePictureUpload 
                  currentPhotoURL={profilePhotoURL || profileData.photoURL || undefined}
                  onPhotoChange={handlePhotoChange}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">
                {(profileData as any).name || (profileData as any).displayName}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base truncate">
                {profileData.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  👤 {profileData.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
                {((profileData as any).verified || (profileData as any).emailVerified) && (
                  <Badge variant="outline" className="text-green-600 text-xs">
                    ✅ Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {onClose && !isMobile && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 p-1 h-auto">
                {tabItems.map((item) => (
                  <TabsTrigger 
                    key={item.value}
                    value={item.value} 
                    className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-auto"
                  >
                    <item.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden text-[10px] leading-tight">{item.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <div className="mt-4 sm:mt-6">
            <TabsContent value="overview" className="space-y-4">
              <ProfileBasicInfo user={user} userProfile={profileData as any} />
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <ProfileFinancialSummary userProfile={profileData as any} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <ProfileAccountSettings user={user} userProfile={profileData as any} />
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <ProfilePreferences userProfile={profileData as any} />
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <ProfilePrivacySecurity user={user} userProfile={profileData as any} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <ProfileActivityFeed userProfile={profileData as any} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
