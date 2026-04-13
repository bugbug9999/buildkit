import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/miniapp/lair-health/',
  plugins: [react()],
  define: {
    'globalThis.__LAIR_NETWORK__': JSON.stringify('mainnet'),
  },
  server: {
    host: true,
    port: Number.parseInt(process.env.PORT ?? '5175', 10),
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'https://dev-api.lair.fi',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
      '/health-api': {
        target: process.env.VITE_HEALTH_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/health-api/, ''),
        secure: false,
      },
    },
  },
});
