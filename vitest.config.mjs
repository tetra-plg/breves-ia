import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@main': r('./src/main'),
      '@preload': r('./src/preload'),
      '@renderer': r('./src/renderer'),
      '@domain': r('./src/domain'),
      '@shared': r('./src/shared'),
      '@config': r('./src/config'),
      '@assets': r('./src/assets'),
    },
  },
});
