import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArchiveStep } from './ArchiveStep';

const meta: Meta<typeof ArchiveStep> = { component: ArchiveStep, title: 'Composants/ArchiveStep' };
export default meta;

export const Exemple: StoryObj<typeof ArchiveStep> = {
  args: { step: { t: 'Édition écrite dans le repo', d: 'editions/2026-06-26.md' } },
};
