import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pill } from './Pill';

const meta: Meta<typeof Pill> = { component: Pill, title: 'Primitives/Pill' };
export default meta;

export const Defaut: StoryObj<typeof Pill> = { args: { children: 'Étiquette' } };
