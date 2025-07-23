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
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createUserProfile, getUserProfile, updateUserProfile as updateFirebaseUserProfile, UserProfile } from '@/services/firebaseService';
import { mergeTemporaryUserWithRealUser } from '@/services/firebaseService';

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
      console.log('Auth state changed:', firebaseUser?.uid);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Always ensure user profile exists and handle duplicates
        await ensureUserProfileExists(firebaseUser);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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

const ensureUserProfileExists = async (firebaseUser: User, additionalData: any = {}) => {
  try {
    if (!firebaseUser.email) {
      console.error('❌ No email found for user');
      return;
    }

    // 🔍 Check if user already exists by email in users collection
    const existingUserSnapshot = await getDocs(query(
      collection(db, 'users'),
      where('email', '==', firebaseUser.email)
    ));

    if (!existingUserSnapshot.empty) {
      const existingUser = existingUserSnapshot.docs[0];
      const existingUid = existingUser.id;

      console.log(`📧 Found existing user by email: ${existingUid}`);

      // If this is a different UID, we need to merge
      if (existingUid !== firebaseUser.uid) {
        console.log(`🔁 Merging temporary user ${existingUid} → real user ${firebaseUser.uid}`);
        
        // Merge the temporary user with the real user
        await mergeTemporaryUserWithRealUser(firebaseUser);
        
        // Delete the old temporary user document
        try {
          await deleteDoc(doc(db, 'users', existingUid));
          console.log(`🗑️ Deleted temporary user document: ${existingUid}`);
        } catch (deleteError) {
          console.error('Error deleting temporary user:', deleteError);
        }
      }

      // Try to get the profile with the real UID
      const profile = await getUserProfile(firebaseUser.uid);
      if (profile) {
        setUserProfile(profile);
        return;
      }
    }

    // ✅ Check if profile exists for current UID (fallback)
    const currentProfile = await getUserProfile(firebaseUser.uid);
    if (currentProfile) {
      setUserProfile(currentProfile);
      return;
    }

    // 🆕 Create new profile if none exists
    console.log('Creating new user profile...');
    const profile = await createUserProfile({
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || additionalData.displayName || 'User',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || null,
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
    console.error('Error ensuring user profile exists:', error);
  }
};


  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      await mergeTemporaryUserWithRealUser(firebaseUser);
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
      await ensureUserProfileExists(firebaseUser, { name: displayName });
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user: firebaseUser } = await signInWithPopup(auth, provider);
      await ensureUserProfileExists(firebaseUser);
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
