import type { Meta, StoryObj } from '@storybook/react';
import { EditionRow } from './EditionRow';

const meta: Meta<typeof EditionRow> = { component: EditionRow, title: 'EditionRow' };
export default meta;

export const Exemple: StoryObj<typeof EditionRow> = {
  args: {
    edition: { file: 'f.md', date: '2026-06-17', range: '2026-06-17', count: 5, corr: 2, title: '' },
    onOpen: () => {},
  },
};
