import type { Meta, StoryObj } from '@storybook/react-vite';
import { HistoryRow } from './HistoryRow';

const meta: Meta<typeof HistoryRow> = { component: HistoryRow, title: 'HistoryRow' };
export default meta;

const edition = { file: '2026-06-13-glm.md', date: '2026-06-13', range: '2026-06-13', count: 4, corr: 2, title: 'Spécial modèles ouverts' };

export const AvecTitre: StoryObj<typeof HistoryRow> = { args: { edition, onOpen: () => {} } };
export const SansTitre: StoryObj<typeof HistoryRow> = { args: { edition: { ...edition, title: '' }, onOpen: () => {} } };
