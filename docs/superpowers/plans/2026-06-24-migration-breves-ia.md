# Migration des artefacts Brèves IA dans le repo (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre `breves-ia` autonome : la SOUL et les prompts des sous-commandes (verify/draft/archive) vivent dans `breves-ia/.claude/`, le SDK tourne avec `cwd = repo breves-ia`, le MCP wiki est fourni programmatiquement, et `/ingest` reste dans le flux via un second appel en `cwd = BoilingBrain`.

**Architecture :** Le moteur dispatche verify/draft/archive avec `cwd = repoDir` (racine breves-ia) ; il fournit le serveur MCP `boiling-brain-wiki` dans les `options.mcpServers` du SDK (pas de `.mcp.json` à approuver). L'archive se fait en deux temps : `breves-archive` (cwd=repoDir) dépose note+clippings via `drop_to_raw` et met à jour la SOUL locale, puis l'app lance `/ingest` (cwd=BoilingBrain, via `runRaw`) pour l'ingestion native dans le wiki. Les éditions passées et `raw/` restent dans le wiki (lues via `BREVES_BB_DIR`). `ia-expert`, `/ingest`, le serveur MCP et `/breves-ia` interactif restent dans BoilingBrain.

**Tech Stack :** Node ≥ 20, ESM, `@anthropic-ai/claude-agent-sdk`, `node --test`. Commandes Claude Code markdown.

## Global Constraints

- **Source unique du produit dans breves-ia** : SOUL + prompts verify/draft/archive + snippets vivent dans `breves-ia/.claude/`.
- **MCP programmatique** : le serveur `boiling-brain-wiki` est passé dans `options.mcpServers` du SDK — `command` = `/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python`, `args` = `['/Users/pleguern/Workspace/BoilingBrain/scripts/mcp/mcp-wiki.py']`. Surchargeable par env.
- **cwd** : verify/draft/archive en `cwd = repoDir` (racine breves-ia) ; `/ingest` en `cwd = bbDir` (BoilingBrain).
- **`/ingest` reste dans le flux** : appelé après une archive réussie, en `cwd = bbDir`.
- **`raw/` immutable**, écriture uniquement via `drop_to_raw` (MCP) ; la SOUL n'est jamais dans `raw/`.
- **Éditions passées** : lues dans `<bbDir>/raw/notes/*-breves-ia-merim.md` (contenu wiki, inchangé).
- **SOUL** : `<repoDir>/.claude/breves-ia/SOUL.md` (locale, éditable depuis l'app).
- **Reste dans BoilingBrain** : `/breves-ia` interactif + ses snippets, `/ingest`, `ia-expert`, le serveur MCP, `raw/`.
- `BREVES_BB_DIR` défaut `/Users/pleguern/Workspace/BoilingBrain` ; `BREVES_REPO_DIR` défaut = racine du repo breves-ia (calculée).

---

## Structure de fichiers

```
breves-ia/
  .claude/                         NOUVEAU
    commands/
      breves-verify.md             (migré depuis BoilingBrain)
      breves-draft.md              (migré)
      breves-archive.md            (migré — SANS l'étape /ingest)
    breves-ia/
      SOUL.md                      (migré ; désormais la source)
      _brief-enqueteur.md          (migré)
      _archive.md                  (migré — SANS /ingest)
  lib/
    config.mjs                     + repoDir + wikiMcp (overridables)
    runner.mjs                     + option mcpServers ; + runRaw() (pour /ingest, sans validation JSON)
    soul.mjs                       readSoul(baseDir) lit <baseDir>/.claude/breves-ia/SOUL.md
  hud/
    engine.mjs                     cwd=repoDir pour verify/draft/archive ; mcpServers wiki ;
                                   SOUL via repoDir ; archiveAndIngest() (archive puis /ingest cwd=bbDir) ;
                                   getSoulRaw/saveSoul via repoDir
    main.mjs / preload.cjs         + IPC get-soul-raw / save-soul
    companion.html / renderer.mjs  vue SOUL = éditeur brut + Enregistrer

BoilingBrain/.claude/              (on RETIRE seulement les 3 sous-commandes app)
    commands/  - breves-verify.md  ❌ supprimé
               - breves-draft.md   ❌ supprimé
               - breves-archive.md ❌ supprimé
               - breves-ia.md      ✅ reste (interactif, terminal)
    breves-ia/ _brief-enqueteur.md, _archive.md  ✅ restent (utilisés par /breves-ia)
    commands/ingest.md, agents/ia-expert, scripts/mcp/  ✅ restent
```

---

## Task 1 : Config — repoDir + wikiMcp

**Files:**
- Modify: `lib/config.mjs`
- Test: `test/config.test.mjs`

**Interfaces:**
- Produces : `loadEngineConfig(env) -> { bbDir, repoDir, wikiMcp }`.
  - `repoDir` = `env.BREVES_REPO_DIR` ou la racine du repo breves-ia (calculée depuis `lib/config.mjs` : un niveau au-dessus de `lib/`).
  - `wikiMcp` = `{ command, args }` du serveur MCP, surcharge via `env.BREVES_WIKI_PY` (command) et dérivé `<bbDir>/scripts/mcp/mcp-wiki.py` (args), ou `env.BREVES_WIKI_SCRIPT`.

- [ ] **Step 1 : Étendre le test config**

```js
// test/config.test.mjs — AJOUTER aux tests existants
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngineConfig } from '../lib/config.mjs';

test('repoDir surchargé par BREVES_REPO_DIR', () => {
  assert.equal(loadEngineConfig({ BREVES_REPO_DIR: '/tmp/repo' }).repoDir, '/tmp/repo');
});
test('repoDir par défaut est un chemin absolu vers le repo', () => {
  const r = loadEngineConfig({}).repoDir;
  assert.ok(r.startsWith('/'));
  assert.ok(r.endsWith('breves-ia'));
});
test('wikiMcp pointe le script python du wiki', () => {
  const m = loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb' }).wikiMcp;
  assert.equal(m.command, '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python');
  assert.deepEqual(m.args, ['/tmp/bb/scripts/mcp/mcp-wiki.py']);
});
test('wikiMcp surchargeable', () => {
  const m = loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb', BREVES_WIKI_PY: '/py', BREVES_WIKI_SCRIPT: '/s.py' }).wikiMcp;
  assert.equal(m.command, '/py');
  assert.deepEqual(m.args, ['/s.py']);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/config.test.mjs` → FAIL.

- [ ] **Step 3 : Mettre à jour lib/config.mjs**

```js
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

export function loadEngineConfig(env = process.env) {
  const bbDir = env.BREVES_BB_DIR || '/Users/pleguern/Workspace/BoilingBrain';
  return {
    bbDir,
    repoDir: env.BREVES_REPO_DIR || REPO_ROOT,
    wikiMcp: {
      command: env.BREVES_WIKI_PY || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
      args: [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
    },
  };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/config.test.mjs` → PASS.

- [ ] **Step 5 : Commit** — `git add lib/config.mjs test/config.test.mjs && git commit -m "feat(config): repoDir + wikiMcp pour cwd local + MCP programmatique"`

---

## Task 2 : Runner — option mcpServers + runRaw (pour /ingest)

**Files:**
- Modify: `lib/runner.mjs`
- Test: `test/runner.test.mjs`

**Interfaces:**
- `runSkill({ skill, inputs, bbDir, onEvent, query, mcpServers })` — `bbDir` ici est le **cwd** passé au SDK (renommage sémantique : c'est le cwd, pas forcément le wiki). `mcpServers` (optionnel) est inséré dans `options`.
- `runRaw({ prompt, cwd, onEvent, query }) -> { ok, text }` — exécute un prompt libre (ex. `/ingest`) sans validation JSON : itère le flux, renvoie `{ ok: subtype==='success' && !is_error, text: result }`.

- [ ] **Step 1 : Ajouter les tests**

```js
// test/runner.test.mjs — AJOUTER
import { runSkill, runRaw } from '../lib/runner.mjs';
// (fakeQuery/result/asst déjà définis dans le fichier)

test('runSkill insère mcpServers dans les options', async () => {
  let opts = null;
  const fq = (arg) => { opts = arg.options; return (async function* () { yield { type: 'result', subtype: 'success', is_error: false, result: '```json\n{"topics":[]}\n```' }; })(); };
  await runSkill({ skill: 'breves-verify', inputs: { sujets: 'x' }, bbDir: '/cwd', mcpServers: { wiki: { command: 'py', args: ['s'] } }, onEvent: () => {}, query: fq });
  assert.equal(opts.cwd, '/cwd');
  assert.deepEqual(opts.mcpServers, { wiki: { command: 'py', args: ['s'] } });
});

test('runRaw renvoie ok sur succès SDK sans exiger de JSON', async () => {
  const fq = () => (async function* () { yield { type: 'result', subtype: 'success', is_error: false, result: 'ingéré 3 sources' }; })();
  const r = await runRaw({ prompt: '/ingest', cwd: '/bb', onEvent: () => {}, query: fq });
  assert.equal(r.ok, true);
  assert.equal(r.text, 'ingéré 3 sources');
});
test('runRaw remonte un échec SDK', async () => {
  const fq = () => (async function* () { yield { type: 'result', subtype: 'error', is_error: true, result: 'boom' }; })();
  const r = await runRaw({ prompt: '/ingest', cwd: '/bb', onEvent: () => {}, query: fq });
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** (runRaw absent / mcpServers non passé).

- [ ] **Step 3 : Modifier lib/runner.mjs** — dans `runSkill`, accepter `mcpServers` et l'insérer :

```js
export async function runSkill({ skill, inputs, bbDir, onEvent = () => {}, query = sdkQuery, mcpServers }) {
  // ... validation inchangée ...
  const options = { cwd: bbDir, permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true };
  if (mcpServers) options.mcpServers = mcpServers;
  try {
    for await (const m of query({ prompt, options })) { /* ... inchangé ... */ }
  } // ...
}

export async function runRaw({ prompt, cwd, onEvent = () => {}, query = sdkQuery, mcpServers }) {
  const options = { cwd, permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true };
  if (mcpServers) options.mcpServers = mcpServers;
  let text = '', ok = false;
  try {
    for await (const m of query({ prompt, options })) {
      if (m.type === 'assistant') { for (const ev of parseSentinels(textOf(m))) onEvent(ev); }
      else if (m.type === 'result') { text = m.result ?? ''; ok = m.subtype === 'success' && !m.is_error; }
    }
  } catch (e) { return { ok: false, text: e.message }; }
  return { ok, text };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — toute la suite verte.

- [ ] **Step 5 : Commit** — `git add lib/runner.mjs test/runner.test.mjs && git commit -m "feat(runner): option mcpServers + runRaw pour appels libres (/ingest)"`

---

## Task 3 : Migration des fichiers dans breves-ia/.claude

**Files:**
- Create: `breves-ia/.claude/commands/breves-verify.md`, `breves-draft.md`, `breves-archive.md`
- Create: `breves-ia/.claude/breves-ia/SOUL.md`, `_brief-enqueteur.md`, `_archive.md`

**Note :** prompts (pas de `node --test`). Vérification = forme JSON conforme aux contrats + smoke (Task 7).

- [ ] **Step 1 : Copier les fichiers depuis BoilingBrain (main)**

```bash
mkdir -p /Users/pleguern/Workspace/breves-ia/.claude/commands /Users/pleguern/Workspace/breves-ia/.claude/breves-ia
cd /Users/pleguern/Workspace/BoilingBrain
cp .claude/commands/breves-verify.md .claude/commands/breves-draft.md .claude/commands/breves-archive.md \
   /Users/pleguern/Workspace/breves-ia/.claude/commands/
cp .claude/breves-ia/SOUL.md .claude/breves-ia/_brief-enqueteur.md .claude/breves-ia/_archive.md \
   /Users/pleguern/Workspace/breves-ia/.claude/breves-ia/
```

- [ ] **Step 2 : Retirer `/ingest` du flux d'archive migré** — dans `breves-ia/.claude/breves-ia/_archive.md` et `breves-ia/.claude/commands/breves-archive.md`, supprimer la ligne/étape « invoque la skill `/ingest` » (et toute mention d'ingestion). L'ingestion est désormais déclenchée par l'app en second appel. Conserver tout le reste (drop_to_raw note+clippings, MAJ SOUL §5/§6, garde-fous, bloc JSON final `archiveSteps/newsletterText/soulVersion`). Mettre à jour l'entrée `archiveSteps` « Intégré au wiki » pour qu'elle reflète seulement le dépôt (l'ingest est rapporté séparément par l'app).

- [ ] **Step 3 : Vérifier la cohérence** — les blocs JSON finaux de verify/draft/archive correspondent toujours à `lib/contracts.mjs` (validateVerifyOutput/DraftOutput/ArchiveOutput). Les chemins relatifs internes (`.claude/breves-ia/SOUL.md`, `.claude/breves-ia/_brief-enqueteur.md`, `.claude/breves-ia/_archive.md`) sont corrects depuis `cwd = repoDir`.

- [ ] **Step 4 : Commit** — `cd /Users/pleguern/Workspace/breves-ia && git add .claude && git commit -m "feat(breves): migration des prompts + SOUL dans le repo (archive sans /ingest)"`

---

## Task 4 : Engine — cwd local, MCP, SOUL locale, archive+ingest

**Files:**
- Modify: `hud/engine.mjs`, `lib/soul.mjs`
- Test: `test/engine.test.mjs`, `test/soul.test.mjs`

**Interfaces:**
- `lib/soul.mjs` : `readSoul(baseDir)` lit `<baseDir>/.claude/breves-ia/SOUL.md` (au lieu de `bbDir`). (Le test existant passe désormais un baseDir contenant `.claude/breves-ia/SOUL.md` — déjà le cas dans le fixture.)
- `hud/engine.mjs` :
  - `defaultDeps(env)` ajoute `repoDir`, `wikiMcp` (depuis config), garde `bbDir`.
  - `dispatch({ skill, inputs, onEvent }, deps)` → `deps.runSkill({ skill, inputs, bbDir: deps.repoDir, mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined, onEvent })`. (Le `cwd` du SDK devient `repoDir`.)
  - `getDashboard(deps)` → `readSoul(deps.repoDir)` (SOUL locale) ; `listEditions(deps.bbDir)` (wiki).
  - `readSoulRaw(deps)` / `saveSoul(deps, text)` → chemin sous `deps.repoDir` (pas `bbDir`).
  - `archiveAndIngest({ teamsText, topics, sources, leconSOUL, onEvent }, deps)` → `dispatch({skill:'breves-archive', ...})` ; si `ok`, `deps.runRaw({ prompt:'/ingest', cwd: deps.bbDir, mcpServers:{...}, onEvent })` ; renvoie `{ ok, value, ingest: { ok, text } }`. En cas d'échec archive, ne lance pas l'ingest.

- [ ] **Step 1 : Tests** (engine + soul)

```js
// test/soul.test.mjs — le fixture place déjà SOUL.md sous <bb>/.claude/breves-ia/.
// Adapter : readSoul reçoit un baseDir (la racine contenant .claude/...). Renommer la variable
// locale sans changer la structure du fixture. Les assertions (v3, rules, examples, lessons) restent.
```

```js
// test/engine.test.mjs — AJOUTER
import { dispatch, archiveAndIngest } from '../hud/engine.mjs';

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

test('archiveAndIngest ne lance pas /ingest si l’archive échoue', async () => {
  let ingestCalled = false;
  const deps = { repoDir: '/repo', bbDir: '/bb',
    runSkill: async () => ({ ok: false, error: 'boom' }),
    runRaw: async () => { ingestCalled = true; return { ok: true, text: '' }; } };
  const r = await archiveAndIngest({ teamsText: 't', topics: [], sources: [], onEvent: () => {} }, deps);
  assert.equal(r.ok, false);
  assert.equal(ingestCalled, false);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec.**

- [ ] **Step 3 : Implémenter** `lib/soul.mjs` (readSoul lit `<baseDir>/.claude/breves-ia/SOUL.md` — déjà le cas, juste renommer le paramètre en `baseDir` pour clarté) et `hud/engine.mjs` (dispatch cwd=repoDir + mcpServers ; getDashboard/readSoulRaw/saveSoul via repoDir ; `archiveAndIngest` ; `defaultDeps` ajoute repoDir/wikiMcp + `runRaw`). Mettre à jour `SOUL_PARTS` pour utiliser `deps.repoDir`.

- [ ] **Step 4 : Lancer, vérifier le succès** — suite verte.

- [ ] **Step 5 : Commit** — `git add hud/engine.mjs lib/soul.mjs test/engine.test.mjs test/soul.test.mjs && git commit -m "feat(engine): cwd=repoDir + MCP wiki + SOUL locale + archiveAndIngest (2 temps)"`

---

## Task 5 : Câbler l'app — archive en 2 temps + édition SOUL brute

**Files:**
- Modify: `hud/main.mjs`, `hud/preload.cjs`, `hud/renderer.mjs`, `hud/companion.html`

**Interfaces (preload `window.breves`) :** ajoute `archive(inputs)` (→ IPC `archive-ingest`), `getSoulRaw()` (→ `get-soul-raw`), `saveSoul(text)` (→ `save-soul`).

- [ ] **Step 1 : IPC main** — ajouter :

```js
ipcMain.handle('archive-ingest', async (e, inputs) => {
  const onEvent = (ev) => { if (!e.sender.isDestroyed()) e.sender.send('command-event', ev); };
  try { return await archiveAndIngest({ ...inputs, onEvent }, deps); }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('get-soul-raw', () => readSoulRaw(deps));
ipcMain.handle('save-soul', (_e, text) => saveSoul(deps, text));
```
(importer `archiveAndIngest`, `readSoulRaw`, `saveSoul` depuis `./engine.mjs`).

- [ ] **Step 2 : preload** — exposer `archive`, `getSoulRaw`, `saveSoul`.

- [ ] **Step 3 : renderer `runArchive`** — appeler `window.breves.archive(inputs)` (au lieu de `sendCommand('breves-archive', …)`). Sur succès, `renderArchived(r.value)` ; si `r.ingest && !r.ingest.ok`, toast « déposé, mais ingestion à relancer côté wiki ».

- [ ] **Step 4 : vue SOUL = éditeur brut** — dans `companion.html`, remplacer les 3 cartes de la section `data-view="soul"` par : une ligne version + un `<textarea id="soul-raw" spellcheck="false">` (monospace, haut) + un bouton `#btn-soul-save` « Enregistrer ». Dans `renderer.mjs`, `renderSoul()` charge `await window.breves.getSoulRaw()` dans le textarea ; `#btn-soul-save` → `await window.breves.saveSoul($('#soul-raw').value)` + toast + recharge la version du dashboard. Retirer l'ancien rendu structuré (soul-rules/examples/lessons).

- [ ] **Step 5 : Vérifier** — `npm run hud` (préfixe `ELECTRON_RUN_AS_NODE=` hors environnement réel) : la vue SOUL montre le **vrai fichier** ; éditer + Enregistrer modifie `breves-ia/.claude/breves-ia/SOUL.md` (vérifier le fichier).

- [ ] **Step 6 : Commit** — `git add hud/ && git commit -m "feat(hud): archive en 2 temps (archive+ingest) + édition brute de la SOUL"`

---

## Task 6 : Retirer les sous-commandes app de BoilingBrain

**Files:**
- Delete (dans BoilingBrain) : `.claude/commands/breves-verify.md`, `breves-draft.md`, `breves-archive.md`

**Garder** : `.claude/commands/breves-ia.md` (interactif), `.claude/breves-ia/_brief-enqueteur.md` + `_archive.md` (utilisés par `/breves-ia`), `/ingest`, `ia-expert`, MCP.

- [ ] **Step 1 : Supprimer + commit (repo BoilingBrain)**

```bash
cd /Users/pleguern/Workspace/BoilingBrain
git rm .claude/commands/breves-verify.md .claude/commands/breves-draft.md .claude/commands/breves-archive.md
git commit -m "chore(breves): retire les sous-commandes app (migrées dans le repo breves-ia)"
```

- [ ] **Step 2 : Vérifier** que `/breves-ia` interactif reste cohérent (il référence `_brief-enqueteur.md` et `_archive.md`, toujours présents). Pas de push ici (laissé à l'utilisateur).

---

## Task 7 : Smoke bout-en-bout (cwd local + MCP)

- [ ] **Step 1 : Suite complète** — `npm test` → tout vert.

- [ ] **Step 2 : Smoke verify (cwd=breves-ia, sans MCP requis)**

```bash
node scripts/breves-cli.mjs verify "GLM 5.2 modèle chinois open source 753B"
```
Attendu : JSON `topics` valide. (Le CLI utilise `dispatch` ? Si le CLI passe encore `bbDir`, le mettre à jour pour utiliser `repoDir` + `wikiMcp` via `defaultDeps`.)

- [ ] **Step 3 : Smoke MCP (archive dépose dans le wiki)** — depuis l'app, enchaîner verify→draft→**Valider** sur un vrai sujet, et vérifier qu'un fichier apparaît dans `<bbDir>/raw/notes/` et `<bbDir>/raw/clippings/`, puis que `/ingest` s'est exécuté (sortie `r.ingest.ok`). **À faire en conscience** (écrit dans le wiki).

- [ ] **Step 4 : Commit éventuel** (ajustements CLI) puis **merge/push breves-ia**.

---

## Notes de fin

- **Risque MCP programmatique** : à valider au smoke (Task 7-3) que le SDK charge bien `options.mcpServers` et que `drop_to_raw` fonctionne en `cwd=repoDir`. Repli si besoin : `.mcp.json` dans breves-ia + `enabledMcpjsonServers`.
- **`/ingest` (Task 7-3)** : tourne en `cwd=bbDir` ; nécessite que BoilingBrain expose `/ingest` + `ia-expert` (déjà le cas sur main).
- **`/breves-ia` interactif** reste dans le wiki (workflow terminal de Pierre) ; doublon mineur des snippets entre repos, assumé (deux produits séparés).
- **CLI** : si `scripts/breves-cli.mjs` construit les inputs avec `bbDir`, le repointer sur `defaultDeps()` (repoDir + wikiMcp).
