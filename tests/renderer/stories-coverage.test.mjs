import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = (p) => fileURLToPath(new URL(p, import.meta.url));

function componentsWithoutStory(absDir) {
  if (!existsSync(absDir)) return [];
  const files = readdirSync(absDir);
  return files
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''))
    .filter((base) => !files.includes(`${base}.stories.tsx`));
}

test('chaque composant components/ a une story', () => {
  const missing = componentsWithoutStory(dir('../../src/renderer/components'));
  assert.deepEqual(missing, [], `Stories manquantes: ${missing.join(', ')}`);
});

test('chaque primitive components/ui a une story', () => {
  const missing = componentsWithoutStory(dir('../../src/renderer/components/ui'));
  assert.deepEqual(missing, [], `Stories de primitives manquantes: ${missing.join(', ')}`);
});
