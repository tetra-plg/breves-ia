import type { Preview } from '@storybook/react';
import '../src/renderer/styles/tokens.css';
import '../src/renderer/styles/app.css';

const preview: Preview = {
  parameters: { backgrounds: { default: 'win' } },
};

export default preview;
