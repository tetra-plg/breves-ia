// src/renderer/components/ui/Eyebrow.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow } from './Eyebrow';

const meta: Meta<typeof Eyebrow> = { component: Eyebrow, title: 'Primitives/Eyebrow' };
export default meta;

export const Defaut: StoryObj<typeof Eyebrow> = { args: { children: 'Vérification' } };
