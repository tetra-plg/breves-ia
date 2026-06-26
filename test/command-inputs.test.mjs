// test/command-inputs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInputs, buildPrompt } from '../lib/command-inputs.mjs';

test('verify accepte un texte multi-lignes borné', () => {
  assert.deepEqual(validateInputs('breves-verify', { sujets: 'GLM 5.2\nMidjourney scan' }), { ok: true });
});
test('verify refuse sujets vide', () => {
  assert.equal(validateInputs('breves-verify', { sujets: '   ' }).ok, false);
});
test('verify refuse une clé inattendue', () => {
  assert.equal(validateInputs('breves-verify', { sujets: 'x', autre: 1 }).ok, false);
});
test('verify accepte les sauts de ligne mais refuse les autres contrôles', () => {
  assert.equal(validateInputs('breves-verify', { sujets: 'a\nb' }).ok, true);   // \n autorisé
  assert.equal(validateInputs('breves-verify', { sujets: 'a\u0000b' }).ok, false); // NUL refusé
  assert.equal(validateInputs('breves-verify', { sujets: 'a\tb' }).ok, false);   // \t refusé
});
test('draft exige topics tableau et feedback optionnel string', () => {
  assert.equal(validateInputs('breves-draft', { topics: [], feedback: 'plus court' }).ok, true);
  assert.equal(validateInputs('breves-draft', { topics: 'x' }).ok, false);
});
test('archive exige teamsText + topics + sources', () => {
  assert.equal(validateInputs('breves-archive', { teamsText: 't', topics: [], sources: [] }).ok, true);
  assert.equal(validateInputs('breves-archive', { teamsText: 't', topics: [] }).ok, false);
});
test('skill inconnu rejeté', () => {
  assert.equal(validateInputs('autre', {}).ok, false);
});
test('buildPrompt produit /skill + bloc INPUTS et lève hors allow-list', () => {
  const p = buildPrompt('breves-verify', { sujets: 'GLM 5.2' });
  assert.match(p, /^\/breves-verify/);
  assert.match(p, /INPUTS/);
  assert.match(p, /ne pose aucune question/);
  assert.throws(() => buildPrompt('rm-rf', {}));
});

test('verify accepte un mode sceptique valide et refuse un invalide', () => {
  assert.equal(validateInputs('breves-verify', { sujets: 'x', sceptique: 'ciblé' }).ok, true);
  assert.equal(validateInputs('breves-verify', { sujets: 'x', sceptique: 'bidon' }).ok, false);
});

test('breves-draft : redacteur on/off accepté, autre valeur rejetée', () => {
  assert.equal(validateInputs('breves-draft', { topics: [], redacteur: 'on' }).ok, true);
  assert.equal(validateInputs('breves-draft', { topics: [], redacteur: 'off' }).ok, true);
  assert.equal(validateInputs('breves-draft', { topics: [] }).ok, true); // optionnel
  assert.equal(validateInputs('breves-draft', { topics: [], redacteur: 'bidon' }).ok, false);
  assert.equal(validateInputs('breves-draft', { topics: [], autre: 1 }).ok, false); // clé inattendue
});
