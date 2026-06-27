import { test } from 'vitest';
import assert from 'node:assert/strict';
import { splitFrontmatter } from '@domain/frontmatter';

test('splitFrontmatter: extrait fm + body', () => {
  const { fm, body } = splitFrontmatter('---\ndescription: hello\n---\n\nLe corps.');
  assert.equal(fm.description, 'hello');
  assert.equal(body, 'Le corps.');
});

test('splitFrontmatter: sans frontmatter → fm vide, body = tout (trim)', () => {
  const { fm, body } = splitFrontmatter('Juste du texte.');
  assert.deepEqual(fm, {});
  assert.equal(body, 'Juste du texte.');
});
