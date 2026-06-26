import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();
const ed = { file: '2026-06-13-glm.md', date: '2026-06-13', range: '2026-06-13', count: 3, corr: 1, title: 'GLM' };

test('openReader mémorise l\'édition, returnTo, vide readerText et navigue', () => {
  get().setView('history');
  get().setReaderText('ancien texte');
  get().openReader(ed, 'history');
  assert.equal(get().readerEdition?.file, '2026-06-13-glm.md');
  assert.equal(get().returnTo, 'history');
  assert.equal(get().readerText, '');
  assert.equal(get().view, 'reader');
});
test('setReaderText met à jour le texte brut', () => {
  get().setReaderText('# Édition\n— 13 juin —');
  assert.equal(get().readerText, '# Édition\n— 13 juin —');
});
test('openReader depuis le dashboard fixe returnTo=dashboard', () => {
  get().openReader(ed, 'dashboard');
  assert.equal(get().returnTo, 'dashboard');
  assert.equal(get().view, 'reader');
});
