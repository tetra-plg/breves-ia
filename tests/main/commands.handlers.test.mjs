import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerCommandsHandlers } from '@main/ipc/commands.handlers';

function fakeIpc() {
  const h = {};
  return { ipc: { handle: (ch, fn) => { h[ch] = fn; } }, h };
}
function depsWithCommand() {
  const repo = mkdtempSync(join(tmpdir(), 'repo-'));
  mkdirSync(join(repo, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(repo, '.claude', 'commands', 'breves-verify.md'), '---\ndescription: P1\n---\n\nCorps.');
  return { repoDir: repo, readdir: (p) => readdirSync(p), readFile: (p) => readFileSync(p, 'utf8'), writeFile: (p, t) => writeFileSync(p, t, 'utf8') };
}

test('get-commands renvoie la liste', async () => {
  const { ipc, h } = fakeIpc();
  registerCommandsHandlers(ipc, depsWithCommand());
  const cmds = await h['get-commands'](null);
  assert.equal(cmds[0].name, 'breves-verify');
});

test('save-command écrit puis get-commands reflète', async () => {
  const { ipc, h } = fakeIpc();
  const deps = depsWithCommand();
  registerCommandsHandlers(ipc, deps);
  const r = await h['save-command'](null, { name: 'breves-verify', edits: { description: 'P1b', body: 'Maj.' } });
  assert.equal(r.ok, true);
  const c = (await h['get-commands'](null))[0];
  assert.equal(c.description, 'P1b');
  assert.equal(c.body, 'Maj.');
});
