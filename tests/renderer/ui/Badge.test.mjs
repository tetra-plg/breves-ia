import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Badge } from '@renderer/components/ui/Badge';

test('Badge expose data-tone et son contenu', () => {
  const html = renderToStaticMarkup(h(Badge, { tone: 'warn' }, 'Corrigé'));
  assert.ok(html.includes('data-tone="warn"'));
  assert.ok(html.includes('Corrigé'));
});
