// test/soul.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSoul } from '../lib/soul.mjs';

function bbWithSoul(content) {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  mkdirSync(join(bb, '.claude', 'breves-ia'), { recursive: true });
  if (content == null) copyFileSync(new URL('./fixtures/SOUL.sample.md', import.meta.url), join(bb, '.claude', 'breves-ia', 'SOUL.md'));
  else writeFileSync(join(bb, '.claude', 'breves-ia', 'SOUL.md'), content);
  return bb;
}

test('version = v3 quand 2 leçons datées', () => {
  const s = readSoul(bbWithSoul(null));
  assert.equal(s.version, 'v3');
  assert.equal(s.rules.length, 2);
  assert.equal(s.examples.length, 1);
  assert.equal(s.lessons.length, 2);
});
test('version = v1 quand journal vide', () => {
  const s = readSoul(bbWithSoul('## 6. Journal d\'évolution\n- (vide — première édition)\n'));
  assert.equal(s.version, 'v1');
});
