import { useEffect } from 'react';
import { AppRouter } from './app/routes';
import { initializeMessaging } from './lib/messaging';
import { initSentry } from './lib/sentry';
import { initGA4 } from './lib/analytics';

function App() {
  useEffect(() => {
    // Initialize Sentry
    initSentry();
    
    // Initialize GA4
    initGA4();
    
    // Initialize Firebase Messaging
    initializeMessaging();
  }, []);

  return <AppRouter />;
}

export default App;
