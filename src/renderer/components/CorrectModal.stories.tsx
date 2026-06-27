import type { Meta, StoryObj } from '@storybook/react-vite';
import { CorrectModal } from './CorrectModal';

const meta: Meta<typeof CorrectModal> = {
  component: CorrectModal,
  title: 'Composants/CorrectModal',
  argTypes: { initialWantSoulLesson: { control: 'boolean' } },
  // L'overlay est en position:absolute/inset:0 → on lui donne un conteneur positionné et
  // dimensionné pour qu'il s'ancre et reste visible dans la vitrine (sinon rogné par le canvas).
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 420, height: 820, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Ouverte: StoryObj<typeof CorrectModal> = {
  args: { initialWantSoulLesson: true, onCancel: () => {}, onSend: () => {} },
};
export const SansLecon: StoryObj<typeof CorrectModal> = {
  args: { initialWantSoulLesson: false, onCancel: () => {}, onSend: () => {} },
};
