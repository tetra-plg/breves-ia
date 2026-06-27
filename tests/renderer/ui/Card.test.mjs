// tests/renderer/ui/Card.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Card } from '@renderer/components/ui/Card';

test('Card rend ses enfants', () => {
  assert.ok(renderToStaticMarkup(h(Card, null, 'contenu')).includes('contenu'));
});
