import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../lib/firebase';
import { isNativeApp } from '../../lib/platform';
import { initializeGoogleAuth, signInWithGoogleNative, signOutGoogleNative } from '../../lib/nativeAuth';
import { initSentry } from '../../lib/sentry';
import { setUserId, analytics } from '../../lib/analytics';
import type { User as AppUser } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Google Auth for native platforms
    if (isNativeApp) {
      initializeGoogleAuth();
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await createOrUpdateUserDoc(firebaseUser);
        const appUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          createdAt: new Date(),
        };
        setUser(appUser);
        
        // Set Sentry user context
        const sentry = initSentry();
        sentry?.setUserContext({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
        });
        
        // Set GA4 user ID
        setUserId(firebaseUser.uid);
      } else {
        setUser(null);
        // Clear Sentry user context
        const sentry = initSentry();
        sentry?.setUserContext({} as any);
        
        // Clear GA4 user ID
        setUserId('');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createOrUpdateUserDoc = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        displayName: firebaseUser.displayName || '',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        createdAt: new Date(),
      });
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await createOrUpdateUserDoc(result.user);
      
      analytics.signUp('email');
      
      return result.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      analytics.signIn('email');
      return result.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      if (isNativeApp) {
        const result = await signInWithGoogleNative();
        await createOrUpdateUserDoc(result.user);
        analytics.signIn('google');
        return result.user;
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await createOrUpdateUserDoc(result.user);
        analytics.signIn('google');
        return result.user;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      analytics.signOut();
      if (isNativeApp) {
        await signOutGoogleNative();
      }
      await signOut(auth);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
  };
};