import { test } from 'vitest';
import assert from 'node:assert/strict';
import { handleStreamEvent } from '@renderer/hooks/useCommandStream';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('handleStreamEvent route activity → runStatus.activity', () => {
  get().beginRun();
  handleStreamEvent({ type: 'activity', label: 'Lecture : z.ai' });
  assert.equal(get().runStatus.activity, 'Lecture : z.ai');
});
test('handleStreamEvent route topic-* → cards', () => {
  get().resetCards();
  handleStreamEvent({ type: 'topic-detected', key: 'k', sujet: 'S' });
  assert.equal(get().cards.length, 1);
  handleStreamEvent({ type: 'topic-done', key: 'k' });
  assert.equal(get().cards[0].done, true);
});
test('handleStreamEvent ignore un type inconnu', () => {
  get().resetCards();
  handleStreamEvent({ type: 'autre' });
  assert.equal(get().cards.length, 0);
});
