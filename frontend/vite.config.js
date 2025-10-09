import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE_URL) // or remove define entirely
  }
});