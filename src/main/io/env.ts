import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UserConfig } from '@main/io/config';

export interface WikiMcp {
  type: 'stdio';
  command: string;
  args: string[];
}

export interface EngineConfig {
  bbDir: string;
  repoDir: string;
  claudeBin: string;
  wikiMcp: WikiMcp;
}

export type SettingKey = 'bbDir' | 'repoDir' | 'claudeBin';

export const DEFAULTS: Record<SettingKey, string> = {
  bbDir: '/Users/pleguern/Workspace/BoilingBrain',
  repoDir: '/Users/pleguern/Workspace/breves-ia',
  claudeBin: '/Users/pleguern/.local/bin/claude',
};

export const ENV_KEYS: Record<SettingKey, string> = {
  bbDir: 'BREVES_BB_DIR',
  repoDir: 'BREVES_REPO_DIR',
  claudeBin: 'BREVES_CLAUDE_BIN',
};

export function resolveSetting(
  key: SettingKey,
  env: NodeJS.ProcessEnv,
  userConfig: UserConfig,
): { value: string; source: 'env' | 'file' | 'default' } {
  const envVal = env[ENV_KEYS[key]];
  if (envVal) return { value: envVal, source: 'env' };
  const fileVal = userConfig[key];
  if (fileVal) return { value: fileVal, source: 'file' };
  return { value: DEFAULTS[key], source: 'default' };
}

export function buildWikiMcp(env: NodeJS.ProcessEnv, bbDir: string): WikiMcp {
  return {
    type: 'stdio',
    command: env.BREVES_WIKI_PY || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
    args: [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
  };
}

export function loadEngineConfig(env: NodeJS.ProcessEnv = process.env, userConfig: UserConfig = {}): EngineConfig {
  const bbDir = resolveSetting('bbDir', env, userConfig).value;
  const repoDir = resolveSetting('repoDir', env, userConfig).value;
  const claudeBin = resolveSetting('claudeBin', env, userConfig).value;
  return { bbDir, repoDir, claudeBin, wikiMcp: buildWikiMcp(env, bbDir) };
}

// Chargeur .env minimal (sans dépendance). Format : KEY=valeur ; # et lignes vides ignorés ; guillemets optionnels.
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Charge `path` dans `env` SANS écraser une variable déjà définie. Fichier absent → no-op.
export function loadEnvFile(path = '.env', env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const parsed = parseEnv(text);
  const applied: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (env[k] === undefined) {
      env[k] = v;
      applied[k] = v;
    }
  }
  return applied;
}
