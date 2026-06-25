import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelForTool, activityFromMessage } from '../lib/activity.mjs';

test('labelForTool : Task enquêteur / sceptique', () => {
  assert.equal(labelForTool('Task', { subagent_type: 'enqueteur', description: 'GLM 5.2 open source' }), 'Enquêteur : GLM 5.2 open source');
  assert.equal(labelForTool('Task', { subagent_type: 'sceptique', description: 'réfuter le superlatif' }), 'Sceptique : réfuter le superlatif');
});
test('labelForTool : WebSearch et WebFetch', () => {
  assert.equal(labelForTool('WebSearch', { query: 'GLM 5.2 benchmark' }), 'Recherche web : GLM 5.2 benchmark');
  assert.equal(labelForTool('WebFetch', { url: 'https://www.example.com/article/x' }), 'Lecture : example.com');
});
test('labelForTool : MCP ignoré, outil inconnu générique', () => {
  assert.equal(labelForTool('mcp__wiki__search', { q: 'x' }), null);
  assert.equal(labelForTool('Bash', {}), 'Bash…');
});
test('activityFromMessage extrait les tool_use d’un message assistant', () => {
  const m = { type: 'assistant', message: { content: [
    { type: 'text', text: 'je lance' },
    { type: 'tool_use', name: 'WebSearch', input: { query: 'actu IA' } },
    { type: 'tool_use', name: 'Task', input: { subagent_type: 'enqueteur', description: 'sujet A' } },
  ] } };
  const evs = activityFromMessage(m);
  assert.deepEqual(evs, [
    { type: 'activity', label: 'Recherche web : actu IA' },
    { type: 'activity', label: 'Enquêteur : sujet A' },
  ]);
});
test('activityFromMessage : non-assistant ou contenu absent → []', () => {
  assert.deepEqual(activityFromMessage({ type: 'result' }), []);
  assert.deepEqual(activityFromMessage({ type: 'assistant', message: {} }), []);
});
