import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerDashboardHandlers } from '@main/ipc/dashboard.handlers';
import { registerSoulHandlers } from '@main/ipc/soul.handlers';
import { registerAgentsHandlers } from '@main/ipc/agents.handlers';

function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
const e = { sender: { send: () => {}, isDestroyed: () => false } };

test('get-dashboard + read-edition routent vers le moteur', async () => {
  const ipc = fakeIpc();
  const deps = { repoDir: '/r', bbDir: '/b', readSoul: () => ({ version: 'v8', rules: [], examples: [], lessons: [] }), listEditions: () => [], readFile: () => '# x' };
  registerDashboardHandlers(ipc, deps);
  const d = await ipc.h['get-dashboard'](e);
  assert.equal(d.soul.version, 'v8');
  const txt = await ipc.h['read-edition'](e, '2026-06-17-breves-ia-merim.md');
  assert.equal(txt, '# x');
});

test('soul handlers routent get/save', async () => {
  const ipc = fakeIpc();
  let wrote = false;
  const SOUL = '## 1. Qui parle\nA\n\n## 2. Audience\nB\n\n## 3. Voix\nC\n\n## 4. Lignes rouges\nD\n\n## 5. Échantillons vivants\n\n## 6. Journal\n';
  const deps = { repoDir: '/r', readFile: () => SOUL, writeFile: () => { wrote = true; } };
  registerSoulHandlers(ipc, deps);
  const s = await ipc.h['get-soul-structured'](e);
  assert.equal(s.quiParle, 'A');
  const r = await ipc.h['save-soul-sections'](e, { quiParle: 'X', audience: 'Y', voix: 'Z', lignesRouges: 'W' });
  assert.equal(r.ok, true);
  assert.equal(wrote, true);
});

test('agents handlers routent get/save', async () => {
  const ipc = fakeIpc();
  const AGENT = '---\nname: sceptique\n---\nprompt';
  const deps = { repoDir: '/r', readdir: () => ['sceptique.md'], readFile: () => AGENT, writeFile: () => {} };
  registerAgentsHandlers(ipc, deps);
  const list = await ipc.h['get-agents'](e);
  assert.equal(list[0].name, 'sceptique');
  const r = await ipc.h['save-agent'](e, { name: 'sceptique', edits: { systemPrompt: 'nouveau' } });
  assert.equal(r.ok, true);
});
