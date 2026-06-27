import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerAgentsHandlers } from '@main/ipc/agents.handlers';

function fakeIpc() {
  const h = {};
  return { ipc: { handle: (ch, fn) => { h[ch] = fn; } }, h };
}

// La validation Zod intervient avant le moteur : des deps vides suffisent pour les cas de rejet.
test('save-agent rejette un systemPrompt vide (validation Zod)', async () => {
  const { ipc, h } = fakeIpc();
  registerAgentsHandlers(ipc, {});
  const r = await h['save-agent'](null, { name: 'enqueteur', edits: { systemPrompt: '' } });
  assert.equal(r.ok, false);
});

test('save-agent rejette un payload sans name (validation Zod)', async () => {
  const { ipc, h } = fakeIpc();
  registerAgentsHandlers(ipc, {});
  const r = await h['save-agent'](null, { edits: { systemPrompt: 'x' } });
  assert.equal(r.ok, false);
});
