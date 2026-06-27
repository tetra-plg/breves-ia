// tests/renderer/ui/Pill.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Pill } from '@renderer/components/ui/Pill';

test('Pill rend son contenu', () => {
  assert.ok(renderToStaticMarkup(h(Pill, null, 'GPT-5')).includes('GPT-5'));
});
