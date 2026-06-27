import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../src/renderer/styles/tokens.css';
import '../src/renderer/styles/app.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Thème',
      defaultValue: 'light',
      toolbar: {
        title: 'Thème',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === 'dark';
      useEffect(() => {
        document.body.classList.toggle('dark', dark);
        document.body.style.background = 'var(--win)';
      }, [dark]);
      return <Story />;
    },
  ],
};

export default preview;
