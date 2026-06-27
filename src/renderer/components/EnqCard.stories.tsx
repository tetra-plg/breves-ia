import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Card } from '@domain/checking';
import { EnqCard } from './EnqCard';

const meta: Meta<typeof EnqCard> = { component: EnqCard, title: 'Composants/EnqCard' };
export default meta;

const base: Card = {
  key: 'glm',
  title: 'GLM-5.2',
  status: 'Terminé',
  done: true,
  error: null,
  source: 'z.ai',
  alerte: { niveau: 'corrigé', texte: '753B, pas 1.5T' },
  steps: ['recherche', 'faits', 'date', 'source', 'article'].map((name) => ({ name, state: 'done' as const })),
};

export const Termine: StoryObj<typeof EnqCard> = { args: { card: base } };
export const EnCours: StoryObj<typeof EnqCard> = {
  args: { card: { ...base, done: false, status: 'en cours', alerte: null, steps: base.steps.map((s, i) => ({ ...s, state: i < 2 ? 'done' : i === 2 ? 'active' : 'todo' })) } },
};
export const EnErreur: StoryObj<typeof EnqCard> = {
  args: { card: { ...base, done: true, status: 'Erreur', error: 'Timeout réseau — aucune réponse de l\'enquêteur.', alerte: null, steps: base.steps.map((s, i) => ({ ...s, state: i < 2 ? 'done' : 'todo' })) } },
};
