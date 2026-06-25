// test/editions.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listEditions } from '../lib/editions.mjs';

test('liste triée + count des blocs date', () => {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  const notes = join(bb, 'raw', 'notes');
  mkdirSync(notes, { recursive: true });
  copyFileSync(new URL('./fixtures/note.sample.md', import.meta.url), join(notes, '2026-06-17-breves-ia-merim.md'));
  copyFileSync(new URL('./fixtures/note.sample.md', import.meta.url), join(notes, '2026-06-06-breves-ia-merim.md'));
  const eds = listEditions(bb);
  assert.equal(eds.length, 2);
  assert.equal(eds[0].date, '2026-06-17'); // plus récent d'abord
  assert.equal(eds[0].count, 2);
});
test('plusieurs éditions le même jour (noms suffixés) sont toutes listées + titre', () => {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  const notes = join(bb, 'raw', 'notes');
  mkdirSync(notes, { recursive: true });
  copyFileSync(new URL('./fixtures/note.sample.md', import.meta.url), join(notes, '2026-06-25-breves-ia-merim.md'));
  copyFileSync(new URL('./fixtures/note.sample.md', import.meta.url), join(notes, '2026-06-25-breves-ia-merim-ai-act-omnibus.md'));
  const eds = listEditions(bb);
  assert.equal(eds.length, 2);
  assert.ok(eds.every((e) => e.date === '2026-06-25'));
  const titres = eds.map((e) => e.title).sort();
  assert.deepEqual(titres, ['', 'Ai act omnibus']);
});
test('répertoire absent => []', () => {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  assert.deepEqual(listEditions(bb), []);
});
