import { create } from 'zustand';
import { nextView } from '@domain/navigation';
import type { Dashboard } from '@main/engine';
import type { Card } from '@domain/checking';
import type { Echantillon } from '@domain/soul';
import { applyEvent, applyResult } from '@domain/checking';
import type { TopicEvent } from '@domain/events';
import type { VerifyOutput, DraftOutput, ArchiveOutput } from '@shared/schemas/outputs';

export type Theme = 'light' | 'dark';
export type EditorMode = 'preview' | 'edit';

export interface RunStatus {
  active: boolean;
  title: string;
  t0: number;
  clock: string;
  activity: string;
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const RUN_IDLE: RunStatus = { active: false, title: '', t0: 0, clock: '0:00', activity: '' };

export interface AppState {
  view: string;
  theme: Theme;
  dashboard: Dashboard | null;
  cards: Card[];
  verifyValue: VerifyOutput | null;
  draftValue: DraftOutput | null;
  archiveValue: ArchiveOutput | null;
  runStatus: RunStatus;
  teamsText: string;
  readerText: string;
  echantillons: Echantillon[];
  editorMode: EditorMode;
  wantSoulLesson: boolean;
  toast: string | null;
  drawerKey: string | null;

  go: (action: string) => void;
  setView: (view: string) => void;
  toggleTheme: () => void;
  setDashboard: (d: Dashboard | null) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  setCards: (cards: Card[]) => void;
  setVerifyValue: (v: VerifyOutput | null) => void;
  setDraftValue: (v: DraftOutput | null) => void;
  setArchiveValue: (v: ArchiveOutput | null) => void;
  resetCards: () => void;
  applyCardEvent: (ev: TopicEvent) => void;
  applyResultCards: (value: VerifyOutput) => void;
  beginRun: (title?: string) => void;
  endRun: () => void;
  setRunActivity: (label: string) => void;
  tickClock: (nowMs: number) => void;
  setTeamsText: (t: string) => void;
  setEditorMode: (m: EditorMode) => void;
  setEchantillons: (e: Echantillon[]) => void;
  setDrawerKey: (key: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'dashboard',
  theme: 'light',
  dashboard: null,
  cards: [],
  verifyValue: null,
  draftValue: null,
  archiveValue: null,
  runStatus: RUN_IDLE,
  teamsText: '',
  readerText: '',
  echantillons: [],
  editorMode: 'preview',
  wantSoulLesson: true,
  toast: null,
  drawerKey: null,

  go: (action) => set({ view: nextView(get().view, action) }),
  setView: (view) => set({ view }),
  toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
  setDashboard: (dashboard) => set({ dashboard }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  setCards: (cards) => set({ cards }),
  setVerifyValue: (verifyValue) => set({ verifyValue }),
  setDraftValue: (draftValue) => set({ draftValue }),
  setArchiveValue: (archiveValue) => set({ archiveValue }),
  resetCards: () => set({ cards: [] }),
  applyCardEvent: (ev) => set({ cards: applyEvent(get().cards, ev) }),
  applyResultCards: (value) => set({ cards: applyResult(get().cards, value) }),
  beginRun: (title) =>
    set({
      runStatus: { active: true, title: title ?? 'Vérification en cours', t0: Date.now(), clock: '0:00', activity: 'Démarrage…' },
    }),
  endRun: () => set((s) => ({ runStatus: { ...s.runStatus, active: false } })),
  setRunActivity: (activity) => set((s) => ({ runStatus: { ...s.runStatus, activity } })),
  tickClock: (nowMs) => set((s) => ({ runStatus: { ...s.runStatus, clock: fmtClock(nowMs - s.runStatus.t0) } })),
  setTeamsText: (teamsText) => set({ teamsText }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setEchantillons: (echantillons) => set({ echantillons }),
  setDrawerKey: (drawerKey) => set({ drawerKey }),
}));
