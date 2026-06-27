import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

export function loadEngineConfig(env: NodeJS.ProcessEnv = process.env): EngineConfig {
  const bbDir = env.BREVES_BB_DIR || '/Users/pleguern/Workspace/BoilingBrain';
  return {
    bbDir,
    // Défaut absolu en dur (symétrique de bbDir) : en app packagée, process.cwd()
    // vaut '/' → SOUL/agents introuvables. Surcharge possible via BREVES_REPO_DIR.
    repoDir: env.BREVES_REPO_DIR || '/Users/pleguern/Workspace/breves-ia',
    // Binaire natif Claude Code que le SDK exécute. Non bundlé (216 Mo) : on pointe
    // le claude installé. En app packagée, PATH est minimal → chemin absolu requis.
    claudeBin: env.BREVES_CLAUDE_BIN || '/Users/pleguern/.local/bin/claude',
    wikiMcp: {
      type: 'stdio',
      command: env.BREVES_WIKI_PY || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
      args: [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
    },
  };
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
