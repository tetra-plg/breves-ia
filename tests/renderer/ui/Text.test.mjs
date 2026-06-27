// tests/renderer/ui/Text.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Text } from '@renderer/components/ui/Text';

test('Text expose data-tone', () => {
  const html = renderToStaticMarkup(h(Text, { tone: 'faint' }, 'discret'));
  assert.ok(html.includes('data-tone="faint"'));
  assert.ok(html.includes('discret'));
});
