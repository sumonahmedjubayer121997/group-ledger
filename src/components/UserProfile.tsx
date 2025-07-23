
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  CreditCard, 
  Bell, 
  Shield, 
  Activity,
  Download,
  Camera,
  Edit
} from 'lucide-react';
import { ProfileBasicInfo } from './profile/ProfileBasicInfo';
import { ProfileFinancialSummary } from './profile/ProfileFinancialSummary';
import { ProfileAccountSettings } from './profile/ProfileAccountSettings';
import { ProfilePreferences } from './profile/ProfilePreferences';
import { ProfilePrivacySecurity } from './profile/ProfilePrivacySecurity';
import { ProfileActivityFeed } from './profile/ProfileActivityFeed';

interface UserProfileProps {
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, userProfile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

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
    photoURL: user.photoURL,
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileData.photoURL || undefined} />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(profileData.displayName || 'User')}
              </AvatarFallback>
            </Avatar>
            <Button 
              size="sm" 
              variant="outline" 
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{(profileData as any).name || (profileData as any).displayName}</h1>
            <p className="text-muted-foreground">{profileData.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                👤 {profileData.role === 'admin' ? 'Admin' : 'User'}
              </Badge>
              {((profileData as any).verified || (profileData as any).emailVerified) && (
                <Badge variant="outline" className="text-green-600">
                  ✅ Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
};
