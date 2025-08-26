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
import type { User as AppUser } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await createOrUpdateUserDoc(firebaseUser);
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          createdAt: new Date(),
        });
      } else {
        setUser(null);
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
      
      const result = await signInWithPopup(auth, googleProvider);
      await createOrUpdateUserDoc(result.user);
      return result.user;
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