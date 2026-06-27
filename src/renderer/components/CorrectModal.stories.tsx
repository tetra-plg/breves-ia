import type { Meta, StoryObj } from '@storybook/react-vite';
import { CorrectModal } from './CorrectModal';

const meta: Meta<typeof CorrectModal> = {
  component: CorrectModal,
  title: 'Composants/CorrectModal',
  argTypes: { initialWantSoulLesson: { control: 'boolean' } },
};
export default meta;

export const Ouverte: StoryObj<typeof CorrectModal> = {
  args: { initialWantSoulLesson: true, onCancel: () => {}, onSend: () => {} },
};
export const SansLecon: StoryObj<typeof CorrectModal> = {
  args: { initialWantSoulLesson: false, onCancel: () => {}, onSend: () => {} },
};
