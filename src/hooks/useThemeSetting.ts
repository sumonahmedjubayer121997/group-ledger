import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";

export type ThemeChoice = "light" | "dark" | "system";

/**
 * The app's one theme setting. Applied immediately and saved to the profile, so it follows you to
 * other devices (SignedInApp applies the saved choice on sign-in).
 */
export function useThemeSetting() {
  const { theme, setTheme } = useTheme();
  const { userProfile, updateUserProfile } = useAuth();
  const change = (value: string) => {
    const next = value as ThemeChoice;
    setTheme(next);
    if (userProfile) {
      void updateUserProfile({
        preferences: { ...userProfile.preferences, theme: next, themeUpdatedAt: Date.now() },
      }).catch(() => undefined);
    }
  };
  return { theme: theme as ThemeChoice, change };
}
