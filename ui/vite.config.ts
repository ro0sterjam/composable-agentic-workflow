import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, '../sdk/src'),
    },
  },
});

