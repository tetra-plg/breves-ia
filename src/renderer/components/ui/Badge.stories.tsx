import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'Primitives/Badge',
  argTypes: { tone: { control: 'inline-radio', options: ['good', 'warn', 'nuance', 'accent'] } },
};
export default meta;

export const Good: StoryObj<typeof Badge> = { args: { tone: 'good', children: 'Vérifié' } };
export const Warn: StoryObj<typeof Badge> = { args: { tone: 'warn', children: 'Corrigé' } };
export const Nuance: StoryObj<typeof Badge> = { args: { tone: 'nuance', children: 'Nuance' } };
export const Accent: StoryObj<typeof Badge> = { args: { tone: 'accent', children: 'Date' } };
