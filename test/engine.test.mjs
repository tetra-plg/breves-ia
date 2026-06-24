import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, getDashboard, readEdition } from '../hud/engine.mjs';

test('dispatch passe les bons arguments à runSkill', async () => {
  let seen = null;
  const deps = { bbDir: '/tmp/bb', runSkill: async (a) => { seen = a; return { ok: true, value: { topics: [] } }; } };
  const onEvent = () => {};
  const r = await dispatch({ skill: 'breves-verify', inputs: { sujets: 'x' }, onEvent }, deps);
  assert.equal(r.ok, true);
  assert.equal(seen.skill, 'breves-verify');
  assert.equal(seen.bbDir, '/tmp/bb');
  assert.equal(seen.onEvent, onEvent);
});
test('getDashboard agrège soul + editions', () => {
  const deps = {
    bbDir: '/tmp/bb',
    readSoul: () => ({ version: 'v8', rules: ['r'], examples: [], lessons: [] }),
    listEditions: () => [{ date: '2026-06-17', range: '2026-06-17', count: 3, corr: 0, file: 'f' }],
  };
  const d = getDashboard(deps);
  assert.equal(d.soul.version, 'v8');
  assert.equal(d.editions.length, 1);
});
test('getDashboard tolère une SOUL absente', () => {
  const deps = {
    bbDir: '/tmp/bb',
    readSoul: () => { throw new Error('ENOENT'); },
    listEditions: () => [],
  };
  const d = getDashboard(deps);
  assert.equal(d.soul, null);
  assert.deepEqual(d.editions, []);
});
test('readEdition lit le fichier validé', () => {
  let asked = null;
  const deps = { bbDir: '/tmp/bb', readFile: (p) => { asked = p; return '# contenu'; } };
  assert.equal(readEdition(deps, '2026-06-17-breves-ia-merim.md'), '# contenu');
  assert.match(asked, /\/tmp\/bb\/raw\/notes\/2026-06-17-breves-ia-merim\.md$/);
});
test('readEdition rejette un nom hors motif (anti-traversal)', () => {
  const deps = { bbDir: '/tmp/bb', readFile: () => 'x' };
  assert.equal(readEdition(deps, '../../etc/passwd'), null);
  assert.equal(readEdition(deps, 'autre.md'), null);
});
test('readEdition renvoie null si lecture échoue', () => {
  const deps = { bbDir: '/tmp/bb', readFile: () => { throw new Error('ENOENT'); } };
  assert.equal(readEdition(deps, '2026-06-17-breves-ia-merim.md'), null);
});
