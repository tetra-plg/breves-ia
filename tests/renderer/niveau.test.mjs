import { test } from 'vitest';
import assert from 'node:assert/strict';
import { niveauColor, niveauSoft, niveauLabel } from '@renderer/components/niveau';

test('niveauColor mappe les niveaux', () => {
  assert.equal(niveauColor('corrigé'), 'var(--warn)');
  assert.equal(niveauColor('nuance'), 'var(--nuance)');
  assert.equal(niveauColor('date'), 'var(--accent)');
});
test('niveauSoft mappe les niveaux', () => {
  assert.equal(niveauSoft('corrigé'), 'var(--warnSoft)');
  assert.equal(niveauSoft('nuance'), 'var(--nuanceSoft)');
  assert.equal(niveauSoft('date'), 'var(--accentSoft)');
});
test('niveauLabel mappe les niveaux', () => {
  assert.equal(niveauLabel('corrigé'), 'Fait corrigé');
  assert.equal(niveauLabel('nuance'), 'Nuance');
  assert.equal(niveauLabel('date'), 'Date');
});
