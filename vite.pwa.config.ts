import { defineConfig } from 'vite';
// WhyFeed PWA: root is ./pwa, output goes to ./dist-pwa (static files, deploy anywhere over HTTPS).
export default defineConfig({ root: 'pwa', base: './', publicDir: 'public', build: { outDir: '../dist-pwa', emptyOutDir: true } });
