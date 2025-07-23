
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/contexts/AuthContext';
import { 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  DollarSign,
  Palette,
  Languages,
  Smartphone
} from 'lucide-react';

interface ProfilePreferencesProps {
  userProfile: UserProfile;
}

export const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({ userProfile }) => {
  const { updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [preferences, setPreferences] = useState(userProfile.preferences || {
    currency: 'GBP',
    notifications: true,
    theme: 'light'
  });

  const handleUpdatePreferences = async (updates: Partial<typeof preferences>) => {
    setIsLoading(true);
    try {
      const newPreferences = { ...preferences, ...updates };
      await updateUserProfile({ preferences: newPreferences });
      setPreferences(newPreferences);
      toast({
        title: "Success",
        description: "Preferences updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currencies = [
    { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' }
  ];

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'System', icon: Smartphone }
  ];

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for group activity and expense updates
              </p>
            </div>
            <Switch
              id="notifications"
              checked={preferences.notifications}
              onCheckedChange={(checked) => handleUpdatePreferences({ notifications: checked })}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="debt-reminders">Debt Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminders about unpaid debts and pending settlements
              </p>
            </div>
            <Switch
              id="debt-reminders"
              checked={true}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="group-invites">Group Invitations</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications when invited to new groups
              </p>
            </div>
            <Switch
              id="group-invites"
              checked={true}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Display Settings
          </CardTitle>
          <CardDescription>
            Customize your app appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select 
              value={preferences.theme} 
              onValueChange={(value) => handleUpdatePreferences({ theme: value as 'light' | 'dark' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {themes.map(theme => {
                  const Icon = theme.icon;
                  return (
                    <SelectItem key={theme.value} value={theme.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {theme.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Settings
          </CardTitle>
          <CardDescription>
            Set your preferred currency for expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select 
              value={preferences.currency} 
              onValueChange={(value) => handleUpdatePreferences({ currency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{currency.symbol}</span>
                      {currency.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Language Settings
          </CardTitle>
          <CardDescription>
            Set your preferred language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Beta Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Beta Features
          </CardTitle>
          <CardDescription>
            Try out new features before they're released
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="beta-features">Enable Beta Features</Label>
              <p className="text-sm text-muted-foreground">
                Get early access to new features and improvements
              </p>
            </div>
            <Switch
              id="beta-features"
              checked={false}
              disabled={isLoading}
            />
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Have feedback on beta features? Use the feedback button to let us know what you think!
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              Send Feedback
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
