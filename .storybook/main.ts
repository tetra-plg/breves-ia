import type { StorybookConfig } from '@storybook/react-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  stories: ['../src/renderer/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (cfg) => {
    cfg.plugins = [...(cfg.plugins ?? []), tsconfigPaths()];
    // Force le pré-bundling de `react` dans le preview : sans ça, react n'est pas optimisé
    // et un chunk optimisé échoue sur `import default from 'react'` (CJS servi brut, sans interop).
    cfg.optimizeDeps = {
      ...cfg.optimizeDeps,
      include: [
        ...(cfg.optimizeDeps?.include ?? []),
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    };
    return cfg;
  },
};

export default config;
