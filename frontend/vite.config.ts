import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In Docker the built assets are served by Nginx, which proxies /api to the backend.
// For local (non-Docker) development the Vite dev server provides the same proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
});
