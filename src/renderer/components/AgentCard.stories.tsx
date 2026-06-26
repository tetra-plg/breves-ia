import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentCard } from './AgentCard';

const meta: Meta<typeof AgentCard> = { component: AgentCard, title: 'AgentCard' };
export default meta;

const base = {
  name: 'enqueteur',
  description: 'Vérifie un sujet et renvoie faits + source.',
  tools: ['WebSearch', 'WebFetch'],
  model: '',
  enabled: true,
  mode: '',
  systemPrompt: 'Tu es un enquêteur rigoureux…',
};

export const Standard: StoryObj<typeof AgentCard> = { args: { agent: base, onSave: () => {} } };
export const Sceptique: StoryObj<typeof AgentCard> = {
  args: { agent: { ...base, name: 'sceptique', mode: 'ciblé', description: 'Tente de réfuter l\'affirmation centrale.' }, onSave: () => {} },
};
