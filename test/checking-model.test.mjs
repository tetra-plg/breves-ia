// test/checking-model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initCard, applyEvent, applyResult, summary, STEPS } from '../lib/checking-model.mjs';

const states = (card) => card.steps.map((s) => s.state);

test('initCard démarre recherche en active', () => {
  const c = initCard('glm', 'GLM-5.2');
  assert.equal(c.steps.length, 5);
  assert.deepEqual(states(c), ['active', 'todo', 'todo', 'todo', 'todo']);
  assert.equal(c.done, false);
});
test('topic-detected ajoute une carte', () => {
  const cards = applyEvent([], { type: 'topic-detected', key: 'glm', sujet: 'GLM-5.2' });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].key, 'glm');
});
test('topic-progress coche l\'étape et active la suivante', () => {
  let cards = applyEvent([], { type: 'topic-detected', key: 'glm', sujet: 'GLM' });
  cards = applyEvent(cards, { type: 'topic-progress', key: 'glm', step: 'source' });
  const c = cards[0];
  assert.equal(c.steps[STEPS.indexOf('source')].state, 'done');
  assert.equal(c.steps[STEPS.indexOf('article')].state, 'active');
});
test('topic-done termine la carte', () => {
  let cards = applyEvent([], { type: 'topic-detected', key: 'glm', sujet: 'GLM' });
  cards = applyEvent(cards, { type: 'topic-done', key: 'glm' });
  assert.equal(cards[0].done, true);
  assert.ok(cards[0].steps.every((s) => s.state === 'done'));
});
test('topic-error marque l\'erreur', () => {
  let cards = applyEvent([], { type: 'topic-detected', key: 'mj', sujet: 'MJ' });
  cards = applyEvent(cards, { type: 'topic-error', key: 'mj', error: 'inaccessible' });
  assert.equal(cards[0].done, true);
  assert.equal(cards[0].error, 'inaccessible');
});
test('applyResult termine les cartes même SANS aucun event (filet zéro-sentinelle)', () => {
  const value = { topics: [
    { key: 'glm', sujet: 'GLM', source: 'Z.ai', alerte: { niveau: 'nuance', texte: 'API en Chine' } },
  ] };
  const cards = applyResult([], value);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].done, true);
  assert.equal(cards[0].source, 'Z.ai');
  assert.deepEqual(cards[0].alerte, { niveau: 'nuance', texte: 'API en Chine' });
  assert.ok(cards[0].steps.every((s) => s.state === 'done'));
});
test('summary compte vérifiés/corrigés/nuancés', () => {
  const value = { topics: [
    { key: 'a', sujet: 'A', source: 's', alerte: { niveau: 'corrigé', texte: 'x' } },
    { key: 'b', sujet: 'B', source: 's', alerte: { niveau: 'nuance', texte: 'y' } },
    { key: 'c', sujet: 'C', source: 's' },
  ] };
  const cards = applyResult([], value);
  assert.deepEqual(summary(cards), { verifies: 3, corriges: 1, nuances: 1 });
});
