import type { Dashboard, AgentEdits } from '@main/engine';
import type { Soul, Echantillon, SoulSectionEdits } from '@domain/soul';
import type { Agent } from '@domain/agents';

// Résultat générique des commandes/écritures (le flag {ok} est 1:1 ; cf. carry-over 2.1).
export type ApiResult<T = unknown> = { ok: true; value: T } | { ok: false; error: string };
export type SaveResult = { ok: boolean; error?: string };

// Forme exposée par le preload sous window.api (et l'alias window.breves).
export interface Api {
  sendCommand(skill: string, inputs: unknown): Promise<ApiResult>;
  onCommandEvent(cb: (ev: unknown) => void): () => void;
  getDashboard(): Promise<Dashboard>;
  readEdition(file: string): Promise<string | null>;
  archive(inputs: unknown): Promise<ApiResult & { ingest?: { ok: boolean; text: string } }>;
  getSoulStructured(): Promise<Soul | null>;
  saveSoulSections(edits: SoulSectionEdits): Promise<SaveResult>;
  saveSoulEchantillons(entries: Echantillon[]): Promise<SaveResult>;
  getAgents(): Promise<Agent[]>;
  saveAgent(name: string, edits: AgentEdits): Promise<SaveResult>;
  copy(text: string): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  hideWindow(): Promise<void>;
}
