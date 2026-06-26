import type { Meta, StoryObj } from '@storybook/react-vite';
import { EchantillonCard } from './EchantillonCard';

const meta: Meta<typeof EchantillonCard> = { component: EchantillonCard, title: 'EchantillonCard' };
export default meta;

export const Exemple: StoryObj<typeof EchantillonCard> = {
  args: {
    echantillon: { date: '2026-06-13', source: 'z.ai', texte: '**GLM-5.2** débarque en open weights — 753 milliards de paramètres.' },
    onRemove: () => {},
  },
};
