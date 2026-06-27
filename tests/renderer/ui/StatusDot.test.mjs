import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { StatusDot } from '@renderer/components/ui/StatusDot';

test('StatusDot done rend le check et data-state', () => {
  const html = renderToStaticMarkup(h(StatusDot, { state: 'done' }));
  assert.ok(html.includes('data-state="done"'));
  assert.ok(html.includes('✓'));
});
test('StatusDot todo sans check', () => {
  assert.ok(!renderToStaticMarkup(h(StatusDot, { state: 'todo' })).includes('✓'));
});
