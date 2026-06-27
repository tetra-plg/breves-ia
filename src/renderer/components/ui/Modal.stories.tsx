import type { Meta, StoryObj } from '@storybook/react-vite';
import { Overlay, Modal, Sheet } from './Modal';

const meta: Meta = { title: 'Primitives/Modal' };
export default meta;

export const Dialogue: StoryObj = {
  render: () => (
    <div style={{ position: 'relative', height: 480 }}>
      <Overlay><Modal>Contenu de la fenêtre modale</Modal></Overlay>
    </div>
  ),
};
export const Panneau: StoryObj = {
  render: () => (
    <div style={{ position: 'relative', height: 820 }}>
      <Overlay><Sheet>Panneau plein</Sheet></Overlay>
    </div>
  ),
};
