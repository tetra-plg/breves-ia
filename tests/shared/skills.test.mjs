import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ALLOWED_SKILLS, buildPrompt } from '@shared/skills';

test('ALLOWED_SKILLS contient les 3 skills', () => {
  assert.deepEqual([...ALLOWED_SKILLS], ['breves-verify', 'breves-draft', 'breves-archive']);
});
test('buildPrompt produit /skill + bloc INPUTS et lève hors allow-list', () => {
  const p = buildPrompt('breves-verify', { sujets: 'GLM 5.2' });
  assert.match(p, /^\/breves-verify/);
  assert.match(p, /INPUTS/);
  assert.match(p, /ne pose aucune question/);
  assert.throws(() => buildPrompt('rm-rf', {}));
});
test('buildPrompt sans inputs ne met pas de bloc INPUTS', () => {
  assert.equal(buildPrompt('breves-draft', {}), '/breves-draft');
});
