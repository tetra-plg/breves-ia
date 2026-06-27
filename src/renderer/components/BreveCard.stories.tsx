import type { Meta, StoryObj } from '@storybook/react-vite';
import { BreveCard } from './BreveCard';

const meta: Meta<typeof BreveCard> = { component: BreveCard, title: 'Composants/BreveCard' };
export default meta;

export const Ajoutable: StoryObj<typeof BreveCard> = {
  args: { texte: '**Midjourney** lance un scanner corporel pour la cohérence des personnages.', disabled: false, onAdd: () => {} },
};
export const Pleine: StoryObj<typeof BreveCard> = {
  args: { texte: '**Midjourney** lance un scanner corporel.', disabled: true, onAdd: () => {} },
};
