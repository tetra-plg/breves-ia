import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBreves } from '../lib/edition-breves.mjs';

const NOTE = `# Brèves IA — édition Merim (PM)
Un mot d'intro qui n'est pas une brève.

— 17 juin 2026 —
**Google publie l'OKF.** Un kit open source sous Apache 2.0 pour les agents.
https://cloud.google.com/blog/okf

**Sakana sort Fugu.** Un orchestrateur de LLM, présenté comme sobre.
https://sakana.ai/fugu/

— 18 juin 2026 —
**GLM 5.2 débarque.** Modèle ouvert, 1M de contexte annoncé.
https://z.ai/blog/glm-5-2

## Sources
| Sujet | URL | Clipping |
|---|---|---|
| GLM | https://z.ai/blog/glm-5-2 | = citée |`;

test('extrait une brève par accroche, avec date/source/accroche/texte', () => {
  const b = extractBreves(NOTE);
  assert.equal(b.length, 3);
  assert.equal(b[0].date, '17 juin 2026');
  assert.equal(b[0].source, 'cloud.google.com');
  assert.equal(b[0].accroche, "Google publie l'OKF.");
  assert.match(b[0].texte, /^\*\*Google publie l'OKF\.\*\* Un kit open source/);
  assert.match(b[0].texte, /https:\/\/cloud\.google\.com\/blog\/okf$/);
  assert.equal(b[2].date, '18 juin 2026');
  assert.equal(b[2].source, 'z.ai');
});
test('le titre, l\'intro et le bloc Sources ne sont pas des brèves', () => {
  const b = extractBreves(NOTE);
  assert.ok(b.every((x) => !/Sujet \| URL/.test(x.texte)));
  assert.ok(b.every((x) => !/édition Merim/.test(x.texte)));
});
test('entrée vide ou non-string → []', () => {
  assert.deepEqual(extractBreves(''), []);
  assert.deepEqual(extractBreves(null), []);
});
