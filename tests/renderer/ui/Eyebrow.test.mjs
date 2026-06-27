// tests/renderer/ui/Eyebrow.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';

test('Eyebrow rend son texte', () => {
  const html = renderToStaticMarkup(h(Eyebrow, null, 'VÉRIFICATION'));
  assert.ok(html.includes('VÉRIFICATION'));
});
