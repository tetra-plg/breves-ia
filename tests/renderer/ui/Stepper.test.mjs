import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Stepper } from '@renderer/components/ui/Stepper';

test('Stepper rend les pastilles et la ligne', () => {
  const html = renderToStaticMarkup(h(Stepper, {
    steps: [{ n: 1, state: 'done' }, { n: 2, state: 'active' }, { n: 3, state: 'todo' }],
    line: 'Étape 2 / 3',
  }));
  assert.ok(html.includes('✓'));          // l'étape done affiche un check
  assert.ok(html.includes('Étape 2 / 3'));
});
