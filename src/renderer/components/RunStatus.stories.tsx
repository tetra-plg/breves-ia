import type { Meta, StoryObj } from '@storybook/react-vite';
import { RunStatus } from './RunStatus';

const meta: Meta<typeof RunStatus> = { component: RunStatus, title: 'Composants/RunStatus' };
export default meta;

export const Actif: StoryObj<typeof RunStatus> = {
  args: {
    status: {
      active: true,
      title: 'Vérification en cours',
      t0: 0,
      clock: '0:42',
      activity: 'Recherche web : z.ai/blog/glm-5.2',
    },
  },
};

export const Inactif: StoryObj<typeof RunStatus> = {
  args: { status: { active: false, title: '', t0: 0, clock: '0:00', activity: '' } },
};
