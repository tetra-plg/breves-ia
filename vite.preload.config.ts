import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  build: {
    // Force output filename to "preload.js" regardless of entry basename ("index").
    // The Forge plugin-vite preload path uses rollupOptions.input + entryFileNames;
    // overriding entryFileNames here (merged last via mergeConfig) renames the output.
    rollupOptions: {
      output: {
        entryFileNames: 'preload.cjs',
      },
    },
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
});
