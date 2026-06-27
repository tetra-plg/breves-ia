import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawer } from './Drawer';
import type { VerifyOutput } from '@shared/schemas/outputs';

const meta: Meta<typeof Drawer> = { component: Drawer, title: 'Composants/Drawer' };
export default meta;

const topic: VerifyOutput['topics'][number] = {
  key: 'glm',
  sujet: 'GLM-5.2, modèle chinois open source',
  date_reelle: '2026-06-13',
  fiabilite: 'confirme',
  source: 'Z.ai Blog',
  url_citee: 'https://z.ai/blog/glm-5.2',
  url_clippee: 'https://z.ai/blog/glm-5.2',
  slug: 'glm-5-2',
  clipping_contenu: 'GLM-5.2 est un modèle open weights de 753 milliards de paramètres…',
  faits: ['Open weights sous licence MIT', '753 milliards de paramètres'],
  alerte: { niveau: 'corrigé', texte: '753B et non 1,5T comme annoncé ailleurs.' },
};

export const Exemple: StoryObj<typeof Drawer> = { args: { topic } };
export const SansAlerte: StoryObj<typeof Drawer> = {
  args: { topic: { ...topic, alerte: null } },
};
