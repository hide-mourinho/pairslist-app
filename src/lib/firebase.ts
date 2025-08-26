import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

if (import.meta.env.DEV) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch {
    console.log('Functions emulator already connected or unavailable');
  }
}

export const enableOfflineSupport = async () => {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
  } catch (error) {
    console.error('Error setting up offline support:', error);
  }
};