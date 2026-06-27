import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Spinner } from '@renderer/components/ui/Spinner';

test('Spinner rend un élément aria-hidden', () => {
  assert.ok(renderToStaticMarkup(h(Spinner)).includes('aria-hidden'));
});
