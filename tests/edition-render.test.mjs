import { test } from 'vitest';
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
test('« Source : <url> » devient un lien (note 17 juin)', () => {
  const h = renderEditionHtml('— x —\nSource : https://www.anthropic.com/news/x');
  assert.match(h, /<a class="ed-src" data-url="https:\/\/www\.anthropic\.com\/news\/x">anthropic\.com →<\/a>/);
});
test('titre ## et séparateur ---', () => {
  const h = renderEditionHtml('# T\ncorps\n\n---\n\n## Sources\nx');
  assert.match(h, /<hr class="ed-hr">/);
  assert.match(h, /<div class="ed-h2">Sources<\/div>/);
});
test('tableau de sources → liste stylée (sujet + lien + note)', () => {
  const md = `## Sources

| Sujet | URL citée | Clipping |
|---|---|---|
| Ferveret | https://news.mit.edu/2026/x | = citée (MIT) |
| Fugu | https://sakana.ai/fugu/ | repli → MarkTechPost |`;
  const h = renderEditionHtml(md);
  assert.match(h, /class="ed-srclist"/);
  assert.equal((h.match(/class="ed-srcrow"/g) || []).length, 2);
  assert.match(h, /<a class="ed-src" data-url="https:\/\/news\.mit\.edu\/2026\/x">news\.mit\.edu →<\/a>/);
  assert.match(h, /class="ed-srcsubj">Ferveret</);
  assert.match(h, /class="ed-srcnote">= citée \(MIT\)</);
  assert.doesNotMatch(h, /\| Sujet \|/);   // plus de markdown brut
});
test('chaque date devient un ed-date', () => {
  const h = renderEditionHtml(ED);
  assert.equal((h.match(/class="ed-date"/g) || []).length, 2);
  assert.match(h, /class="ed-date"[^>]*>12 juin</);
});
test('plusieurs brèves sous une même date → séparateur entre elles', () => {
  const md = `📰 Brèves IA

— 24 juin —
**Brève une.** corps un.
https://a.com/x

**Brève deux.** corps deux.
https://b.com/y`;
  const h = renderEditionHtml(md);
  assert.equal((h.match(/class="card ed-breve"/g) || []).length, 1);   // une seule carte (même date)
  assert.equal((h.match(/class="ed-bsep"/g) || []).length, 1);          // un séparateur entre les 2 brèves
});
test('chaque brève est une carte (date + corps + source à l’intérieur)', () => {
  const h = renderEditionHtml(ED);
  assert.equal((h.match(/class="card ed-breve"/g) || []).length, 2);
  // la carte contient la date puis le corps puis le lien, et se referme
  assert.match(h, /<div class="card ed-breve"><div class="ed-date">12 juin<\/div>.*?<strong>Google publie l'OKF<\/strong>.*?ed-src.*?<\/div>/s);
});
test('accroche en gras', () => {
  assert.match(renderEditionHtml(ED), /<strong>Google publie l'OKF<\/strong>/);
});
test('texte commençant par une date : 1re brève = corps, pas un titre (cas draft)', () => {
  // Le teamsText du draft démarre directement par « — date — » (aucun titre d'édition).
  const h = renderEditionHtml('— 17 juin 2026 —\n**Accroche.** Corps normal.\nhttps://x.com/a');
  assert.doesNotMatch(h, /class="ed-title"/);                 // pas de titre parasite (sinon tout en gros/gras)
  assert.match(h, /<p class="ed-body"><strong>Accroche\.<\/strong> Corps normal\.<\/p>/);
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
