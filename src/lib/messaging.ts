import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from './firebase';
import { isNativeApp } from './platform';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export interface DeviceToken {
  token: string;
  platform: 'web' | 'android' | 'ios';
  updatedAt: Date;
}

// Initialize Firebase Messaging (Web only)
let messaging: ReturnType<typeof getMessaging> | null = null;

export const initializeMessaging = () => {
  if (isNativeApp || typeof window === 'undefined') {
    return null;
  }
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
      return null;
    }
  }
  
  return messaging;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const getFCMToken = async (uid: string): Promise<string | null> => {
  if (isNativeApp) {
    console.log('FCM token not available in native app');
    return null;
  }

  const messaging = initializeMessaging();
  if (!messaging || !vapidKey) {
    console.error('Messaging not initialized or VAPID key missing');
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      // Save token to Firestore
      await saveDeviceToken(uid, token, 'web');
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

export const saveDeviceToken = async (
  uid: string, 
  token: string, 
  platform: 'web' | 'android' | 'ios'
): Promise<void> => {
  try {
    await setDoc(doc(db, `users/${uid}/deviceTokens`, token), {
      token,
      platform,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving device token:', error);
    throw error;
  }
};

export const removeDeviceToken = async (uid: string, token: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, `users/${uid}/deviceTokens`, token));
    
    if (!isNativeApp && messaging) {
      await deleteToken(messaging);
    }
  } catch (error) {
    console.error('Error removing device token:', error);
    throw error;
  }
};

export const setupMessageListener = (callback: (payload: any) => void) => {
  if (isNativeApp) return;

  const messaging = initializeMessaging();
  if (!messaging) return;

  return onMessage(messaging, (payload) => {
    console.log('Message received (foreground):', payload);
    callback(payload);
  });
};

export const isNotificationSupported = (): boolean => {
  return !isNativeApp && 'Notification' in window && 'serviceWorker' in navigator;
};