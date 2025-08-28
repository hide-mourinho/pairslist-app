import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  getFCMToken,
  getUserFCMTokens,
  removeFCMToken,
  getNotificationSettings,
  updateNotificationSettings,
  setupMessageListener,
  isNotificationSupported,
  requestNotificationPermission
} from '../../lib/messaging';
import type { FCMToken, NotificationSettings } from '../types';

interface NotificationState {
  tokens: FCMToken[];
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    tokens: [],
    settings: null,
    isLoading: true,
    error: null,
    isSupported: isNotificationSupported()
  });

  const updateState = (updates: Partial<NotificationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Initialize notifications
  useEffect(() => {
    if (!user) {
      updateState({ isLoading: false });
      return;
    }

    const initialize = async () => {
      try {
        updateState({ isLoading: true, error: null });

        // Get current tokens and settings
        const [tokens, settings] = await Promise.all([
          getUserFCMTokens(user.uid),
          getNotificationSettings(user.uid)
        ]);

        updateState({
          tokens,
          settings,
          isLoading: false
        });

        // Set up message listener
        setupMessageListener((payload) => {
          console.log('Notification received:', payload);
          // Handle foreground notifications here
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'PairsList', {
              body: payload.notification?.body,
              icon: '/icon-192.png',
              badge: '/icon-192.png'
            });
          }
        });
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Initialization failed',
          isLoading: false
        });
      }
    };

    initialize();
  }, [user]);

  const requestPermissionAndToken = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      updateState({ isLoading: true, error: null });

      // Request permission (Web only)
      if (!await requestNotificationPermission()) {
        updateState({ error: 'Notification permission denied', isLoading: false });
        return false;
      }

      // Get FCM token
      const token = await getFCMToken(user.uid);
      if (!token) {
        updateState({ error: 'Failed to get notification token', isLoading: false });
        return false;
      }

      // Refresh tokens list
      const tokens = await getUserFCMTokens(user.uid);
      updateState({ tokens, isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to request permission and token:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Permission request failed',
        isLoading: false
      });
      return false;
    }
  };

  const removeToken = async (token: string): Promise<boolean> => {
    if (!user) return false;

    try {
      updateState({ isLoading: true, error: null });
      
      await removeFCMToken(user.uid, token);
      
      // Refresh tokens list
      const tokens = await getUserFCMTokens(user.uid);
      updateState({ tokens, isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to remove token:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to remove token',
        isLoading: false
      });
      return false;
    }
  };

  const updateSettings = async (newSettings: NotificationSettings): Promise<boolean> => {
    if (!user) return false;

    try {
      updateState({ isLoading: true, error: null });
      
      await updateNotificationSettings(user.uid, newSettings);
      updateState({ settings: newSettings, isLoading: false });
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to update settings',
        isLoading: false
      });
      return false;
    }
  };

  const hasActiveToken = state.tokens.length > 0;
  const canReceiveNotifications = state.isSupported && hasActiveToken && state.settings?.enabled;

  return {
    ...state,
    hasActiveToken,
    canReceiveNotifications,
    requestPermissionAndToken,
    removeToken,
    updateSettings
  };
};