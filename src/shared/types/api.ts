import type { Dashboard, AgentEdits } from '@main/engine';
import type { Soul, Echantillon, SoulSectionEdits } from '@domain/soul';
import type { Agent } from '@domain/agents';
import type { Command, CommandEdits } from '@domain/commands';

// Résultat générique des commandes/écritures (le flag {ok} est 1:1 ; cf. carry-over 2.1).
export type ApiResult<T = unknown> = { ok: true; value: T } | { ok: false; error: string };
export type SaveResult = { ok: boolean; error?: string };

export type SettingKey = 'bbDir' | 'repoDir' | 'claudeBin';
export type SettingSource = 'env' | 'file' | 'default';
export interface SettingField { value: string; source: SettingSource; valid: boolean }
export type SettingsState = Record<SettingKey, SettingField>;
export type SettingsPatch = Partial<Record<SettingKey, string>>;

// Forme exposée par le preload sous window.api.
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
  getCommands(): Promise<Command[]>;
  saveCommand(name: string, edits: CommandEdits): Promise<SaveResult>;
  copy(text: string): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  hideWindow(): Promise<void>;
  getSettings(): Promise<SettingsState>;
  validatePath(path: string, kind: 'directory' | 'file'): Promise<boolean>;
  pickPath(kind: 'directory' | 'file'): Promise<string | null>;
  saveSettings(patch: SettingsPatch): Promise<SaveResult>;
  quitApp(): Promise<void>;
}
