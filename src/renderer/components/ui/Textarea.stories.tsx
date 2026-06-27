import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = { component: Textarea, title: 'Primitives/Textarea' };
export default meta;

export const Defaut: StoryObj<typeof Textarea> = { args: { placeholder: 'Collez votre actualité ici…', rows: 6 } };
