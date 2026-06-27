import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandCard } from './CommandCard';

const meta: Meta<typeof CommandCard> = {
  component: CommandCard,
  title: 'Composants/CommandCard',
  args: { onSave: () => {} },
};
export default meta;

export const Defaut: StoryObj<typeof CommandCard> = {
  args: {
    command: {
      name: 'breves-verify',
      description: 'Phase 1 — vérification, renvoie un JSON structuré.',
      body: '# /breves-verify\n\nTu exécutes la Phase 1 (vérification), en mode non interactif…',
    },
  },
};
