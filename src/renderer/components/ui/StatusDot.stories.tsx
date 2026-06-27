import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from './StatusDot';

const meta: Meta<typeof StatusDot> = {
  component: StatusDot,
  title: 'Primitives/StatusDot',
  argTypes: { state: { control: 'inline-radio', options: ['done', 'active', 'todo'] } },
};
export default meta;

export const Done: StoryObj<typeof StatusDot> = { args: { state: 'done' } };
export const Active: StoryObj<typeof StatusDot> = { args: { state: 'active' } };
export const Todo: StoryObj<typeof StatusDot> = { args: { state: 'todo' } };
