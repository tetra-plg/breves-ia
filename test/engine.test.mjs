import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatch, getDashboard, readEdition, readSoulRaw, saveSoul, archiveAndIngest } from '../hud/engine.mjs';

test('dispatch passe les bons arguments à runSkill', async () => {
  let seen = null;
  const deps = { repoDir: '/tmp/bb', bbDir: '/tmp/bb', runSkill: async (a) => { seen = a; return { ok: true, value: { topics: [] } }; } };
  const onEvent = () => {};
  const r = await dispatch({ skill: 'breves-verify', inputs: { sujets: 'x' }, onEvent }, deps);
  assert.equal(r.ok, true);
  assert.equal(seen.skill, 'breves-verify');
  assert.equal(seen.bbDir, '/tmp/bb');
  assert.equal(seen.onEvent, onEvent);
});
test('getDashboard agrège soul + editions', () => {
  const deps = {
    repoDir: '/tmp/repo',
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
    repoDir: '/tmp/repo',
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
test('readSoulRaw lit le fichier SOUL au bon chemin', () => {
  let asked = null;
  const deps = { repoDir: '/tmp/repo', readFile: (p) => { asked = p; return '# SOUL'; } };
  assert.equal(readSoulRaw(deps), '# SOUL');
  assert.match(asked, /\/tmp\/repo\/\.claude\/breves-ia\/SOUL\.md$/);
});
test('saveSoul écrit le contenu au bon chemin', () => {
  let wrote = null;
  const deps = { repoDir: '/tmp/repo', writeFile: (p, t) => { wrote = { p, t }; } };
  assert.deepEqual(saveSoul(deps, '# nouveau'), { ok: true });
  assert.match(wrote.p, /\/tmp\/repo\/\.claude\/breves-ia\/SOUL\.md$/);
  assert.equal(wrote.t, '# nouveau');
});
test('saveSoul refuse un contenu vide (ne jamais effacer la SOUL)', () => {
  let called = false;
  const deps = { repoDir: '/tmp/repo', writeFile: () => { called = true; } };
  assert.equal(saveSoul(deps, '   ').ok, false);
  assert.equal(called, false);
});

test('dispatch utilise repoDir comme cwd + injecte le MCP wiki', async () => {
  let seen = null;
  const deps = { repoDir: '/repo', bbDir: '/bb', wikiMcp: { command: 'py', args: ['s'] },
    runSkill: async (a) => { seen = a; return { ok: true, value: { topics: [] } }; } };
  await dispatch({ skill: 'breves-verify', inputs: { sujets: 'x' }, onEvent: () => {} }, deps);
  assert.equal(seen.bbDir, '/repo');                       // cwd = repoDir
  assert.deepEqual(seen.mcpServers, { 'boiling-brain-wiki': { command: 'py', args: ['s'] } });
});

test('archiveAndIngest enchaîne archive (repoDir) puis /ingest (bbDir)', async () => {
  const calls = [];
  const deps = {
    repoDir: '/repo', bbDir: '/bb', wikiMcp: { command: 'py', args: ['s'] },
    runSkill: async (a) => { calls.push(['skill', a.skill, a.bbDir]); return { ok: true, value: { archiveSteps: [], newsletterText: 'x', soulVersion: 'v2' } }; },
    runRaw: async (a) => { calls.push(['raw', a.prompt, a.cwd]); return { ok: true, text: 'ingéré' }; },
  };
  const r = await archiveAndIngest({ teamsText: 't', topics: [], sources: [], onEvent: () => {} }, deps);
  assert.equal(r.ok, true);
  assert.equal(r.ingest.ok, true);
  assert.deepEqual(calls[0], ['skill', 'breves-archive', '/repo']);
  assert.deepEqual(calls[1], ['raw', '/ingest', '/bb']);
});

test('archiveAndIngest ne lance pas /ingest si l\'archive échoue', async () => {
  let ingestCalled = false;
  const deps = { repoDir: '/repo', bbDir: '/bb',
    runSkill: async () => ({ ok: false, error: 'boom' }),
    runRaw: async () => { ingestCalled = true; return { ok: true, text: '' }; } };
  const r = await archiveAndIngest({ teamsText: 't', topics: [], sources: [], onEvent: () => {} }, deps);
  assert.equal(r.ok, false);
  assert.equal(ingestCalled, false);
});
