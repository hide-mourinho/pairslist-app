import { GoogleAuth } from '@southdevs/capacitor-google-auth';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import { isNativeApp } from './platform';

// Initialize Google Auth for native platforms
export const initializeGoogleAuth = async () => {
  if (!isNativeApp) return;
  
  try {
    await GoogleAuth.initialize({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  } catch (error) {
    console.error('Failed to initialize Google Auth:', error);
  }
};

export const signInWithGoogleNative = async () => {
  if (!isNativeApp) {
    throw new Error('Native Google Sign-in is only available on mobile devices');
  }

  try {
    const result = await GoogleAuth.signIn({
      scopes: ['profile', 'email'],
    });
    
    if (!result.authentication?.idToken) {
      throw new Error('No ID token received from Google Sign-in');
    }

    // Create Firebase credential with the Google ID token
    const credential = GoogleAuthProvider.credential(result.authentication.idToken);
    
    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(auth, credential);
    
    return {
      user: userCredential.user,
      googleUser: result,
    };
  } catch (error) {
    console.error('Native Google Sign-in failed:', error);
    throw error;
  }
};

export const signOutGoogleNative = async () => {
  if (!isNativeApp) return;
  
  try {
    await GoogleAuth.signOut();
  } catch (error) {
    console.error('Failed to sign out from Google:', error);
  }
};