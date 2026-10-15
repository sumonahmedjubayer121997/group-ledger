import React, { useState } from 'react';
import { Bell, Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useThemeSetting } from '@/hooks/useThemeSetting';
import { SUPPORTED_CURRENCIES, toCurrencyCode } from '@/lib/money';

interface ProfilePreferencesProps {
  userProfile: UserProfile;
}

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Match device', icon: Monitor },
];

export const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({ userProfile }) => {
  const { updateUserProfile } = useAuth();
  const { toast } = useToast();
  const { theme, change } = useThemeSetting();
  const [currency, setCurrency] = useState(toCurrencyCode(userProfile.preferences?.currency));

  const saveCurrency = async (value: string) => {
    setCurrency(value);
    try {
      await updateUserProfile({ preferences: { ...userProfile.preferences, currency: value } });
      toast({ title: 'Default currency saved', description: `New groups will start in ${value}.` });
    } catch {
      toast({ title: "Couldn't save", description: 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Appearance</CardTitle>
          <CardDescription>Saved to your account, so it applies on your other devices too.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={change} className="grid gap-2 sm:grid-cols-3" aria-label="Theme">
            {themes.map(({ value, label, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`theme-${value}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-foreground"
              >
                <RadioGroupItem id={`theme-${value}`} value={value} />
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {label}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Default currency</CardTitle>
          <CardDescription>
            New groups start in this currency. Each group keeps its own currency, which you can change in its settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="default-currency" className="sr-only">
            Default currency
          </Label>
          <Select value={currency} onValueChange={saveCurrency}>
            <SelectTrigger id="default-currency" className="sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map(({ code, label }) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Notifications</CardTitle>
          <CardDescription className="flex items-start gap-2">
            <Bell className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Choose which notifications you get from the bell at the top of the page. Each group can also turn
            notifications off in its settings.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
