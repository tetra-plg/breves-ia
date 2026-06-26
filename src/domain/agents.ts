import type { ActivityEvent } from '@domain/events';

// ---------- fichiers agents (← agent-file) ----------

export interface Agent {
  name: string;
  description: string;
  tools: string[];
  model: string;
  enabled: boolean;
  mode: string;
  systemPrompt: string;
}

export interface AgentDefinition {
  description: string;
  prompt: string;
  tools: string[];
  model?: string;
}

function splitFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const m = String(raw).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: String(raw).trim() };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: m[2].trim() };
}

export function parseAgent(raw: string): Agent {
  const { fm, body } = splitFrontmatter(raw);
  const tools = fm.tools ? fm.tools.split(',').map((t) => t.trim()).filter(Boolean) : [];
  return {
    name: fm.name || '',
    description: fm.description || '',
    tools,
    model: fm.model && fm.model !== 'inherit' ? fm.model : '',
    enabled: fm.breves_enabled !== 'false',
    mode: fm.breves_mode || '',
    systemPrompt: body,
  };
}

export function toAgentDefinition(a: Agent): AgentDefinition {
  const def: AgentDefinition = { description: a.description, prompt: a.systemPrompt, tools: a.tools || [] };
  if (a.model) def.model = a.model;
  return def;
}

export function serializeAgent(a: Agent): string {
  const fm = ['---', `name: ${a.name || ''}`];
  if (a.description) fm.push(`description: ${a.description}`);
  fm.push(`tools: ${(a.tools || []).join(', ')}`);
  if (a.model) fm.push(`model: ${a.model}`);
  fm.push(`breves_enabled: ${a.enabled === false ? 'false' : 'true'}`);
  if (a.mode) fm.push(`breves_mode: ${a.mode}`);
  fm.push('---');
  return `${fm.join('\n')}\n${(a.systemPrompt || '').trim()}\n`;
}

// ---------- libellés d'activité (← activity) ----------

function trim(s: unknown, n: number): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function hostOf(url: unknown): string {
  const m = String(url || '').match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, '') : trim(url, 40);
}

function baseOf(p: unknown): string {
  const s = String(p || '');
  return trim(s.split('/').pop() || s, 40);
}

export function labelForTool(name: string, input: Record<string, unknown> = {}): string | null {
  if (name === 'Task' || name === 'Agent') {
    const sub = input.subagent_type;
    const who =
      sub === 'sceptique' ? 'Sceptique'
      : sub === 'enqueteur' ? 'Enquêteur'
      : sub === 'redacteur' ? 'Rédacteur'
      : (typeof sub === 'string' && sub) || 'Sous-agent';
    const what = trim(input.description || input.prompt || '', 60);
    return what ? `${who} : ${what}` : who;
  }
  if (name === 'WebSearch') return input.query ? `Recherche web : ${trim(input.query, 60)}` : 'Recherche web…';
  if (name === 'WebFetch') return `Lecture : ${hostOf(input.url)}`;
  if (name === 'Read') return `Lecture : ${baseOf(input.file_path)}`;
  if (name === 'Edit' || name === 'MultiEdit') return `Édition : ${baseOf(input.file_path)}`;
  if (name === 'Write') return `Écriture : ${baseOf(input.file_path)}`;
  if (name === 'Bash') return input.description ? `Shell : ${trim(input.description, 50)}` : 'Commande shell…';
  if (name === 'TodoWrite') return null;
  if (typeof name === 'string' && name.includes('drop_to_raw')) {
    const f = input.filename || input.subfolder;
    return f ? `Dépôt wiki : ${trim(f, 50)}` : 'Dépôt dans le wiki…';
  }
  if (typeof name === 'string' && name.startsWith('mcp__')) return `Wiki : ${name.split('__').pop()}`;
  if (name) return `${name}…`;
  return null;
}

interface ToolUseBlock {
  type?: string;
  name?: string;
  input?: Record<string, unknown>;
}
interface AssistantMessage {
  type?: string;
  message?: { content?: unknown };
}

export function activityFromMessage(m: unknown): ActivityEvent[] {
  const msg = m as AssistantMessage | null | undefined;
  if (msg?.type !== 'assistant') return [];
  const blocks = msg.message?.content;
  if (!Array.isArray(blocks)) return [];
  const out: ActivityEvent[] = [];
  for (const b of blocks as ToolUseBlock[]) {
    if (b?.type !== 'tool_use') continue;
    const label = labelForTool(b.name ?? '', b.input || {});
    if (label) out.push({ type: 'activity', label });
  }
  return out;
}
