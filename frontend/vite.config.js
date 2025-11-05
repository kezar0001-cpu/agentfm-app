import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://api.buildstate.com.au',
        changeOrigin: true,
      }
    }
  },
  build: {
    sourcemap: true, // Enable source maps for debugging production builds
  }
});


