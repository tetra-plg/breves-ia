import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSkill as realRunSkill, runRaw as realRunRaw } from '@main/services/llm.service';
import type { RunResult, RunRawResult, StreamEvent } from '@main/services/llm.service';
import { readSoul as realReadSoul } from '@main/io/soul.io';
import type { SoulSummary } from '@main/io/soul.io';
import { listEditions as realListEditions } from '@main/io/editions.io';
import type { EditionSummary } from '@main/io/editions.io';
export type { EditionSummary };
import { loadEngineConfig } from '@main/io/env';
import type { WikiMcp } from '@main/io/env';
import {
  parseSoul,
  replaceSoulSections,
  replaceSoulEchantillons,
  type Soul,
  type Echantillon,
  type SoulSectionEdits,
} from '@domain/soul';
import { parseAgent, toAgentDefinition, serializeAgent, type Agent, type AgentDefinition } from '@domain/agents';

const SOUL_PARTS = ['.claude', 'breves-ia', 'SOUL.md'];

export interface EngineDeps {
  bbDir: string;
  repoDir: string;
  wikiMcp?: WikiMcp;
  runSkill: typeof realRunSkill;
  runRaw: typeof realRunRaw;
  readSoul: (baseDir: string) => SoulSummary;
  listEditions: (bbDir: string) => EditionSummary[];
  readFile: (p: string) => string;
  writeFile: (p: string, t: string) => void;
  readdir: (p: string) => string[];
}

export function defaultDeps(env: NodeJS.ProcessEnv = process.env): EngineDeps {
  const { bbDir, repoDir, wikiMcp } = loadEngineConfig(env);
  return {
    bbDir,
    repoDir,
    wikiMcp,
    runSkill: realRunSkill,
    runRaw: realRunRaw,
    readSoul: realReadSoul,
    listEditions: realListEditions,
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, t) => writeFileSync(p, t, 'utf8'),
    readdir: (p) => readdirSync(p),
  };
}

export function loadAgents(deps: EngineDeps): { defs: Record<string, AgentDefinition>; byName: Record<string, Agent> } {
  const dir = join(deps.repoDir, '.claude', 'agents');
  let files: string[] = [];
  try {
    files = deps.readdir(dir);
  } catch {
    return { defs: {}, byName: {} };
  }
  const defs: Record<string, AgentDefinition> = {};
  const byName: Record<string, Agent> = {};
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const a = parseAgent(deps.readFile(join(dir, f)));
    if (!a.name) continue;
    byName[a.name] = a;
    if (a.enabled) defs[a.name] = toAgentDefinition(a);
  }
  return { defs, byName };
}

export function getSoul(deps: EngineDeps): Soul | null {
  try {
    return parseSoul(deps.readFile(join(deps.repoDir, ...SOUL_PARTS)));
  } catch {
    return null;
  }
}

export function saveSoulSections(deps: EngineDeps, edits: SoulSectionEdits): { ok: boolean; error?: string } {
  const req: (keyof SoulSectionEdits)[] = ['quiParle', 'audience', 'voix', 'lignesRouges'];
  for (const k of req) {
    if (typeof edits?.[k] !== 'string' || !edits[k].trim()) return { ok: false, error: `${k} vide` };
  }
  try {
    const raw = deps.readFile(join(deps.repoDir, ...SOUL_PARTS));
    deps.writeFile(join(deps.repoDir, ...SOUL_PARTS), replaceSoulSections(raw, edits));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function saveSoulEchantillons(deps: EngineDeps, entries: Echantillon[]): { ok: boolean; error?: string } {
  if (!Array.isArray(entries) || entries.length > 3) return { ok: false, error: 'max 3 échantillons' };
  if (entries.some((e) => typeof e?.texte !== 'string' || !e.texte.trim())) {
    return { ok: false, error: 'échantillon vide' };
  }
  try {
    const path = join(deps.repoDir, ...SOUL_PARTS);
    deps.writeFile(path, replaceSoulEchantillons(deps.readFile(path), entries));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Lit une édition archivée. Nom strictement validé (anti-traversal). Renvoie null sinon.
export function readEdition(deps: EngineDeps, file: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}-breves-ia-merim(-[a-z0-9-]+)?\.md$/.test(String(file))) return null;
  try {
    return deps.readFile(join(deps.bbDir, 'raw', 'notes', file));
  } catch {
    return null;
  }
}

export interface DispatchArgs {
  skill: string;
  inputs: Record<string, unknown>;
  onEvent?: (ev: StreamEvent) => void;
}

export async function dispatch({ skill, inputs, onEvent }: DispatchArgs, deps: EngineDeps): Promise<RunResult> {
  const { defs, byName } = loadAgents(deps);
  const finalInputs: Record<string, unknown> = { ...inputs };
  if (skill === 'breves-verify' && finalInputs.sceptique == null) {
    const s = byName.sceptique;
    finalInputs.sceptique = s && s.enabled && s.mode ? s.mode : 'off';
  }
  if (skill === 'breves-draft' && finalInputs.redacteur == null) {
    const r = byName.redacteur;
    finalInputs.redacteur = r && r.enabled ? 'on' : 'off';
  }
  return deps.runSkill({
    skill,
    inputs: finalInputs,
    bbDir: deps.repoDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    agents: Object.keys(defs).length ? defs : undefined,
    onEvent,
  });
}

export interface Dashboard {
  soul: SoulSummary | null;
  editions: EditionSummary[];
}

export function getDashboard(deps: EngineDeps): Dashboard {
  let soul: SoulSummary | null = null;
  try {
    soul = deps.readSoul(deps.repoDir);
  } catch {
    soul = null;
  }
  let editions: EditionSummary[] = [];
  try {
    editions = deps.listEditions(deps.bbDir);
  } catch {
    editions = [];
  }
  return { soul, editions };
}

export function getAgents(deps: EngineDeps): Agent[] {
  const { byName } = loadAgents(deps);
  return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
}

export interface AgentEdits {
  systemPrompt: string;
  model?: string;
  tools?: string[];
  enabled?: boolean;
  mode?: string;
  description?: string;
}

export function saveAgent(deps: EngineDeps, name: string, edits: AgentEdits): { ok: boolean; error?: string } {
  if (!name || typeof edits?.systemPrompt !== 'string' || !edits.systemPrompt.trim()) {
    return { ok: false, error: 'nom ou prompt vide' };
  }
  const path = join(deps.repoDir, '.claude', 'agents', `${name}.md`);
  try {
    const current = parseAgent(deps.readFile(path));
    const merged: Agent = {
      ...current,
      model: edits.model ?? current.model,
      tools: edits.tools ?? current.tools,
      systemPrompt: edits.systemPrompt,
      enabled: edits.enabled ?? current.enabled,
      mode: edits.mode ?? current.mode,
      description: edits.description ?? current.description,
    };
    deps.writeFile(path, serializeAgent(merged));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface ArchiveArgs {
  teamsText: string;
  topics: unknown[];
  sources: unknown[];
  leconSOUL?: string;
  onEvent?: (ev: StreamEvent) => void;
}

export async function archiveAndIngest(
  { teamsText, topics, sources, leconSOUL, onEvent }: ArchiveArgs,
  deps: EngineDeps,
): Promise<RunResult & { ingest?: RunRawResult }> {
  const archiveResult = await dispatch(
    { skill: 'breves-archive', inputs: { teamsText, topics, sources, leconSOUL }, onEvent },
    deps,
  );
  if (!archiveResult.ok) return archiveResult;
  const ingest = await deps.runRaw({
    prompt: '/ingest',
    cwd: deps.bbDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    onEvent,
  });
  return { ...archiveResult, ingest };
}
