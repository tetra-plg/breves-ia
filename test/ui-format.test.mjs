import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, inlineMd, dateLong, soulVersionLabel } from '../lib/ui-format.mjs';

test('escapeHtml', () => assert.equal(escapeHtml('a<b>&c'), 'a&lt;b&gt;&amp;c'));
test('inlineMd gras et code', () => {
  assert.equal(inlineMd('**fort** et `x`'), '<strong>fort</strong> et <code>x</code>');
  assert.equal(inlineMd('<script>'), '&lt;script&gt;');
});
test('dateLong fr', () => {
  assert.equal(dateLong('2026-06-17'), '17 juin 2026');
  assert.equal(dateLong('pas une date'), 'pas une date');
});
test('soulVersionLabel', () => {
  assert.equal(soulVersionLabel('v8'), 'v8');
  assert.equal(soulVersionLabel(null), 'v1');
});
