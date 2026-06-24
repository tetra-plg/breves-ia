import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEditionHtml } from '../lib/edition-render.mjs';

const ED = `📰 Brèves IA
Voici quelques nouvelles.

— 12 juin —
**Google publie l'OKF** (Apache 2.0).
https://cloud.google.com/blog/x

— 13 juin —
**GLM-5.2 débarque.** Modèle <ouvert>.
https://z.ai/blog`;

test('titre + intro', () => {
  const h = renderEditionHtml(ED);
  assert.match(h, /class="ed-title"[^>]*>📰 Brèves IA</);
  assert.match(h, /class="ed-intro"[^>]*>Voici quelques nouvelles\./);
});
test('chaque date devient un ed-date', () => {
  const h = renderEditionHtml(ED);
  assert.equal((h.match(/class="ed-date"/g) || []).length, 2);
  assert.match(h, /class="ed-date"[^>]*>12 juin</);
});
test('accroche en gras', () => {
  assert.match(renderEditionHtml(ED), /<strong>Google publie l'OKF<\/strong>/);
});
test('URL → lien externe avec data-url + domaine', () => {
  assert.match(renderEditionHtml(ED), /<a class="ed-src" data-url="https:\/\/cloud\.google\.com\/blog\/x">cloud\.google\.com →<\/a>/);
});
test('échappe le HTML du corps', () => {
  assert.match(renderEditionHtml(ED), /Modèle &lt;ouvert&gt;\./);
});
test('retire le préfixe markdown # du titre', () => {
  assert.match(renderEditionHtml('# Brèves IA — édition\nintro'), /class="ed-title"[^>]*>Brèves IA/);
});
test('entrée vide ou non-string ne jette pas', () => {
  assert.equal(renderEditionHtml(''), '');
  assert.equal(renderEditionHtml(null), '');
  assert.equal(renderEditionHtml(undefined), '');
});
