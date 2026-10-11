import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.choirsync.app',
  appName: 'ChoirSync',
  webDir: '../dist/choir-client',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
