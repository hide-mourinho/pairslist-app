import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useStatusBarHeight = () => {
  const [statusBarHeight, setStatusBarHeight] = useState(0);

  useEffect(() => {
    const getStatusBarHeight = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      const platform = Capacitor.getPlatform();
      
      if (platform === 'android') {
        // Default Android status bar height in pixels
        // This is typically 24dp, which translates to different pixels based on screen density
        // For most devices, 25-30px is a safe default
        setStatusBarHeight(25);
        
        // Try to get the actual status bar height if StatusBar plugin is available
        try {
          const importStatusBar = new Function('return import("@capacitor/status-bar")');
          const statusBarModule = await importStatusBar();
          const StatusBar = statusBarModule.StatusBar;
          
          // Get status bar info if available
          const info = await StatusBar.getInfo?.();
          if (info?.height) {
            setStatusBarHeight(info.height);
          }
        } catch (error) {
          console.log('Using default status bar height for Android');
        }
      } else if (platform === 'ios') {
        // iOS handles safe areas better with env()
        setStatusBarHeight(0);
      }
    };

    getStatusBarHeight();
  }, []);

  return statusBarHeight;
};