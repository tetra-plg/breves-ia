import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../../src/renderer/styles/tokens.css', import.meta.url)), 'utf8');

test('échelle d\'espacement présente', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    assert.match(css, new RegExp(`--space-${n}\\s*:`), `--space-${n} manquant`);
  }
});

test('tokens sémantiques conservés (non-régression)', () => {
  for (const v of ['--accent', '--good', '--warn', '--nuance', '--text', '--muted', '--faint', '--radius', '--shadow']) {
    assert.match(css, new RegExp(`${v}\\s*:`), `${v} manquant`);
  }
});
