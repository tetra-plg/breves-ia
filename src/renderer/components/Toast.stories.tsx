import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  component: Toast,
  title: 'Composants/Toast',
  // Le toast est en position:absolute (bottom/left) → conteneur positionné et dimensionné
  // pour qu'il s'ancre et reste visible dans la vitrine.
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 140 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Visible: StoryObj<typeof Toast> = { args: { message: 'Brèves copiées' } };
export const Vide: StoryObj<typeof Toast> = { args: { message: null } };
