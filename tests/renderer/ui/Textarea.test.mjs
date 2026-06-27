import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Textarea } from '@renderer/components/ui/Textarea';

test('Textarea rend un textarea avec la valeur', () => {
  const html = renderToStaticMarkup(h(Textarea, { value: 'salut', readOnly: true }));
  assert.ok(html.includes('<textarea'));
  assert.ok(html.includes('salut'));
});
