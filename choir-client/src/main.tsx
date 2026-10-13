import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './app/app';
import { ThemeProvider } from './components/theme-provider';

import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

import { Capacitor } from '@capacitor/core';

// Native Capacitor vs Web PWA Service Worker management
if (Capacitor.isNativePlatform()) {
  // In native Android/iOS WebView, unregister any service workers to prevent
  // asset hijacking, reload loops, and blank screens.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
} else {
  // Web browser / PWA only
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Silent catch for registration failure
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Proactively check for updates when the app is brought to the foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch(() => {
            // Silent catch for offline or dev scenarios
          });
        });
      }
    });
  }
}

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '899614270215-orv5fv8rfh96h1oj0cmbbdviktv4u0ql.apps.googleusercontent.com';

root.render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="choir-sync-theme">
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </HelmetProvider>
  </StrictMode>
);