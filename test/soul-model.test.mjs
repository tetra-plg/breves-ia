// test/soul-model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSoul, replaceSoulSections } from '../lib/soul-model.mjs';

const RAW = readFileSync(new URL('./fixtures/SOUL.full.md', import.meta.url), 'utf8');

test('parseSoul extrait §1-4 (corps brut)', () => {
  const s = parseSoul(RAW);
  assert.equal(s.quiParle, 'Je suis Pierre, VP Engineering.');
  assert.equal(s.audience, 'Mes collègues PM de Merim.');
  assert.match(s.voix, /Première personne/);
  assert.match(s.lignesRouges, /Jamais d'invention/);
});
test('parseSoul extrait §5 échantillons', () => {
  const s = parseSoul(RAW);
  assert.equal(s.echantillons.length, 2);
  assert.deepEqual(
    { date: s.echantillons[0].date, seed: s.echantillons[0].seed, epingle: s.echantillons[0].epingle },
    { date: '2026-06-24', seed: false, epingle: false },
  );
  assert.equal(s.echantillons[1].epingle, true);            // épinglé: oui
  assert.match(s.echantillons[0].texte, /accroche en gras/);
});
test('parseSoul extrait §6 journal + version', () => {
  const s = parseSoul(RAW);
  assert.equal(s.journal.length, 2);
  assert.equal(s.journal[0].date, '2026-06-24');
  assert.match(s.journal[0].texte, /démenti/);
  assert.equal(s.version, 'v3');                            // 2 leçons + 1
});
test('parseSoul tolère une SOUL minimale', () => {
  const s = parseSoul('# SOUL\n\n## 1. Qui parle\nX\n');
  assert.equal(s.quiParle, 'X');
  assert.deepEqual(s.echantillons, []);
  assert.deepEqual(s.journal, []);
  assert.equal(s.version, 'v1');
});
test('replaceSoulSections réécrit §1-4 sans toucher §5/§6', () => {
  const out = replaceSoulSections(RAW, {
    quiParle: 'Nouvelle identité.', audience: 'Nouveau public.',
    voix: '- Nouveau tic.', lignesRouges: '- Nouvelle ligne rouge.',
  });
  // §1-4 reflètent les nouvelles valeurs
  const re = parseSoul(out);
  assert.equal(re.quiParle, 'Nouvelle identité.');
  assert.equal(re.voix, '- Nouveau tic.');
  // §5 + §6 octet pour octet identiques
  const tail = (t) => t.slice(t.indexOf('## 5.'));
  assert.equal(tail(out), tail(RAW));
});
