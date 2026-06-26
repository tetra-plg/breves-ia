// test/ui-state.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { nextView, stepper, viewTitle, FLOW } from '../lib/ui-state.mjs';

test('transitions du flux', () => {
  assert.equal(nextView('dashboard', 'goCompose'), 'compose');
  assert.equal(nextView('compose', 'launch'), 'checking');
  assert.equal(nextView('checking', 'toEditor'), 'editor');
  assert.equal(nextView('editor', 'validate'), 'archived');
  assert.equal(nextView('archived', 'goDash'), 'dashboard');
  assert.equal(nextView('dashboard', 'goSoul'), 'soul');
  assert.equal(nextView('dashboard', 'goHist'), 'history');
  assert.equal(nextView('dashboard', 'goAgents'), 'agents');
});
test('action inconnue garde la vue', () => {
  assert.equal(nextView('editor', 'bidon'), 'editor');
});
test('stepper marque done/active/todo', () => {
  const s = stepper('checking'); // index 1 dans FLOW
  assert.deepEqual(s.steps.map((x) => x.state), ['done', 'active', 'todo', 'todo']);
  assert.equal(s.line, '2 / 4 · Vérification');
});
test('stepper vide hors flux', () => {
  assert.deepEqual(stepper('dashboard'), { steps: [], line: '' });
});
test('viewTitle', () => {
  assert.equal(viewTitle('compose'), 'Nouvelle édition');
  assert.equal(viewTitle('soul'), 'SOUL — le style');
  assert.equal(viewTitle('history'), 'Historique');
  assert.equal(viewTitle('agents'), 'Agents');
  assert.equal(viewTitle('ech-editions'), 'Choisir une édition');
  assert.equal(viewTitle('ech-breves'), 'Choisir une brève');
  assert.equal(viewTitle('dashboard'), 'Brèves IA');
});
