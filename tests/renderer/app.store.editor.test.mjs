import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('setWantSoulLesson met à jour le drapeau SOUL', () => {
  get().setWantSoulLesson(false);
  assert.equal(get().wantSoulLesson, false);
  get().setWantSoulLesson(true);
  assert.equal(get().wantSoulLesson, true);
});
