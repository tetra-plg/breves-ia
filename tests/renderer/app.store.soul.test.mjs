import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('loadSoul peuple form/version/journal/échantillons', () => {
  get().loadSoul({
    version: 'v3', quiParle: 'Q', audience: 'A', voix: 'V', lignesRouges: 'L',
    echantillons: [{ date: '2026-01-01', source: 'z.ai', texte: 'T' }],
    journal: [{ date: '2026-01-01', texte: 'leçon' }],
  });
  assert.equal(get().soulForm.quiParle, 'Q');
  assert.equal(get().soulForm.lignesRouges, 'L');
  assert.equal(get().soulVersion, 'v3');
  assert.equal(get().soulJournal.length, 1);
  assert.equal(get().echantillons.length, 1);
});
test('setSoulField met à jour un champ', () => {
  get().setSoulField('audience', 'Nouvelle audience');
  assert.equal(get().soulForm.audience, 'Nouvelle audience');
});
test('addEchantillon respecte le max 3', () => {
  get().setEchantillons([]);
  get().addEchantillon({ date: 'd', source: 's', texte: 't1' });
  get().addEchantillon({ date: 'd', source: 's', texte: 't2' });
  get().addEchantillon({ date: 'd', source: 's', texte: 't3' });
  get().addEchantillon({ date: 'd', source: 's', texte: 't4' });
  assert.equal(get().echantillons.length, 3);
  assert.equal(get().echantillons[2].texte, 't3');
});
test('removeEchantillon retire par index', () => {
  get().setEchantillons([
    { date: 'd', source: 's', texte: 'a' },
    { date: 'd', source: 's', texte: 'b' },
  ]);
  get().removeEchantillon(0);
  assert.equal(get().echantillons.length, 1);
  assert.equal(get().echantillons[0].texte, 'b');
});
test('setEchEdition / setEchKeepLocal', () => {
  get().setEchKeepLocal(true);
  assert.equal(get().echKeepLocal, true);
  get().setEchEdition({ file: 'f', date: '2026-01-01', range: '2026-01-01', count: 2, corr: 0, title: 'T' });
  assert.equal(get().echEdition?.file, 'f');
});
