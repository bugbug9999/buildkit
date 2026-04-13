import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fi.lair.health',
  appName: 'Lair Health',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
