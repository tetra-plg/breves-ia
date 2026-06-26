// test/soul-model.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSoul, replaceSoulSections, serializeEchantillons, replaceSoulEchantillons } from '../lib/soul-model.mjs';

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
    { date: s.echantillons[0].date, source: s.echantillons[0].source },
    { date: '2026-06-24', source: '' },
  );
  assert.equal(s.echantillons[1].source, '');               // ancien format : pas de source
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

const SOUL = `# SOUL

## 1. Qui parle
Pierre.

## 5. Échantillons vivants (fenêtre glissante)
> ancien préambule
### [2026-06-17] seed: false | épinglé: non
**Vieux.** corps vieux.
https://a.com/x

## 6. Journal d'évolution
> j
- [2026-06-24] une leçon.`;

test('parseEchantillons : nouveau shape {date,source,texte}, tolère l\'ancien format', () => {
  const s = parseSoul(SOUL);
  assert.equal(s.echantillons.length, 1);
  assert.equal(s.echantillons[0].date, '2026-06-17');
  assert.equal(s.echantillons[0].source, '');           // ancien format : pas de source
  assert.match(s.echantillons[0].texte, /^\*\*Vieux\.\*\*/);
  assert.equal(s.echantillons[0].seed, undefined);       // flags supprimés
});
test('serializeEchantillons : préambule + entrées, source omise si vide, cap 3', () => {
  const out = serializeEchantillons([
    { date: '2026-06-18', source: 'z.ai', texte: '**A.** corps a.' },
    { date: '2026-06-18', source: '', texte: '**B.** corps b.' },
    { date: '2026-06-18', source: 'c.com', texte: '**C.** corps c.' },
    { date: '2026-06-18', source: 'd.com', texte: '**D.** corps d.' },
  ]);
  assert.match(out, /^> /);                               // préambule
  assert.match(out, /### \[2026-06-18\] · z\.ai\n\*\*A\.\*\*/);
  assert.match(out, /### \[2026-06-18\]\n\*\*B\.\*\*/);   // source vide → pas de « · »
  assert.doesNotMatch(out, /\*\*D\.\*\*/);                // 4e ignoré (cap 3)
});
test('replaceSoulEchantillons : remplace §5, garde §1 et §6', () => {
  const out = replaceSoulEchantillons(SOUL, [{ date: '2026-06-18', source: 'z.ai', texte: '**Neuf.** corps.' }]);
  assert.match(out, /## 1\. Qui parle\nPierre\./);
  assert.match(out, /## 6\. Journal[\s\S]*une leçon\./);
  assert.match(out, /### \[2026-06-18\] · z\.ai\n\*\*Neuf\.\*\*/);
  assert.doesNotMatch(out, /Vieux/);                      // ancien échantillon remplacé
  assert.equal(parseSoul(out).echantillons.length, 1);
});
test('replaceSoulEchantillons : liste vide → préambule seul', () => {
  const out = replaceSoulEchantillons(SOUL, []);
  assert.equal(parseSoul(out).echantillons.length, 0);
});
