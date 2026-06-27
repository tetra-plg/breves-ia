import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'Primitives/Button',
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'ghost', 'icon', 'cta'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

export const Primary: StoryObj<typeof Button> = { args: { variant: 'primary', children: 'Lancer la vérification' } };
export const Ghost: StoryObj<typeof Button> = { args: { variant: 'ghost', children: 'Annuler' } };
export const Icon: StoryObj<typeof Button> = { args: { variant: 'icon', children: '☰' } };
export const Cta: StoryObj<typeof Button> = { args: { variant: 'cta', children: 'Nouvelle brève' } };
export const Loading: StoryObj<typeof Button> = { args: { variant: 'primary', loading: true, children: 'Vérification…' } };
export const Disabled: StoryObj<typeof Button> = { args: { variant: 'primary', disabled: true, children: 'Indisponible' } };
