import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config
export default defineConfig({
  root: 'src/renderer',
  build: {
    // `root` étant 'src/renderer', l'outDir par défaut du plugin Forge
    // (.vite/renderer/main_window) se résout SOUS src/renderer et n'est donc
    // pas copié dans l'asar (Forge ne packte que le .vite de la racine) →
    // fenêtre vide. On force un chemin absolu vers le .vite de la racine.
    outDir: path.resolve(__dirname, '.vite/renderer/main_window'),
    emptyOutDir: true,
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
