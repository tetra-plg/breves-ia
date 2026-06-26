import { test } from 'vitest';
import assert from 'node:assert/strict';
import { loadEngineConfig, parseEnv, loadEnvFile } from '@main/io/env';

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
  assert.equal(m.type, 'stdio');
  assert.equal(m.command, '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python');
  assert.deepEqual(m.args, ['/tmp/bb/scripts/mcp/mcp-wiki.py']);
});
test('wikiMcp surchargeable', () => {
  const m = loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb', BREVES_WIKI_PY: '/py', BREVES_WIKI_SCRIPT: '/s.py' }).wikiMcp;
  assert.equal(m.command, '/py');
  assert.deepEqual(m.args, ['/s.py']);
});
test('parseEnv lit KEY=val, ignore # et lignes vides, retire les guillemets', () => {
  const out = parseEnv('# commentaire\nA=1\n\nB="deux"\nC=\'trois\'\nMAUVAIS');
  assert.deepEqual(out, { A: '1', B: 'deux', C: 'trois' });
});
test('loadEnvFile n\'écrase pas une variable déjà définie', () => {
  const env = { A: 'déjà' };
  const applied = loadEnvFile('/chemin/inexistant/.env', env);
  assert.deepEqual(applied, {}); // fichier absent -> no-op
  assert.equal(env.A, 'déjà');
});
