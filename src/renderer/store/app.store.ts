import { create } from 'zustand';
import { nextView } from '@domain/navigation';
import type { Dashboard } from '@main/engine';
import type { Card } from '@domain/checking';
import type { Echantillon } from '@domain/soul';

export type Theme = 'light' | 'dark';
export type EditorMode = 'preview' | 'edit';

export interface AppState {
  view: string;
  theme: Theme;
  dashboard: Dashboard | null;
  cards: Card[];
  verifyValue: unknown;
  draftValue: unknown;
  archiveValue: unknown;
  teamsText: string;
  readerText: string;
  echantillons: Echantillon[];
  editorMode: EditorMode;
  wantSoulLesson: boolean;
  toast: string | null;

  go: (action: string) => void;
  setView: (view: string) => void;
  toggleTheme: () => void;
  setDashboard: (d: Dashboard | null) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  setCards: (cards: Card[]) => void;
  setVerifyValue: (v: unknown) => void;
  setDraftValue: (v: unknown) => void;
  setArchiveValue: (v: unknown) => void;
  setTeamsText: (t: string) => void;
  setEditorMode: (m: EditorMode) => void;
  setEchantillons: (e: Echantillon[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'dashboard',
  theme: 'light',
  dashboard: null,
  cards: [],
  verifyValue: null,
  draftValue: null,
  archiveValue: null,
  teamsText: '',
  readerText: '',
  echantillons: [],
  editorMode: 'preview',
  wantSoulLesson: true,
  toast: null,

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
  setTeamsText: (teamsText) => set({ teamsText }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setEchantillons: (echantillons) => set({ echantillons }),
}));
