import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

export function loadEngineConfig(env = process.env) {
  const bbDir = env.BREVES_BB_DIR || '/Users/pleguern/Workspace/BoilingBrain';
  return {
    bbDir,
    repoDir: env.BREVES_REPO_DIR || REPO_ROOT,
    wikiMcp: {
      command: env.BREVES_WIKI_PY || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
      args: [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
    },
  };
}
