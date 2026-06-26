import type { StorybookConfig } from '@storybook/react-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  stories: ['../src/renderer/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (cfg) => {
    cfg.plugins = [...(cfg.plugins ?? []), tsconfigPaths()];
    return cfg;
  },
};

export default config;
