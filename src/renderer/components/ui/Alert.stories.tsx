import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  component: Alert,
  title: 'Primitives/Alert',
  argTypes: { tone: { control: 'inline-radio', options: ['accent', 'good', 'warn', 'nuance'] } },
};
export default meta;

export const Accent: StoryObj<typeof Alert> = { args: { tone: 'accent', children: 'Information de date' } };
export const Warn: StoryObj<typeof Alert> = { args: { tone: 'warn', children: 'Fait corrigé' } };
export const Nuance: StoryObj<typeof Alert> = { args: { tone: 'nuance', children: 'Nuance importante' } };
