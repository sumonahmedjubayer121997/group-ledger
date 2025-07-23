import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { createUserProfile, getUserProfile, updateUserProfile as updateFirebaseUserProfile, UserProfile, linkPendingInvitationsToUser } from '@/services/firebaseService';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.uid, firebaseUser?.email);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log('Ensuring user profile exists for:', firebaseUser.email);
          await ensureUserProfileExists(firebaseUser);
        } catch (error) {
          console.error('Error ensuring user profile exists:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const ensureUserProfileExists = async (firebaseUser: User) => {
    try {
      console.log('Checking for existing profile for UID:', firebaseUser.uid);
      // First, try to fetch existing profile
      const existingProfile = await getUserProfile(firebaseUser.uid);
      if (existingProfile) {
        console.log('Found existing user profile:', existingProfile.email);
        setUserProfile(existingProfile);
        return;
      }
    } catch (error) {
      console.log('No existing profile found, will create one:', error);
    }

    // If no profile exists, create one
    try {
      console.log('Creating user profile for:', firebaseUser.email, 'with UID:', firebaseUser.uid);
      const newProfile = await createUserProfile({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email!,
        photoURL: firebaseUser.photoURL || undefined,
        verified: firebaseUser.emailVerified,
        preferences: {
          currency: 'USD',
          theme: 'light',
          language: 'en',
        },
      });
      
      console.log('Successfully created user profile:', newProfile);
      setUserProfile(newProfile);
      
      // Link any pending email invitations to this user
      if (firebaseUser.email) {
        try {
          console.log('Linking pending invitations for:', firebaseUser.email);
          await linkPendingInvitationsToUser(firebaseUser.email, firebaseUser.uid);
        } catch (error) {
          console.error('Error linking pending invitations during sign-in:', error);
        }
      }
    } catch (createError) {
      console.error('Error creating user profile during sign-in:', createError);
      // Set user profile to null if creation fails
      setUserProfile(null);
    }
  };

  const fetchUserProfile = async (uid: string) => {
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        setUserProfile(profile);
      } else {
        throw new Error('User profile does not exist');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const createUserProfileFromFirebaseUser = async (firebaseUser: User, additionalData: any = {}) => {
    try {
      const profile = await createUserProfile({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || additionalData.displayName || 'User',
        email: firebaseUser.email!,
        photoURL: firebaseUser.photoURL || undefined,
        verified: firebaseUser.emailVerified,
        preferences: {
          currency: 'USD',
          theme: 'light',
          language: 'en',
        },
        ...additionalData,
      });
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('Logging in user:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful for:', result.user.email);
      // Profile creation will be handled by onAuthStateChanged
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      console.log('Registering new user:', email);
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(firebaseUser, { displayName });
      await sendEmailVerification(firebaseUser);
      
      // Create profile directly here for registration
      await createUserProfileFromFirebaseUser(firebaseUser, { name: displayName });
      
      // Link any pending email invitations to this user
      if (firebaseUser.email) {
        try {
          await linkPendingInvitationsToUser(firebaseUser.email, firebaseUser.uid);
        } catch (error) {
          console.error('Error linking pending invitations during registration:', error);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      console.log('Logging in with Google');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('Google login successful for:', result.user.email);
      // Profile creation will be handled by onAuthStateChanged
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
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
