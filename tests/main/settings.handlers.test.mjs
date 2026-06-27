// tests/main/settings.handlers.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSettingsState, registerSettingsHandlers } from '@main/ipc/settings.handlers';
import { readUserConfig } from '@main/io/config';

function fakeIpc() {
  const h = {};
  return { ipc: { handle: (ch, fn) => { h[ch] = fn; } }, h };
}
const fakeSys = { writeClipboard() {}, openExternal() {}, hideWindow() {}, pickPath: async () => null, quit() {} };

test('buildSettingsState: source=env quand variable définie', () => {
  const st = buildSettingsState({ BREVES_BB_DIR: '/x' }, {});
  assert.equal(st.bbDir.source, 'env');
  assert.equal(st.bbDir.value, '/x');
});

test('buildSettingsState: source=file + valid quand dossier existe', () => {
  const d = mkdtempSync(join(tmpdir(), 'set-'));
  const st = buildSettingsState({}, { repoDir: d });
  assert.equal(st.repoDir.source, 'file');
  assert.equal(st.repoDir.valid, true);
});

test('saveSettings: persiste + applique quand chemins valides', async () => {
  const { ipc, h } = fakeIpc();
  const userData = mkdtempSync(join(tmpdir(), 'ud-'));
  const valid = mkdtempSync(join(tmpdir(), 'ok-'));
  const deps = { bbDir: '/o', repoDir: '/o', claudeBin: '/o', wikiMcp: { type: 'stdio', command: 'p', args: ['/o/scripts/mcp/mcp-wiki.py'] } };
  registerSettingsHandlers(ipc, deps, fakeSys, userData, {});
  const r = await h['save-settings'](null, { bbDir: valid, repoDir: valid });
  assert.equal(r.ok, true);
  assert.equal(deps.bbDir, valid);
  assert.equal(deps.wikiMcp.args[0], join(valid, 'scripts/mcp/mcp-wiki.py'));
  assert.equal(readUserConfig(userData).bbDir, valid);
});

test('saveSettings: chemin invalide → ok:false, rien persisté', async () => {
  const { ipc, h } = fakeIpc();
  const userData = mkdtempSync(join(tmpdir(), 'ud-'));
  const deps = { bbDir: '/o', repoDir: '/o', claudeBin: '/o', wikiMcp: { type: 'stdio', command: 'p', args: [] } };
  registerSettingsHandlers(ipc, deps, fakeSys, userData, {});
  const r = await h['save-settings'](null, { bbDir: '/n/existe/pas' });
  assert.equal(r.ok, false);
  assert.deepEqual(readUserConfig(userData), {});
});

test('getSettings handler renvoie un SettingsState', async () => {
  const { ipc, h } = fakeIpc();
  const userData = mkdtempSync(join(tmpdir(), 'ud-'));
  const deps = { bbDir: '/o', repoDir: '/o', claudeBin: '/o', wikiMcp: { type: 'stdio', command: 'p', args: [] } };
  registerSettingsHandlers(ipc, deps, fakeSys, userData, { BREVES_BB_DIR: '/x' });
  const st = await h['get-settings'](null);
  assert.equal(st.bbDir.source, 'env');
});
