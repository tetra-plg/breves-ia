import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngineConfig } from '../lib/config.mjs';

test('bbDir par défaut', () => {
  assert.equal(loadEngineConfig({}).bbDir, '/Users/pleguern/Workspace/BoilingBrain');
});
test('bbDir surchargé par BREVES_BB_DIR', () => {
  assert.equal(loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb' }).bbDir, '/tmp/bb');
});
test('repoDir surchargé par BREVES_REPO_DIR', () => {
  assert.equal(loadEngineConfig({ BREVES_REPO_DIR: '/tmp/repo' }).repoDir, '/tmp/repo');
});
test('repoDir par défaut est un chemin absolu vers le repo', () => {
  const r = loadEngineConfig({}).repoDir;
  assert.ok(r.startsWith('/'));
  assert.ok(r.endsWith('breves-ia'));
});
test('wikiMcp pointe le script python du wiki', () => {
  const m = loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb' }).wikiMcp;
  assert.equal(m.command, '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python');
  assert.deepEqual(m.args, ['/tmp/bb/scripts/mcp/mcp-wiki.py']);
});
test('wikiMcp surchargeable', () => {
  const m = loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb', BREVES_WIKI_PY: '/py', BREVES_WIKI_SCRIPT: '/s.py' }).wikiMcp;
  assert.equal(m.command, '/py');
  assert.deepEqual(m.args, ['/s.py']);
});
