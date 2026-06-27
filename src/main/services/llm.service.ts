import { buildPrompt } from '@shared/skills';
import { validateInputs } from '@shared/schemas/inputs';
import {
  validateVerifyOutput,
  validateDraftOutput,
  validateArchiveOutput,
} from '@shared/schemas/outputs';
import { extractJsonBlock, parseSentinels } from '@domain/edition';
import { activityFromMessage } from '@domain/agents';
import type { TopicEvent } from '@domain/events';
import type { ActivityEvent } from '@domain/events';

export interface SdkMessage {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  message?: { content?: unknown };
}

export interface QueryArg {
  prompt: string;
  options: Record<string, unknown>;
}

export type QueryFn = (arg: QueryArg) => AsyncIterable<SdkMessage>;

export type StreamEvent = TopicEvent | ActivityEvent | { type: string; error?: string; [key: string]: unknown };

export type RunResult = { ok: true; value: unknown } | { ok: false; error: string };
export type RunRawResult = { ok: boolean; text: string };

const VALIDATORS: Record<string, (obj: unknown) => { ok: true; value: unknown } | { ok: false; errors: string[] }> = {
  'breves-verify': validateVerifyOutput,
  'breves-draft': validateDraftOutput,
  'breves-archive': validateArchiveOutput,
};

let cachedQuery: QueryFn | null = null;

// Résout le spécifieur d'import du SDK. En app packagée, node_modules est absent
// (le plugin Forge-Vite le supprime) et le SDK est livré via extraResource dans
// Contents/Resources/claude-agent-sdk → on l'importe par chemin absolu (file://).
// En dev/CLI/tests, résolution normale par nom de package depuis node_modules.
async function resolveSdkSpecifier(): Promise<string> {
  try {
    const { app } = await import('electron');
    if (app.isPackaged) {
      const { pathToFileURL } = await import('node:url');
      const { join } = await import('node:path');
      return pathToFileURL(join(process.resourcesPath, 'claude-agent-sdk', 'sdk.mjs')).href;
    }
  } catch {
    // Hors contexte Electron (tests, breves-cli via tsx) → nom de package.
  }
  return '@anthropic-ai/claude-agent-sdk';
}

// Chargement paresseux du SDK (ESM) depuis le main CJS : import() dynamique uniquement en prod.
async function loadSdkQuery(): Promise<QueryFn> {
  if (!cachedQuery) {
    const sdk = (await import(await resolveSdkSpecifier())) as { query: QueryFn };
    cachedQuery = sdk.query;
  }
  return cachedQuery;
}

function textOf(message: SdkMessage): string {
  const content = message?.message?.content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text: string } => (b as { type?: string })?.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }
  return typeof content === 'string' ? content : '';
}

export interface RunSkillArgs {
  skill: string;
  inputs: unknown;
  bbDir: string;
  pathToClaudeCodeExecutable?: string;
  onEvent?: (ev: StreamEvent) => void;
  query?: QueryFn;
  mcpServers?: Record<string, unknown>;
  agents?: Record<string, unknown>;
}

export async function runSkill({
  skill,
  inputs,
  bbDir,
  pathToClaudeCodeExecutable,
  onEvent = () => {},
  query,
  mcpServers,
  agents,
}: RunSkillArgs): Promise<RunResult> {
  const v = validateInputs(skill, inputs);
  if (!v.ok) return { ok: false, error: `inputs invalides: ${v.errors.join('; ')}` };

  let prompt: string;
  try {
    prompt = buildPrompt(skill, inputs);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const q = query ?? (await loadSdkQuery());
  let finalText = '';
  let sdkOk = false;
  const options: Record<string, unknown> = {
    cwd: bbDir,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };
  if (pathToClaudeCodeExecutable) options.pathToClaudeCodeExecutable = pathToClaudeCodeExecutable;
  if (mcpServers) options.mcpServers = mcpServers;
  if (agents) options.agents = agents;
  try {
    for await (const m of q({ prompt, options })) {
      if (m.type === 'assistant') {
        for (const ev of parseSentinels(textOf(m))) onEvent(ev);
        for (const ev of activityFromMessage(m)) onEvent(ev);
      } else if (m.type === 'result') {
        finalText = m.result ?? '';
        sdkOk = m.subtype === 'success' && !m.is_error;
      }
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!sdkOk) return { ok: false, error: finalText || 'échec du skill' };

  let parsed: unknown;
  try {
    parsed = extractJsonBlock(finalText);
  } catch (e) {
    onEvent({ type: 'result-error', error: (e as Error).message });
    return { ok: false, error: (e as Error).message };
  }

  const validate = VALIDATORS[skill];
  const out = validate(parsed);
  if (!out.ok) {
    onEvent({ type: 'result-error', error: out.errors.join('; ') });
    return { ok: false, error: out.errors.join('; ') };
  }
  return { ok: true, value: out.value };
}

export interface RunRawArgs {
  prompt: string;
  cwd: string;
  pathToClaudeCodeExecutable?: string;
  onEvent?: (ev: StreamEvent) => void;
  query?: QueryFn;
  mcpServers?: Record<string, unknown>;
  agents?: Record<string, unknown>;
}

export async function runRaw({
  prompt,
  cwd,
  pathToClaudeCodeExecutable,
  onEvent = () => {},
  query,
  mcpServers,
  agents,
}: RunRawArgs): Promise<RunRawResult> {
  const q = query ?? (await loadSdkQuery());
  const options: Record<string, unknown> = {
    cwd,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };
  if (pathToClaudeCodeExecutable) options.pathToClaudeCodeExecutable = pathToClaudeCodeExecutable;
  if (mcpServers) options.mcpServers = mcpServers;
  if (agents) options.agents = agents;
  let text = '';
  let ok = false;
  try {
    for await (const m of q({ prompt, options })) {
      if (m.type === 'assistant') {
        for (const ev of parseSentinels(textOf(m))) onEvent(ev);
      } else if (m.type === 'result') {
        text = m.result ?? '';
        ok = m.subtype === 'success' && !m.is_error;
      }
    }
  } catch (e) {
    return { ok: false, text: (e as Error).message };
  }
  return { ok, text };
}
