import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.pairslist',
  appName: 'PairsList',
  webDir: 'dist',
  server: {
    // For live reload during development, uncomment and set your LAN IP:
    // url: 'http://192.168.0.10:5173',
    // cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.VITE_GOOGLE_CLIENT_ID || '',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
