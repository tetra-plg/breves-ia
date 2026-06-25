import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dispatch, getDashboard, readEdition, getSoul, saveSoulSections, archiveAndIngest, loadAgents, getAgents, saveAgent } from '../hud/engine.mjs';

const SOUL_FIXTURE = readFileSync(new URL('./fixtures/SOUL.full.md', import.meta.url), 'utf8');

test('dispatch passe les bons arguments à runSkill', async () => {
  let seen = null;
  const deps = { repoDir: '/tmp/bb', bbDir: '/tmp/bb', readdir: () => [], runSkill: async (a) => { seen = a; return { ok: true, value: { topics: [] } }; } };
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
test('getSoul parse le fichier SOUL au bon chemin', () => {
  let asked = null;
  const deps = { repoDir: '/repo', readFile: (p) => { asked = p; return SOUL_FIXTURE; } };
  const s = getSoul(deps);
  assert.equal(s.quiParle, 'Je suis Pierre, VP Engineering.');
  assert.match(asked, /\/repo\/\.claude\/breves-ia\/SOUL\.md$/);
});
test('getSoul renvoie null si lecture échoue', () => {
  const deps = { repoDir: '/repo', readFile: () => { throw new Error('ENOENT'); } };
  assert.equal(getSoul(deps), null);
});
test('saveSoulSections écrit le markdown avec §1-4 modifiés', () => {
  let wrote = null;
  const deps = { repoDir: '/repo', readFile: () => SOUL_FIXTURE, writeFile: (p, t) => { wrote = { p, t }; } };
  const r = saveSoulSections(deps, { quiParle: 'A', audience: 'B', voix: '- C', lignesRouges: '- D' });
  assert.equal(r.ok, true);
  assert.match(wrote.p, /\/repo\/\.claude\/breves-ia\/SOUL\.md$/);
  assert.match(wrote.t, /## 1\. Qui parle\nA\n/);
  assert.ok(wrote.t.includes('## 5.'));                    // §5 toujours présente
});
test('saveSoulSections refuse un champ vide (n\'écrit pas)', () => {
  let called = false;
  const deps = { repoDir: '/repo', readFile: () => SOUL_FIXTURE, writeFile: () => { called = true; } };
  assert.equal(saveSoulSections(deps, { quiParle: '  ', audience: 'B', voix: 'C', lignesRouges: 'D' }).ok, false);
  assert.equal(called, false);
});

test('dispatch utilise repoDir comme cwd + injecte le MCP wiki', async () => {
  let seen = null;
  const deps = { repoDir: '/repo', bbDir: '/bb', wikiMcp: { command: 'py', args: ['s'] }, readdir: () => [],
    runSkill: async (a) => { seen = a; return { ok: true, value: { topics: [] } }; } };
  await dispatch({ skill: 'breves-verify', inputs: { sujets: 'x' }, onEvent: () => {} }, deps);
  assert.equal(seen.bbDir, '/repo');                       // cwd = repoDir
  assert.deepEqual(seen.mcpServers, { 'boiling-brain-wiki': { command: 'py', args: ['s'] } });
});

test('archiveAndIngest enchaîne archive (repoDir) puis /ingest (bbDir)', async () => {
  const calls = [];
  const deps = {
    repoDir: '/repo', bbDir: '/bb', wikiMcp: { command: 'py', args: ['s'] }, readdir: () => [],
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
  const deps = { repoDir: '/repo', bbDir: '/bb', readdir: () => [],
    runSkill: async () => ({ ok: false, error: 'boom' }),
    runRaw: async () => { ingestCalled = true; return { ok: true, text: '' }; } };
  const r = await archiveAndIngest({ teamsText: 't', topics: [], sources: [], onEvent: () => {} }, deps);
  assert.equal(r.ok, false);
  assert.equal(ingestCalled, false);
});

test('loadAgents lit les agents activés en définitions SDK', () => {
  const files = { 'enqueteur.md': '---\nname: enqueteur\ndescription: d\ntools: WebSearch\nmodel: sonnet\n---\nprompt enq',
                  'sceptique.md': '---\nname: sceptique\nbreves_enabled: false\nbreves_mode: ciblé\n---\nprompt scep' };
  const deps = { repoDir: '/repo', readdir: () => Object.keys(files), readFile: (p) => files[p.split('/').pop()] };
  const { defs, byName } = loadAgents(deps);
  assert.deepEqual(defs.enqueteur, { description: 'd', prompt: 'prompt enq', tools: ['WebSearch'], model: 'sonnet' });
  assert.equal(defs.sceptique, undefined);           // désactivé → non injecté
  assert.equal(byName.sceptique.mode, 'ciblé');
});

test('getAgents liste tous les agents triés par nom', () => {
  const files = { 'sceptique.md': '---\nname: sceptique\nbreves_mode: ciblé\n---\np scep',
                  'enqueteur.md': '---\nname: enqueteur\ntools: WebSearch\n---\np enq' };
  const deps = { repoDir: '/repo', readdir: () => Object.keys(files), readFile: (p) => files[p.split('/').pop()] };
  const list = getAgents(deps);
  assert.deepEqual(list.map((a) => a.name), ['enqueteur', 'sceptique']);   // trié
  assert.equal(list[0].tools[0], 'WebSearch');
});
test('saveAgent fusionne les edits et écrit', () => {
  let wrote = null;
  const existing = '---\nname: sceptique\ndescription: Réfute.\ntools: WebSearch\nmodel: sonnet\nbreves_enabled: true\nbreves_mode: ciblé\n---\nancien prompt';
  const deps = { repoDir: '/repo', readFile: () => existing, writeFile: (p, t) => { wrote = { p, t }; } };
  const r = saveAgent(deps, 'sceptique', { model: 'haiku', tools: ['WebSearch', 'WebFetch'], systemPrompt: 'nouveau prompt', enabled: false, mode: 'toujours' });
  assert.equal(r.ok, true);
  assert.match(wrote.p, /\/repo\/\.claude\/agents\/sceptique\.md$/);
  assert.match(wrote.t, /model: haiku/);
  assert.match(wrote.t, /breves_enabled: false/);
  assert.match(wrote.t, /breves_mode: toujours/);
  assert.match(wrote.t, /tools: WebSearch, WebFetch/);
  assert.match(wrote.t, /nouveau prompt/);
  assert.match(wrote.t, /description: Réfute\./);   // conservé (non édité)
});
test('saveAgent refuse un prompt vide (n\'écrit pas)', () => {
  let called = false;
  const deps = { repoDir: '/repo', readFile: () => '---\nname: x\n---\np', writeFile: () => { called = true; } };
  assert.equal(saveAgent(deps, 'x', { model: 'sonnet', tools: [], systemPrompt: '   ', enabled: true }).ok, false);
  assert.equal(called, false);
});

test('dispatch injecte les agents + le mode sceptique dans les inputs verify', async () => {
  let seen = null;
  const files = { 'sceptique.md': '---\nname: sceptique\nbreves_enabled: true\nbreves_mode: toujours\n---\np' };
  const deps = { repoDir:'/repo', bbDir:'/bb', readdir:()=>Object.keys(files), readFile:(p)=>files[p.split('/').pop()],
    runSkill: async (a)=>{ seen=a; return { ok:true, value:{ topics:[] } }; } };
  await dispatch({ skill:'breves-verify', inputs:{ sujets:'x' }, onEvent:()=>{} }, deps);
  assert.equal(seen.inputs.sceptique, 'toujours');
  assert.ok(seen.agents.sceptique);
});
