// test/runner.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSkill } from '../lib/runner.mjs';

// Fabrique un faux query() du SDK : émet des messages assistant puis un result.
function fakeQuery(messages) {
  return async function* () { for (const m of messages) yield m; };
}
const asst = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const result = (text) => ({ type: 'result', subtype: 'success', is_error: false, result: text });

test('runSkill verify : émet les events et renvoie la valeur validée', async () => {
  const events = [];
  const stream = [
    asst('«BREVES» topic glm | GLM-5.2'),
    asst('«BREVES» step glm source'),
    asst('«BREVES» done glm'),
    result('```json\n{"topics":[{"key":"glm","sujet":"GLM-5.2","date_reelle":"2026-06-13","fiabilite":"confirme","faits":["x"],"source":"Z.ai","url_citee":"u","url_clippee":"u","slug":"glm","clipping_contenu":"c"}]}\n```'),
  ];
  const r = await runSkill({
    skill: 'breves-verify', inputs: { sujets: 'GLM-5.2' }, bbDir: '/tmp/bb',
    onEvent: (e) => events.push(e), query: fakeQuery(stream),
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.topics[0].key, 'glm');
  assert.deepEqual(events.map((e) => e.type), ['topic-detected', 'topic-progress', 'topic-done']);
});

test('runSkill rejette des inputs invalides sans appeler query', async () => {
  let called = false;
  const r = await runSkill({
    skill: 'breves-verify', inputs: { sujets: '   ' }, bbDir: '/tmp/bb',
    onEvent: () => {}, query: () => { called = true; return (async function* () {})(); },
  });
  assert.equal(r.ok, false);
  assert.equal(called, false);
});

test('runSkill signale un JSON final invalide', async () => {
  const events = [];
  const r = await runSkill({
    skill: 'breves-draft', inputs: { topics: [] }, bbDir: '/tmp/bb',
    onEvent: (e) => events.push(e),
    query: fakeQuery([result('pas de json')]),
  });
  assert.equal(r.ok, false);
  assert.ok(events.some((e) => e.type === 'result-error'));
});

test('runSkill remonte un échec SDK (result is_error)', async () => {
  const r = await runSkill({
    skill: 'breves-draft', inputs: { topics: [] }, bbDir: '/tmp/bb',
    onEvent: () => {},
    query: fakeQuery([{ type: 'result', subtype: 'error', is_error: true, result: 'boom' }]),
  });
  assert.equal(r.ok, false);
});
