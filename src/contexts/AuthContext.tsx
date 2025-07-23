
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt: Date;
  preferences: {
    currency: string;
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

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
      console.log('Auth state changed:', firebaseUser?.uid);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Try to update last login time, but don't fail if it doesn't work
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastLoginAt: new Date()
          }).catch(error => {
            console.log('Could not update last login time:', error);
          });
          
          // Fetch user profile
          await fetchUserProfile(firebaseUser.uid);
        } catch (error) {
          console.log('Error updating user data:', error);
          // Continue without user profile if there's an error
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const fetchUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        } as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't throw error, just continue without profile
    }
  };

  const createUserProfile = async (firebaseUser: User, additionalData: any = {}) => {
    const userProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || additionalData.displayName || '',
      photoURL: firebaseUser.photoURL,
      phoneNumber: firebaseUser.phoneNumber,
      emailVerified: firebaseUser.emailVerified,
      role: 'user',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      preferences: {
        currency: 'USD',
        notifications: true,
        theme: 'light',
      },
      ...additionalData,
    };

    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      setUserProfile(userProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Don't throw error, just continue without profile
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(firebaseUser, { displayName });
      
      // Send verification email
      await sendEmailVerification(firebaseUser);
      
      // Create user profile in Firestore
      await createUserProfile(firebaseUser, { displayName });
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user: firebaseUser } = await signInWithPopup(auth, provider);
      
      // Check if user profile exists, create if not
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          await createUserProfile(firebaseUser);
        }
      } catch (error) {
        console.error('Error checking/creating user profile:', error);
      }
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
      await updateDoc(doc(db, 'users', user.uid), updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No user logged in');
    
    // Reauthenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
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
