import type { Meta, StoryObj } from '@storybook/react-vite';
import { CorrectionRow } from './CorrectionRow';

const meta: Meta<typeof CorrectionRow> = { component: CorrectionRow, title: 'CorrectionRow' };
export default meta;

export const Corrige: StoryObj<typeof CorrectionRow> = {
  args: { correction: { niveau: 'corrigé', titre: 'Paramètres GLM-5.2', detail: '753 milliards et non 1,5 billion.' } },
};
export const Nuance: StoryObj<typeof CorrectionRow> = {
  args: { correction: { niveau: 'nuance', titre: 'Disponibilité', detail: 'Annoncé, pas encore déployé partout.' } },
};
