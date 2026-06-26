import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('état initial', () => {
  const s = get();
  assert.equal(s.view, 'dashboard');
  assert.equal(s.theme, 'light');
  assert.equal(s.toast, null);
});
test('go() suit la machine d\'états domain/navigation', () => {
  get().setView('dashboard');
  get().go('goCompose');
  assert.equal(get().view, 'compose');
  get().go('launch');
  assert.equal(get().view, 'checking');
  get().go('inconnu'); // action inconnue → vue inchangée
  assert.equal(get().view, 'checking');
});
test('toggleTheme bascule light/dark', () => {
  get().setView('dashboard');
  const t0 = get().theme;
  get().toggleTheme();
  assert.notEqual(get().theme, t0);
  get().toggleTheme();
  assert.equal(get().theme, t0);
});
test('showToast / clearToast', () => {
  get().showToast('coucou');
  assert.equal(get().toast, 'coucou');
  get().clearToast();
  assert.equal(get().toast, null);
});
test('setDashboard stocke les données', () => {
  get().setDashboard({ soul: null, editions: [] });
  assert.deepEqual(get().dashboard, { soul: null, editions: [] });
});
