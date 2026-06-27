// src/renderer/components/PathField.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PathField } from './PathField';

const meta: Meta<typeof PathField> = {
  component: PathField,
  title: 'Composants/PathField',
  args: { onChange: () => {}, onBrowse: () => {} },
  argTypes: { valid: { control: 'boolean' }, locked: { control: 'boolean' } },
};
export default meta;

export const Valide: StoryObj<typeof PathField> = {
  args: { label: 'BoilingBrain (dossier)', value: '/Users/pleguern/Workspace/BoilingBrain', valid: true },
};
export const Invalide: StoryObj<typeof PathField> = {
  args: { label: 'Binaire claude (fichier)', value: '/chemin/introuvable', valid: false },
};
export const Verrouille: StoryObj<typeof PathField> = {
  args: { label: 'Repo SOUL / agents (dossier)', value: '/env/locked', valid: true, locked: true },
};
