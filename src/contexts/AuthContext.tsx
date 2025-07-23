
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile as updateFirebaseUserProfile, 
  UserProfile,
  mergeTemporaryUserWithRealUser 
} from '@/services/firebaseService';

// Export the UserProfile interface for use in other components
export type { UserProfile };

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const processingAuthChange = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Prevent multiple simultaneous auth state changes
      if (processingAuthChange.current) {
        console.log('🔄 Auth change already in progress, skipping...');
        return;
      }

      console.log('🔐 Auth state changed:', firebaseUser?.uid || 'logged out');
      processingAuthChange.current = true;
      
      try {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Check and merge any duplicate users first
          await mergeTemporaryUserWithRealUser(firebaseUser);
          
          // Then ensure profile exists
          await ensureUserProfileExists(firebaseUser);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('❌ Error in auth state change:', error);
      } finally {
        setLoading(false);
        processingAuthChange.current = false;
      }
    });

    return unsubscribe;
  }, []);

  const ensureUserProfileExists = async (firebaseUser: User, additionalData: any = {}) => {
    try {
      if (!firebaseUser.email) {
        console.error('❌ No email found for user');
        return;
      }

      console.log(`👤 Ensuring profile exists for user: ${firebaseUser.uid}`);
      
      // Try to get the profile with the current UID
      let profile = await getUserProfile(firebaseUser.uid);
      
      if (profile) {
        console.log('✅ Profile found for current UID');
        setUserProfile(profile);
        return;
      }

      // If no profile exists, create a new one
      console.log('🆕 Creating new user profile...');
      profile = await createUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || additionalData.displayName || 'User',
        photoURL: firebaseUser.photoURL || null,
        emailVerified: firebaseUser.emailVerified,
        role: 'user',
        preferences: {
          currency: 'USD',
          theme: 'light',
          notifications: true,
        },
        ...additionalData,
      });

      setUserProfile(profile);
      console.log('✅ User profile created and set');
      
    } catch (error) {
      console.error('❌ Error ensuring user profile exists:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Profile will be handled by onAuthStateChanged
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(firebaseUser, { displayName });
      await sendEmailVerification(firebaseUser);
      // Profile will be created by onAuthStateChanged
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      // Profile will be handled by onAuthStateChanged
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await updateFirebaseUserProfile(user.uid, updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in');
    
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const resendVerificationEmail = async () => {
    if (!user) throw new Error('No user logged in');
    await sendEmailVerification(user);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    resetPassword,
    updateUserProfile,
    updateUserPassword,
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
