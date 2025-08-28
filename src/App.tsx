import { useEffect } from 'react';
import { AppRouter } from './app/routes';
import { initializeMessaging } from './lib/messaging';
import { initSentry } from './lib/sentry';
import { initGA4 } from './lib/analytics';
import { initializeStatusBar } from './lib/statusbar';
import { initializeRevenueCat } from './lib/revenuecat';

function App() {
  useEffect(() => {
    // Initialize Sentry
    initSentry();
    
    // Initialize GA4
    initGA4();
    
    // Initialize Firebase Messaging
    initializeMessaging();
    
    // Initialize Status Bar for native platforms
    initializeStatusBar();
    
    // Initialize RevenueCat for native platforms
    initializeRevenueCat();
  }, []);

  return <AppRouter />;
}

export default App;
