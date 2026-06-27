import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'Primitives/Input',
  argTypes: { disabled: { control: 'boolean' } },
};
export default meta;

export const Default: StoryObj<typeof Input> = { args: { defaultValue: '/Users/pleguern/Workspace/BoilingBrain' } };
export const Vide: StoryObj<typeof Input> = { args: { placeholder: 'Sélectionne un dossier…' } };
export const Disabled: StoryObj<typeof Input> = { args: { defaultValue: '/verrouillé', disabled: true } };
