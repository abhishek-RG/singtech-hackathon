import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read VITE_* vars from the repo-root .env (shared with the server).
  envDir: '../..',
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
