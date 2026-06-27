import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = { component: Card, title: 'Primitives/Card' };
export default meta;

export const Defaut: StoryObj<typeof Card> = { args: { children: 'Contenu de la carte' } };
