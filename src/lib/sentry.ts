import * as Sentry from '@sentry/react';

export const initSentry = () => {
  if (!import.meta.env.PROD) {
    console.log('Sentry disabled in development mode');
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1,
    // Capture Console
    beforeSend(event: any) {
      // Filter out noisy errors
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type === 'ChunkLoadError' || 
            error?.value?.includes('Loading chunk') ||
            error?.value?.includes('Loading CSS chunk')) {
          return null;
        }
      }
      return event;
    },
  });

  // Set user context when available
  const setUserContext = (user: { uid: string; email?: string | null }) => {
    Sentry.setUser({
      id: user.uid,
      email: user.email || undefined,
    });
  };

  return { setUserContext };
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const addBreadcrumb = Sentry.addBreadcrumb;