import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAgent, toAgentDefinition } from '../lib/agent-file.mjs';

const RAW = readFileSync(new URL('./fixtures/agent.sample.md', import.meta.url), 'utf8');

test('parseAgent : frontmatter + corps', () => {
  const a = parseAgent(RAW);
  assert.equal(a.name, 'enqueteur');
  assert.equal(a.description, 'Vérifie un sujet IA pour une brève.');
  assert.deepEqual(a.tools, ['WebSearch', 'WebFetch']);
  assert.equal(a.model, 'sonnet');
  assert.equal(a.enabled, true);
  assert.match(a.systemPrompt, /^Tu es un enquêteur\./);
});
test('parseAgent : breves_mode + enabled=false', () => {
  const a = parseAgent('---\nname: sceptique\nbreves_enabled: false\nbreves_mode: toujours\n---\ncorps');
  assert.equal(a.enabled, false);
  assert.equal(a.mode, 'toujours');
});
test('parseAgent : champs manquants → défauts, ne jette pas', () => {
  const a = parseAgent('---\nname: x\n---\nprompt');
  assert.deepEqual(a.tools, []);
  assert.equal(a.model, '');
  assert.equal(a.enabled, true);
  assert.equal(a.systemPrompt, 'prompt');
});
test('toAgentDefinition : forme SDK', () => {
  const def = toAgentDefinition({ description: 'd', systemPrompt: 'p', tools: ['WebSearch'], model: 'sonnet' });
  assert.deepEqual(def, { description: 'd', prompt: 'p', tools: ['WebSearch'], model: 'sonnet' });
  const def2 = toAgentDefinition({ description: 'd', systemPrompt: 'p', tools: [], model: '' });
  assert.deepEqual(def2, { description: 'd', prompt: 'p' });   // tools/model omis si vides
});
