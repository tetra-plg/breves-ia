import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, getDashboard } from '../hud/engine.mjs';

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
