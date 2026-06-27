import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Alert } from '@renderer/components/ui/Alert';

test('Alert expose data-tone et son contenu', () => {
  const html = renderToStaticMarkup(h(Alert, { tone: 'warn' }, 'Fait corrigé'));
  assert.ok(html.includes('data-tone="warn"'));
  assert.ok(html.includes('Fait corrigé'));
});
