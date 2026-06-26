import type { Meta, StoryObj } from '@storybook/react';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = { component: Toast, title: 'Toast' };
export default meta;

export const Visible: StoryObj<typeof Toast> = { args: { message: 'Brèves copiées' } };
export const Vide: StoryObj<typeof Toast> = { args: { message: null } };
