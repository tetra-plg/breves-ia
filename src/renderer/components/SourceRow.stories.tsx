import type { Meta, StoryObj } from '@storybook/react-vite';
import { SourceRow } from './SourceRow';

const meta: Meta<typeof SourceRow> = { component: SourceRow, title: 'Composants/SourceRow' };
export default meta;

export const Directe: StoryObj<typeof SourceRow> = {
  args: { source: { name: 'Z.ai Blog', url_citee: 'https://z.ai/blog/glm-5.2', url_clippee: 'https://z.ai/blog/glm-5.2', repli: false } },
};
export const Repli: StoryObj<typeof SourceRow> = {
  args: { source: { name: 'TechCrunch', url_citee: 'https://techcrunch.com/glm', url_clippee: 'https://techcrunch.com/glm', repli: true } },
};
