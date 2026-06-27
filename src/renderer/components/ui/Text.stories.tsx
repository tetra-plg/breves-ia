import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  component: Text,
  title: 'Primitives/Text',
  argTypes: { tone: { control: 'inline-radio', options: ['muted', 'faint'] } },
};
export default meta;

export const Muted: StoryObj<typeof Text> = { args: { tone: 'muted', children: 'Texte secondaire' } };
export const Faint: StoryObj<typeof Text> = { args: { tone: 'faint', children: 'Texte discret' } };
