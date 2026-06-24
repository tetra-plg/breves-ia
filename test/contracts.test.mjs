import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVerifyOutput, validateDraftOutput, validateArchiveOutput } from '../lib/contracts.mjs';

const topic = {
  key: 'glm', sujet: 'GLM-5.2', date_reelle: '2026-06-13', fiabilite: 'confirme',
  faits: ['open weights MIT'], source: 'Z.ai Blog', url_citee: 'https://z.ai/blog/glm-5.2',
  url_clippee: 'https://z.ai/blog/glm-5.2', slug: 'glm-5-2', clipping_contenu: '...'
};

test('verify ok', () => assert.equal(validateVerifyOutput({ topics: [topic] }).ok, true));
test('verify rejette topics absent', () => assert.equal(validateVerifyOutput({}).ok, false));
test('verify rejette fiabilite invalide', () =>
  assert.equal(validateVerifyOutput({ topics: [{ ...topic, fiabilite: 'oui' }] }).ok, false));
test('verify rejette champ requis manquant', () => {
  const { slug, ...sansSlug } = topic;
  assert.equal(validateVerifyOutput({ topics: [sansSlug] }).ok, false);
});
test('verify rejette alerte.niveau invalide', () =>
  assert.equal(validateVerifyOutput({ topics: [{ ...topic, alerte: { niveau: 'x', texte: 'y' } }] }).ok, false));

test('draft ok', () => assert.equal(validateDraftOutput({
  teamsText: '...', corrections: [{ niveau: 'corrigé', titre: 't', detail: 'd' }],
  sources: [{ name: 'Z.ai', url_citee: 'u', url_clippee: 'u', repli: false }]
}).ok, true));
test('draft rejette teamsText vide', () =>
  assert.equal(validateDraftOutput({ teamsText: '', corrections: [], sources: [] }).ok, false));

test('archive ok', () => assert.equal(validateArchiveOutput({
  archiveSteps: [{ t: 'Note', d: 'raw/notes/x.md' }], newsletterText: '...', soulVersion: 'v9'
}).ok, true));
test('archive rejette archiveSteps non tableau', () =>
  assert.equal(validateArchiveOutput({ archiveSteps: 'x', newsletterText: 'y', soulVersion: 'v9' }).ok, false));
