import { create } from 'zustand';
import { nextView } from '@domain/navigation';
import type { Dashboard, EditionSummary } from '@main/engine';
import type { Card } from '@domain/checking';
import type { Echantillon, JournalEntry, Soul } from '@domain/soul';
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

export interface SoulForm {
  quiParle: string;
  audience: string;
  voix: string;
  lignesRouges: string;
}

const SOUL_FORM_EMPTY: SoulForm = { quiParle: '', audience: '', voix: '', lignesRouges: '' };

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
  readerEdition: EditionSummary | null;
  echantillons: Echantillon[];
  soulForm: SoulForm;
  soulVersion: string;
  soulJournal: JournalEntry[];
  echEdition: EditionSummary | null;
  echKeepLocal: boolean;
  editorMode: EditorMode;
  wantSoulLesson: boolean;
  toast: string | null;
  drawerKey: string | null;
  returnTo: string | null;

  go: (action: string) => void;
  setReturnTo: (view: string | null) => void;
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
  setReaderText: (t: string) => void;
  openReader: (edition: EditionSummary, from: string) => void;
  setTeamsText: (t: string) => void;
  setEditorMode: (m: EditorMode) => void;
  setWantSoulLesson: (v: boolean) => void;
  setEchantillons: (e: Echantillon[]) => void;
  loadSoul: (s: Soul) => void;
  setSoulField: (field: keyof SoulForm, value: string) => void;
  setEchEdition: (ed: EditionSummary | null) => void;
  setEchKeepLocal: (v: boolean) => void;
  addEchantillon: (e: Echantillon) => void;
  removeEchantillon: (index: number) => void;
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
  readerEdition: null,
  echantillons: [],
  soulForm: SOUL_FORM_EMPTY,
  soulVersion: '',
  soulJournal: [],
  echEdition: null,
  echKeepLocal: false,
  editorMode: 'preview',
  wantSoulLesson: true,
  toast: null,
  drawerKey: null,
  returnTo: null,

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
  setReaderText: (readerText) => set({ readerText }),
  openReader: (edition, from) => set({ readerEdition: edition, returnTo: from, readerText: '', view: 'reader' }),
  setTeamsText: (teamsText) => set({ teamsText }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setWantSoulLesson: (wantSoulLesson) => set({ wantSoulLesson }),
  setEchantillons: (echantillons) => set({ echantillons }),
  loadSoul: (s) =>
    set({
      soulForm: { quiParle: s.quiParle, audience: s.audience, voix: s.voix, lignesRouges: s.lignesRouges },
      soulVersion: s.version,
      soulJournal: s.journal,
      echantillons: s.echantillons.map((e) => ({ date: e.date, source: e.source || '', texte: e.texte })),
    }),
  setSoulField: (field, value) => set((st) => ({ soulForm: { ...st.soulForm, [field]: value } })),
  setEchEdition: (echEdition) => set({ echEdition }),
  setEchKeepLocal: (echKeepLocal) => set({ echKeepLocal }),
  addEchantillon: (e) => set((st) => (st.echantillons.length >= 3 ? {} : { echantillons: [...st.echantillons, e] })),
  removeEchantillon: (index) => set((st) => ({ echantillons: st.echantillons.filter((_, i) => i !== index) })),
  setDrawerKey: (drawerKey) => set({ drawerKey }),
  setReturnTo: (returnTo) => set({ returnTo }),
}));
