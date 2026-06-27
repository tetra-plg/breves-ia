import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseCommand, serializeCommand } from '@domain/commands';

test('parseCommand extrait description + body', () => {
  const c = parseCommand('---\ndescription: Phase 1\n---\n\n# /breves-verify\n\nContenu.');
  assert.equal(c.description, 'Phase 1');
  assert.equal(c.body, '# /breves-verify\n\nContenu.');
});

test('serializeCommand round-trip', () => {
  const raw = serializeCommand({ description: 'Phase 1', body: 'Contenu.' });
  const c = parseCommand(raw);
  assert.equal(c.description, 'Phase 1');
  assert.equal(c.body, 'Contenu.');
});

test('serializeCommand: description vide → frontmatter valide', () => {
  const raw = serializeCommand({ description: '', body: 'X' });
  assert.match(raw, /^---\ndescription: \n---\n/);
});
