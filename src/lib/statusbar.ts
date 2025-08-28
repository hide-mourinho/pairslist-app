import { Capacitor } from '@capacitor/core';

// Dynamic imports for native-only packages
let StatusBar: any = null;
let Style: any = null;

const loadStatusBar = async () => {
  if (Capacitor.isNativePlatform() && !StatusBar) {
    try {
      // Use Function constructor to avoid TypeScript static analysis
      const importStatusBar = new Function('return import("@capacitor/status-bar")');
      const statusBarModule = await importStatusBar();
      StatusBar = statusBarModule.StatusBar;
      Style = statusBarModule.Style;
    } catch (error) {
      console.warn('StatusBar not available:', error);
    }
  }
};

export const initializeStatusBar = async () => {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await loadStatusBar();
    
    if (!StatusBar || !Style) {
      console.warn('StatusBar not available on this platform');
      return;
    }

    // Set the status bar to have a white background with dark text
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
    await StatusBar.setStyle({ style: Style.Light });
    
    // Show the status bar (in case it was hidden)
    await StatusBar.show();
    
    // On Android, this ensures the WebView doesn't go under the status bar
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    console.error('Error initializing status bar:', error);
  }
};