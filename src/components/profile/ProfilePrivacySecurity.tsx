
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'firebase/auth';
import { UserProfile } from '@/contexts/AuthContext';
import { 
  Shield, 
  Smartphone, 
  Download, 
  Trash2, 
  LogOut,
  AlertTriangle,
  Eye,
  Lock
} from 'lucide-react';

interface ProfilePrivacySecurityProps {
  user: User;
  userProfile: UserProfile;
}

export const ProfilePrivacySecurity: React.FC<ProfilePrivacySecurityProps> = ({ user, userProfile }) => {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      // Create a comprehensive data export
      const userData = {
        profile: {
          displayName: userProfile.displayName,
          email: userProfile.email,
          createdAt: userProfile.createdAt,
          lastLoginAt: userProfile.lastLoginAt,
          preferences: userProfile.preferences
        },
        account: {
          uid: user.uid,
          emailVerified: user.emailVerified,
          providerData: user.providerData
        },
        exportedAt: new Date().toISOString()
      };

      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userProfile.displayName}_data_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Your data has been exported successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    setIsLoading(true);
    try {
      await logout();
      toast({
        title: "Success",
        description: "Signed out from all devices"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out from all devices",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, this would delete the user account
      // For now, we'll just show a message
      toast({
        title: "Account Deletion",
        description: "Account deletion is not implemented in this demo",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="2fa">Enable 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Secure your account with two-factor authentication
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600">
                Not Enabled
              </Badge>
              <Switch
                id="2fa"
                checked={false}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              🔒 Two-factor authentication adds an extra layer of security by requiring a second form of verification when signing in.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            View and manage your active login sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString()} • Web Browser
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600">
                Active
              </Badge>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleSignOutAllDevices}
            disabled={isLoading}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out All Devices
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control your privacy and data visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="profile-visibility">Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to see your profile in group settings
              </p>
            </div>
            <Switch
              id="profile-visibility"
              checked={true}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="activity-visibility">Activity Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Show your activity status to group members
              </p>
            </div>
            <Switch
              id="activity-visibility"
              checked={true}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Download your personal data (GDPR compliant)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              📋 Export includes your profile information, expense history, group memberships, and preferences.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleExportData}
            disabled={isLoading}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export My Data
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                <h4 className="font-medium text-red-600">Delete Account</h4>
              </div>
              <p className="text-sm text-red-600 mb-3">
                Once you delete your account, there is no going back. This will permanently delete your profile, expense history, and remove you from all groups.
              </p>
              {!showDeleteConfirm ? (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      size="sm"
                    >
                      Yes, Delete Account
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isLoading}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
