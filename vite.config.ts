import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Capsule',
        short_name: 'Capsule',
        description: 'Local-first LLM context-pack library',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@dnd-kit')) return 'dnd';
          if (id.includes('dexie') || id.includes('idb-keyval')) return 'storage';
          if (id.includes('dompurify') || id.includes('marked')) return 'sanitize';
          if (id.includes('fflate')) return 'compress';
          if (id.includes('@tanstack') || id.includes('cmdk') || id.includes('zustand') || id.includes('immer')) {
            return 'ui-libs';
          }
          if (id.includes('react') || id.includes('scheduler') || id.includes('use-sync-external-store')) {
            return 'react';
          }
          if (id.includes('zod')) return 'zod';
          return undefined;
        },
      },
    },
  },
});
