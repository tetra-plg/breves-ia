import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelForTool, activityFromMessage } from '../lib/activity.mjs';

test('labelForTool : Task enquêteur / sceptique', () => {
  assert.equal(labelForTool('Task', { subagent_type: 'enqueteur', description: 'GLM 5.2 open source' }), 'Enquêteur : GLM 5.2 open source');
  assert.equal(labelForTool('Task', { subagent_type: 'sceptique', description: 'réfuter le superlatif' }), 'Sceptique : réfuter le superlatif');
});
test('labelForTool : l’outil Agent (dispatch sous-agent SDK) est étiqueté comme Task', () => {
  assert.equal(labelForTool('Agent', { subagent_type: 'redacteur', description: 'rédige les brèves' }), 'Rédacteur : rédige les brèves');
  assert.equal(labelForTool('Agent', { subagent_type: 'enqueteur', description: 'vérifie GLM' }), 'Enquêteur : vérifie GLM');
});
test('labelForTool : WebSearch et WebFetch', () => {
  assert.equal(labelForTool('WebSearch', { query: 'GLM 5.2 benchmark' }), 'Recherche web : GLM 5.2 benchmark');
  assert.equal(labelForTool('WebFetch', { url: 'https://www.example.com/article/x' }), 'Lecture : example.com');
});
test('labelForTool : fichiers Read/Edit/Write par nom de base', () => {
  assert.equal(labelForTool('Edit', { file_path: '/a/b/SOUL.md' }), 'Édition : SOUL.md');
  assert.equal(labelForTool('Write', { file_path: '/x/note.md' }), 'Écriture : note.md');
  assert.equal(labelForTool('Read', { file_path: '/x/y/z.txt' }), 'Lecture : z.txt');
});
test('labelForTool : dépôt wiki et MCP générique', () => {
  assert.equal(labelForTool('mcp__boiling-brain-wiki__drop_to_raw', { subfolder: 'notes', filename: '2026-06-25-x.md' }), 'Dépôt wiki : 2026-06-25-x.md');
  assert.equal(labelForTool('mcp__boiling-brain-wiki__search_wiki', { query: 'x' }), 'Wiki : search_wiki');
  assert.equal(labelForTool('TodoWrite', {}), null);
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
