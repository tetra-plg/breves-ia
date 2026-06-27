import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from './Stepper';

const meta: Meta<typeof Stepper> = { component: Stepper, title: 'Primitives/Stepper' };
export default meta;

export const Milieu: StoryObj<typeof Stepper> = {
  args: { steps: [{ n: 1, state: 'done' }, { n: 2, state: 'active' }, { n: 3, state: 'todo' }], line: 'Étape 2 / 3' },
};
