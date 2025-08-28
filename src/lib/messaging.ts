import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { app, db } from './firebase';
import { isNativeApp } from './platform';
import { Capacitor } from '@capacitor/core';
import type { FCMToken, NotificationSettings } from '../app/types';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Dynamic imports for Capacitor PushNotifications
let PushNotifications: any = null;

const loadPushNotifications = async () => {
  if (Capacitor.isNativePlatform() && !PushNotifications) {
    try {
      const module = new Function('return import("@capacitor/push-notifications")')();
      const pushModule = await module;
      PushNotifications = pushModule.PushNotifications;
    } catch (error) {
      console.warn('PushNotifications not available:', error);
    }
  }
};

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
  if (Capacitor.isNativePlatform()) {
    await loadPushNotifications();
    
    if (!PushNotifications) {
      console.log('PushNotifications not available on this platform');
      return null;
    }

    try {
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      await PushNotifications.register();
      
      return new Promise((resolve) => {
        const listener = PushNotifications.addListener('registration', async (token: any) => {
          console.log('Registration token: ', token.value);
          await saveFCMToken(uid, token.value, Capacitor.getPlatform() as 'android' | 'ios');
          listener.remove();
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (err: any) => {
          console.error('Registration error: ', err);
          listener.remove();
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Error getting native FCM token:', error);
      return null;
    }
  } else {
    // Web platform
    const messaging = initializeMessaging();
    if (!messaging || !vapidKey) {
      console.error('Messaging not initialized or VAPID key missing');
      return null;
    }

    try {
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        await saveFCMToken(uid, token, 'web');
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
      return null;
    }
  }
};

export const saveFCMToken = async (
  uid: string, 
  token: string, 
  platform: 'web' | 'android' | 'ios'
): Promise<void> => {
  try {
    const tokenData: Omit<FCMToken, 'createdAt' | 'lastUsed'> & { 
      createdAt: any; 
      lastUsed: any;
    } = {
      token,
      platform,
      createdAt: serverTimestamp(),
      lastUsed: serverTimestamp(),
    };
    
    await setDoc(doc(db, `users/${uid}/fcmTokens`, token), tokenData);
    console.log('FCM token saved successfully');
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

export const getUserFCMTokens = async (uid: string): Promise<FCMToken[]> => {
  try {
    const tokensSnapshot = await getDocs(collection(db, `users/${uid}/fcmTokens`));
    return tokensSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastUsed: doc.data().lastUsed?.toDate(),
    })) as FCMToken[];
  } catch (error) {
    console.error('Error getting FCM tokens:', error);
    return [];
  }
};

export const removeFCMToken = async (uid: string, token: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, `users/${uid}/fcmTokens`, token));
    
    if (!Capacitor.isNativePlatform() && messaging) {
      await deleteToken(messaging);
    }
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
};

export const setupMessageListener = (callback: (payload: any) => void) => {
  if (Capacitor.isNativePlatform()) {
    // Native platform listeners
    loadPushNotifications().then(() => {
      if (PushNotifications) {
        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
          console.log('Push notification received (foreground):', notification);
          callback(notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
          console.log('Push notification action performed:', notification);
          callback(notification);
        });
      }
    });
  } else {
    // Web platform
    const messaging = initializeMessaging();
    if (!messaging) return;

    return onMessage(messaging, (payload) => {
      console.log('Message received (foreground):', payload);
      callback(payload);
    });
  }
};

export const isNotificationSupported = (): boolean => {
  return Capacitor.isNativePlatform() || ('Notification' in window && 'serviceWorker' in navigator);
};

// Notification settings management
export const getNotificationSettings = async (uid: string): Promise<NotificationSettings> => {
  try {
    const settingsDoc = await getDocs(query(
      collection(db, `users/${uid}/settings`),
      where('__name__', '==', 'notifications')
    ));
    
    if (settingsDoc.empty) {
      // Return default settings
      return {
        enabled: true,
        reminders: true,
        assignments: true,
        silentHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      };
    }
    
    return settingsDoc.docs[0].data() as NotificationSettings;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
};

export const updateNotificationSettings = async (
  uid: string,
  settings: NotificationSettings
): Promise<void> => {
  try {
    await setDoc(doc(db, `users/${uid}/settings`, 'notifications'), {
      ...settings,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};