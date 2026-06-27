import { test } from 'vitest';
import assert from 'node:assert/strict';
import { escapeHtml, escapeAttr, inlineMd, dateLong, soulVersionLabel } from '@domain/format';

test('escapeHtml', () => assert.equal(escapeHtml('a<b>&c'), 'a&lt;b&gt;&amp;c'));
test('escapeAttr échappe aussi les guillemets', () => {
  assert.equal(escapeAttr('a"b\'c<d>&'), 'a&quot;b&#39;c&lt;d&gt;&amp;');
  // une URL normale (sans guillemet) reste inchangée
  assert.equal(escapeAttr('https://exemple.fr/a-b'), 'https://exemple.fr/a-b');
});
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
