import { defineConfig } from 'vite';
import { resolve } from 'path';

// Builds the three HTML pages (popup, dashboard, settings).
// Content script + service worker are built as IIFE bundles by build.mjs.
export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        dashboard: resolve(__dirname, 'src/dashboard/dashboard.html'),
        settings: resolve(__dirname, 'src/settings/settings.html')
      }
    }
  }
});
