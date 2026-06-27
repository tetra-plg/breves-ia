// tests/renderer/ui/Modal.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Overlay, Modal } from '@renderer/components/ui/Modal';

test('Overlay+Modal rendent le contenu', () => {
  const html = renderToStaticMarkup(h(Overlay, null, h(Modal, null, 'corps')));
  assert.ok(html.includes('corps'));
});
