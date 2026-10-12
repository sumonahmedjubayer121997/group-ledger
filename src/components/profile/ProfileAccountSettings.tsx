
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleAuthProvider, linkWithPopup, unlink, type User } from 'firebase/auth';
import { mergeTemporaryUserWithRealUser, registerEmailIndex } from '@/services/firebaseService';
import { popupResolver } from '@/lib/firebaseApp';
import { UserProfile } from '@/contexts/AuthContext';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { 
  Key, 
  Mail, 
  User as UserIcon, 
  Shield, 
  Link,
  CheckCircle
} from 'lucide-react';

interface ProfileAccountSettingsProps {
  user: User;
  userProfile: UserProfile;
}

export const ProfileAccountSettings: React.FC<ProfileAccountSettingsProps> = ({ user, userProfile }) => {
  const { updateUserProfile, updateUserPassword, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhotoURL, setProfilePhotoURL] = useState(userProfile.photoURL || '');
  // Read from Firebase Auth (the source of truth), not the copy saved in the profile.
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [providers, setProviders] = useState(() => user.providerData.map((p) => p.providerId));
  const usesPassword = providers.includes('password');
  const usesGoogle = providers.includes('google.com');

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateUserProfile({ name: displayName });
      toast({
        title: "Success",
        description: "Display name updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update display name",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (url: string) => {
    setProfilePhotoURL(url);
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please check your current password.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      await resendVerificationEmail();
      toast({
        title: "Success",
        description: "Verification email sent successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** After clicking the link in the verification email, picks up the new status without signing out. */
  const handleCheckVerification = async () => {
    setIsLoading(true);
    try {
      await user.reload();
      if (!user.emailVerified) {
        toast({ title: 'Not verified yet', description: 'Open the link in the email we sent, then try again.' });
        return;
      }
      await user.getIdToken(true);
      setEmailVerified(true);
      await updateUserProfile({ verified: true, emailVerified: true });
      // Now friends can find this account by email, and pending group invites can be accepted.
      await registerEmailIndex(user);
      await mergeTemporaryUserWithRealUser(user);
      toast({ title: 'Email verified', description: 'Thanks! Friends can now add you by email.' });
    } catch (error) {
      console.error('Error checking verification:', error);
      toast({ title: "Couldn't check right now", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await linkWithPopup(user, new GoogleAuthProvider(), popupResolver);
      setProviders(result.user.providerData.map((p) => p.providerId));
      toast({ title: 'Google connected', description: 'You can now sign in with Google too.' });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      toast({
        title: "Couldn't connect Google",
        description:
          code === 'auth/credential-already-in-use'
            ? 'That Google account already has its own SplitWize account.'
            : code === 'auth/popup-blocked'
              ? 'Allow pop-ups for this site and try again.'
              : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsLoading(true);
    try {
      const updated = await unlink(user, 'google.com');
      setProviders(updated.providerData.map((p) => p.providerId));
      toast({ title: 'Google disconnected', description: 'Sign in with your email and password from now on.' });
    } catch {
      toast({ title: "Couldn't disconnect Google", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-sm">
            Update your display name and profile photo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm">Display Name</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="flex-1"
              />
              <Button 
                onClick={handleUpdateDisplayName}
                disabled={isLoading || displayName === userProfile.displayName}
                className="w-full sm:w-auto"
                size="sm"
              >
                Update
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Profile Photo</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="text-sm text-muted-foreground">
                Upload a custom photo or choose from our collection
              </div>
              <ProfilePictureUpload 
                currentPhotoURL={profilePhotoURL}
                onPhotoChange={handlePhotoChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Verification */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            Email Verification
          </CardTitle>
          <CardDescription className="text-sm">
            Verified emails let friends add you by email and let you accept group invites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2 min-w-0 flex-1">
              <p className="font-medium text-sm sm:text-base truncate">{userProfile.email}</p>
              <div className="flex items-center gap-2">
                {emailVerified ? (
                  <Badge variant="outline" className="text-settled text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-owes text-xs">
                    Pending Verification
                  </Badge>
                )}
              </div>
            </div>
            {!emailVerified && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleCheckVerification} disabled={isLoading} size="sm" className="w-full sm:w-auto">
                  I've verified it
                </Button>
                <Button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Resend email
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Settings */}
      {usesPassword ? (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Key className="h-4 w-4 sm:h-5 sm:w-5" />
            Password Settings
          </CardTitle>
          <CardDescription className="text-sm">
            Change your account password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          
          <Button 
            onClick={handleUpdatePassword}
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full"
            size="sm"
          >
            Update Password
          </Button>
        </CardContent>
      </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Key className="h-4 w-4 sm:h-5 sm:w-5" />
              Password
            </CardTitle>
            <CardDescription className="text-sm">
              You sign in with Google, so there's no SplitWize password to change. Manage your password in your Google account.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Link className="h-4 w-4 sm:h-5 sm:w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription className="text-sm">
            Ways you can sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-sm font-bold">G</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">Google</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {usesGoogle
                      ? usesPassword
                        ? 'Connected. You can sign in with Google or your password.'
                        : 'This is how you sign in.'
                      : 'Not connected'}
                  </p>
                </div>
              </div>
              {usesGoogle ? (
                usesPassword ? (
                  <Button variant="outline" size="sm" onClick={handleDisconnectGoogle} disabled={isLoading}>
                    Disconnect
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-settled text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )
              ) : (
                <Button variant="outline" size="sm" onClick={handleConnectGoogle} disabled={isLoading}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
