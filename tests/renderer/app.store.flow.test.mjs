import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore, fmtClock } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('fmtClock formate m:ss', () => {
  assert.equal(fmtClock(0), '0:00');
  assert.equal(fmtClock(65000), '1:05');
  assert.equal(fmtClock(-100), '0:00');
});
test('applyCardEvent ajoute/avance une carte via domain/checking', () => {
  get().resetCards();
  get().applyCardEvent({ type: 'topic-detected', key: 'k', sujet: 'Sujet K' });
  assert.equal(get().cards.length, 1);
  assert.equal(get().cards[0].title, 'Sujet K');
  get().applyCardEvent({ type: 'topic-done', key: 'k' });
  assert.equal(get().cards[0].done, true);
});
test('applyResultCards termine les cartes', () => {
  get().resetCards();
  get().applyResultCards({ topics: [{ key: 'k', sujet: 'S' }] });
  assert.equal(get().cards[0].done, true);
});
test('beginRun/setRunActivity/endRun pilotent runStatus', () => {
  get().beginRun('Vérification en cours');
  assert.equal(get().runStatus.active, true);
  assert.equal(get().runStatus.title, 'Vérification en cours');
  get().setRunActivity('Recherche web…');
  assert.equal(get().runStatus.activity, 'Recherche web…');
  get().endRun();
  assert.equal(get().runStatus.active, false);
});
test('tickClock met à jour l\'horloge', () => {
  get().beginRun();
  const t0 = get().runStatus.t0;
  get().tickClock(t0 + 65000);
  assert.equal(get().runStatus.clock, '1:05');
});
