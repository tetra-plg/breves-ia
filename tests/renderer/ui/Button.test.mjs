import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Button } from '@renderer/components/ui/Button';

test('Button primary rend un bouton avec data-variant', () => {
  const html = renderToStaticMarkup(h(Button, { variant: 'primary' }, 'Lancer'));
  assert.ok(html.includes('<button'));
  assert.ok(html.includes('data-variant="primary"'));
  assert.ok(html.includes('Lancer'));
});
test('Button loading est disabled', () => {
  const html = renderToStaticMarkup(h(Button, { variant: 'primary', loading: true }, 'X'));
  assert.ok(html.includes('disabled'));
});
