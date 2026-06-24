# Plan B — App Electron & port UI Brèves IA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire l'app de bureau Electron (fenêtre compagnon) qui pilote le moteur Brèves IA (Plan A) et rend le mockup `design.html` : dashboard → compose → checking → editor → archived + soul/history, avec les gates humains dans l'UI.

**Architecture :** Process principal Electron = exécuteur : il importe la `lib/` du moteur (runSkill, readSoul, listEditions) et expose des handlers IPC. Le renderer = UI vanilla (HTML + `renderer.mjs` sur IDs fixes, façon poker-suivi), parle au main via `window.breves` (preload contextIsolé). Aucun framework de rendu (re-render depuis l'état). La logique pure (machine d'états des vues, modèle des cartes « checking », dispatch moteur) vit dans des modules `lib/`/`hud/` testés ; le shell Electron et le port HTML/CSS sont vérifiés en lançant l'app.

**Tech Stack :** Electron, Node ≥ 20, ESM, vanilla JS/HTML/CSS, `node --test` pour la logique pure. Réutilise la `lib/` du Plan A (déjà sur `main`).

## Global Constraints

- **Fenêtre compagnon** : frameless, 400×760 (max 94vw/96vh), en-tête draggable (`-webkit-app-region:drag`), palette crème/argile, thèmes clair/sombre. Fidèle à `design.html`.
- **Pilotage = moteur Plan A** : l'UI n'appelle JAMAIS l'API/SDK directement ; elle passe par `runSkill` (déjà construit) via IPC. Les sous-commandes sont `breves-verify | breves-draft | breves-archive`.
- **Gates dans l'UI** : Valider/Corriger et « enrichir la SOUL » sont des éléments d'interface, pas des `AskUserQuestion`. **Corriger** = re-call `breves-draft` avec `feedback`.
- **Jalons réels, pas de fausse animation** : la vue Checking coche une étape uniquement sur un événement réel. Le smoke réel a montré que `breves-verify` peut n'émettre AUCUNE sentinelle → l'UI doit dégrader proprement (sur `topic-done` ou le résultat final, marquer le sujet terminé ; sans jalons intermédiaires, ne pas inventer de progression).
- **Aucune écriture directe dans `raw/`** : seul `breves-archive` (moteur) écrit, via MCP. L'UI ne touche pas au filesystem du wiki en écriture.
- **`teamsText` collable** : zéro tiret cadratin dans le corps (garanti par le moteur) ; l'UI le présente éditable et copiable.
- **Local, mono-utilisateur** : pas d'auth, pas de réseau hors SDK. `BREVES_BB_DIR` via `lib/config.mjs` (Plan A).

---

## Structure de fichiers

```
breves-ia/
  package.json            + devDep electron ; script "hud": "electron hud/main.mjs"
  hud/
    main.mjs              process principal : BrowserWindow frameless + handlers IPC (délègue à hud/engine.mjs)
    preload.cjs           contextBridge `breves` : sendCommand, onCommandEvent, getDashboard, copy, window controls
    companion.html        port statique de design.html (7 vues + overlays + stepper + toast), IDs fixes, light/dark
    renderer.mjs          UI vanilla : machine d'états + renderX() par vue + câblage IPC
    engine.mjs            dispatch moteur côté main (injectable) : dispatch(), getDashboard()
  lib/                    (Plan A, réutilisé) runner, soul, editions, config, load-env, contracts, ...
    ui-state.mjs          NOUVEAU — machine d'états pure des vues + stepper
    checking-model.mjs    NOUVEAU — réducteur pur events→cartes (jalons réels + dégradé)
    ui-format.mjs         NOUVEAU — helpers de formatage (date fr, escape, mini-markdown inline)
  test/
    ui-state.test.mjs
    checking-model.test.mjs
    ui-format.test.mjs
    engine.test.mjs
```

Les 4 modules testés (`ui-state`, `checking-model`, `ui-format`, `engine`) portent toute la logique. `main.mjs`/`preload.cjs`/`companion.html`/`renderer.mjs` sont du shell/DOM vérifié en lançant l'app.

---

## Task 1 : Modules de logique pure — `ui-state.mjs`

**Files:**
- Create: `lib/ui-state.mjs`
- Test: `test/ui-state.test.mjs`

**Interfaces:**
- Produces :
  - `VIEWS = ['dashboard','compose','checking','editor','archived','soul','history']`
  - `FLOW = ['compose','checking','editor','archived']` (vues sous stepper)
  - `nextView(current, action) -> view` pour les actions : `goDash, goCompose, goSoul, goHist, launch, toEditor, validate`. Transitions : `goCompose→compose`, `launch→checking`, `toEditor→editor`, `validate→archived`, `goDash→dashboard`, `goSoul→soul`, `goHist→history`. Action inconnue ⇒ `current` inchangé.
  - `stepper(view) -> { steps: {n,label,state}[], line }` où `state ∈ {done,active,todo}` selon l'index de `view` dans `FLOW` ; `line = '<i+1> / 4 · <label>'` ; hors FLOW ⇒ `steps:[]`, `line:''`. Labels : `['Sujets','Vérification','Rédaction','Archivé']`.
  - `viewTitle(view) -> string` : FLOW ⇒ `'Nouvelle édition'` ; `soul ⇒ 'SOUL — le style'` ; `history ⇒ 'Historique'` ; sinon `'Brèves IA'`.

- [ ] **Step 1 : Écrire les tests**

```js
// test/ui-state.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextView, stepper, viewTitle, FLOW } from '../lib/ui-state.mjs';

test('transitions du flux', () => {
  assert.equal(nextView('dashboard', 'goCompose'), 'compose');
  assert.equal(nextView('compose', 'launch'), 'checking');
  assert.equal(nextView('checking', 'toEditor'), 'editor');
  assert.equal(nextView('editor', 'validate'), 'archived');
  assert.equal(nextView('archived', 'goDash'), 'dashboard');
  assert.equal(nextView('dashboard', 'goSoul'), 'soul');
  assert.equal(nextView('dashboard', 'goHist'), 'history');
});
test('action inconnue garde la vue', () => {
  assert.equal(nextView('editor', 'bidon'), 'editor');
});
test('stepper marque done/active/todo', () => {
  const s = stepper('checking'); // index 1 dans FLOW
  assert.deepEqual(s.steps.map((x) => x.state), ['done', 'active', 'todo', 'todo']);
  assert.equal(s.line, '2 / 4 · Vérification');
});
test('stepper vide hors flux', () => {
  assert.deepEqual(stepper('dashboard'), { steps: [], line: '' });
});
test('viewTitle', () => {
  assert.equal(viewTitle('compose'), 'Nouvelle édition');
  assert.equal(viewTitle('soul'), 'SOUL — le style');
  assert.equal(viewTitle('history'), 'Historique');
  assert.equal(viewTitle('dashboard'), 'Brèves IA');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/ui-state.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/ui-state.mjs**

```js
export const VIEWS = ['dashboard', 'compose', 'checking', 'editor', 'archived', 'soul', 'history'];
export const FLOW = ['compose', 'checking', 'editor', 'archived'];
const LABELS = ['Sujets', 'Vérification', 'Rédaction', 'Archivé'];
const ACTIONS = {
  goDash: 'dashboard', goCompose: 'compose', goSoul: 'soul', goHist: 'history',
  launch: 'checking', toEditor: 'editor', validate: 'archived',
};

export function nextView(current, action) {
  return ACTIONS[action] || current;
}

export function stepper(view) {
  const i = FLOW.indexOf(view);
  if (i === -1) return { steps: [], line: '' };
  const steps = LABELS.map((label, k) => ({
    n: String(k + 1), label,
    state: k < i ? 'done' : (k === i ? 'active' : 'todo'),
  }));
  return { steps, line: `${i + 1} / 4 · ${LABELS[i]}` };
}

export function viewTitle(view) {
  if (FLOW.includes(view)) return 'Nouvelle édition';
  if (view === 'soul') return 'SOUL — le style';
  if (view === 'history') return 'Historique';
  return 'Brèves IA';
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/ui-state.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/ui-state.mjs test/ui-state.test.mjs
git commit -m "feat(hud): machine d'états des vues + stepper (pur)"
```

---

## Task 2 : Modèle des cartes « checking » — `checking-model.mjs`

**Files:**
- Create: `lib/checking-model.mjs`
- Test: `test/checking-model.test.mjs`

**Contexte :** la vue Checking affiche une carte par sujet, avec 5 étapes (`recherche, faits, date, source, article`). On coche une étape sur un événement réel (`topic-progress`). On NE fabrique PAS de progression. Réalité du smoke : `breves-verify` peut n'émettre aucune sentinelle ; il faut donc un état initial propre et une complétion fiable depuis `topic-done` ou le résultat final.

**Interfaces:**
- Produces :
  - `STEPS = ['recherche','faits','date','source','article']`
  - `initCard(key, title) -> Card` : `{ key, title, status:'en cours', done:false, steps:[{name,state:'todo'}×5], alerte:null, source:null }` avec la 1re étape `active` (la recherche démarre dès la détection).
  - `applyEvent(cards, event) -> cards'` (immuable) pour `topic-detected` (ajoute une carte si absente), `topic-progress` (passe l'étape nommée à `done`, la suivante à `active`), `topic-done` (toutes étapes `done`, `done:true`, `status:'Terminé'`), `topic-error` (`status:'Erreur'`, `done:true`, `error:<msg>`).
  - `applyResult(cards, verifyValue) -> cards'` : fusionne le résultat final (`topics[]`) — pour chaque topic, complète la carte (toutes étapes `done`, `done:true`), renseigne `source`, et `alerte` depuis `topic.alerte` (`{niveau,texte}`). Crée la carte si elle n'existait pas (cas zéro sentinelle). C'est le filet « jalons réels » : sans events, le résultat final termine les cartes.
  - `summary(cards) -> { verifies, corriges, nuances }` : compte `done && !error`, et par `alerte.niveau`.

- [ ] **Step 1 : Écrire les tests**

```js
// test/checking-model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initCard, applyEvent, applyResult, summary, STEPS } from '../lib/checking-model.mjs';

const states = (card) => card.steps.map((s) => s.state);

test('initCard démarre recherche en active', () => {
  const c = initCard('glm', 'GLM-5.2');
  assert.equal(c.steps.length, 5);
  assert.deepEqual(states(c), ['active', 'todo', 'todo', 'todo', 'todo']);
  assert.equal(c.done, false);
});
test('topic-detected ajoute une carte', () => {
  const cards = applyEvent([], { type: 'topic-detected', key: 'glm', sujet: 'GLM-5.2' });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].key, 'glm');
});
test('topic-progress coche l’étape et active la suivante', () => {
  let cards = applyEvent([], { type: 'topic-detected', key: 'glm', sujet: 'GLM' });
  cards = applyEvent(cards, { type: 'topic-progress', key: 'glm', step: 'source' });
  const c = cards[0];
  assert.equal(c.steps[STEPS.indexOf('source')].state, 'done');
  assert.equal(c.steps[STEPS.indexOf('article')].state, 'active');
});
test('topic-done termine la carte', () => {
  let cards = applyEvent([], { type: 'topic-detected', key: 'glm', sujet: 'GLM' });
  cards = applyEvent(cards, { type: 'topic-done', key: 'glm' });
  assert.equal(cards[0].done, true);
  assert.ok(cards[0].steps.every((s) => s.state === 'done'));
});
test('topic-error marque l’erreur', () => {
  let cards = applyEvent([], { type: 'topic-detected', key: 'mj', sujet: 'MJ' });
  cards = applyEvent(cards, { type: 'topic-error', key: 'mj', error: 'inaccessible' });
  assert.equal(cards[0].done, true);
  assert.equal(cards[0].error, 'inaccessible');
});
test('applyResult termine les cartes même SANS aucun event (filet zéro-sentinelle)', () => {
  const value = { topics: [
    { key: 'glm', sujet: 'GLM', source: 'Z.ai', alerte: { niveau: 'nuance', texte: 'API en Chine' } },
  ] };
  const cards = applyResult([], value);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].done, true);
  assert.equal(cards[0].source, 'Z.ai');
  assert.deepEqual(cards[0].alerte, { niveau: 'nuance', texte: 'API en Chine' });
  assert.ok(cards[0].steps.every((s) => s.state === 'done'));
});
test('summary compte vérifiés/corrigés/nuancés', () => {
  const value = { topics: [
    { key: 'a', sujet: 'A', source: 's', alerte: { niveau: 'corrigé', texte: 'x' } },
    { key: 'b', sujet: 'B', source: 's', alerte: { niveau: 'nuance', texte: 'y' } },
    { key: 'c', sujet: 'C', source: 's' },
  ] };
  const cards = applyResult([], value);
  assert.deepEqual(summary(cards), { verifies: 3, corriges: 1, nuances: 1 });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/checking-model.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/checking-model.mjs**

```js
export const STEPS = ['recherche', 'faits', 'date', 'source', 'article'];

export function initCard(key, title) {
  return {
    key, title, status: 'en cours', done: false, error: null, source: null, alerte: null,
    steps: STEPS.map((name, i) => ({ name, state: i === 0 ? 'active' : 'todo' })),
  };
}

function mapCard(cards, key, fn) {
  return cards.map((c) => (c.key === key ? fn({ ...c, steps: c.steps.map((s) => ({ ...s })) }) : c));
}

function allDone(card) {
  card.steps.forEach((s) => { s.state = 'done'; });
  card.done = true;
  return card;
}

export function applyEvent(cards, ev) {
  if (ev.type === 'topic-detected') {
    if (cards.some((c) => c.key === ev.key)) return cards;
    return [...cards, initCard(ev.key, ev.sujet)];
  }
  if (ev.type === 'topic-progress') {
    return mapCard(cards, ev.key, (c) => {
      const i = STEPS.indexOf(ev.step);
      if (i >= 0) {
        c.steps[i].state = 'done';
        if (i + 1 < c.steps.length && c.steps[i + 1].state === 'todo') c.steps[i + 1].state = 'active';
      }
      return c;
    });
  }
  if (ev.type === 'topic-done') {
    return mapCard(cards, ev.key, (c) => { allDone(c); c.status = 'Terminé'; return c; });
  }
  if (ev.type === 'topic-error') {
    return mapCard(cards, ev.key, (c) => { c.done = true; c.status = 'Erreur'; c.error = ev.error; return c; });
  }
  return cards;
}

export function applyResult(cards, value) {
  let out = cards;
  for (const t of (value?.topics || [])) {
    if (!out.some((c) => c.key === t.key)) out = [...out, initCard(t.key, t.sujet || t.key)];
    out = mapCard(out, t.key, (c) => {
      if (!c.error) allDone(c);
      c.status = c.error ? c.status : 'Terminé';
      c.source = t.source ?? c.source;
      c.alerte = t.alerte ?? c.alerte;
      return c;
    });
  }
  return out;
}

export function summary(cards) {
  let verifies = 0, corriges = 0, nuances = 0;
  for (const c of cards) {
    if (c.done && !c.error) verifies++;
    if (c.alerte?.niveau === 'corrigé') corriges++;
    if (c.alerte?.niveau === 'nuance') nuances++;
  }
  return { verifies, corriges, nuances };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/checking-model.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/checking-model.mjs test/checking-model.test.mjs
git commit -m "feat(hud): modèle des cartes checking (jalons réels + filet zéro-sentinelle)"
```

---

## Task 3 : Helpers de formatage — `ui-format.mjs`

**Files:**
- Create: `lib/ui-format.mjs`
- Test: `test/ui-format.test.mjs`

**Interfaces:**
- Produces :
  - `escapeHtml(s) -> string` (échappe `& < >`).
  - `inlineMd(s) -> string` : escape puis `**gras**`→`<strong>`, `` `code` ``→`<code>`. (Repris de poker-suivi.)
  - `dateLong(iso) -> string` : `'2026-06-17' → '17 juin 2026'` (fr-FR, `Intl.DateTimeFormat` UTC). Entrée non-ISO ⇒ renvoyée telle quelle.
  - `soulVersionLabel(version) -> string` : passe-plat (`'v8' → 'v8'`), `null/undefined ⇒ 'v1'`.

- [ ] **Step 1 : Écrire les tests**

```js
// test/ui-format.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, inlineMd, dateLong, soulVersionLabel } from '../lib/ui-format.mjs';

test('escapeHtml', () => assert.equal(escapeHtml('a<b>&c'), 'a&lt;b&gt;&amp;c'));
test('inlineMd gras et code', () => {
  assert.equal(inlineMd('**fort** et `x`'), '<strong>fort</strong> et <code>x</code>');
  assert.equal(inlineMd('<script>'), '&lt;script&gt;');
});
test('dateLong fr', () => {
  assert.equal(dateLong('2026-06-17'), '17 juin 2026');
  assert.equal(dateLong('pas une date'), 'pas une date');
});
test('soulVersionLabel', () => {
  assert.equal(soulVersionLabel('v8'), 'v8');
  assert.equal(soulVersionLabel(null), 'v1');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/ui-format.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/ui-format.mjs**

```js
export function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
export function inlineMd(s) {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
}
const FR = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
export function dateLong(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso;
  return FR.format(new Date(`${iso}T00:00:00Z`));
}
export function soulVersionLabel(version) {
  return version || 'v1';
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/ui-format.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/ui-format.mjs test/ui-format.test.mjs
git commit -m "feat(hud): helpers de formatage UI (pur)"
```

---

## Task 4 : Dispatch moteur côté main — `hud/engine.mjs`

**Files:**
- Create: `hud/engine.mjs`
- Test: `test/engine.test.mjs`

**Contexte :** isole l'appel au moteur pour le rendre testable sans Electron ni réseau. `main.mjs` (Task 5) câblera ces fonctions sur IPC.

**Interfaces:**
- Consumes : `runSkill` (lib/runner), `readSoul` (lib/soul), `listEditions` (lib/editions), `loadEngineConfig` (lib/config) — tous injectables via `deps`.
- Produces :
  - `dispatch({ skill, inputs, onEvent }, deps) -> Promise<{ok,value}|{ok:false,error}>` : appelle `deps.runSkill({skill, inputs, bbDir: deps.bbDir, onEvent})`. (Passe-plat minci + point d'injection.)
  - `getDashboard(deps) -> { soul:{version,rules,examples,lessons}, editions:[...] }` : agrège `readSoul(bbDir)` + `listEditions(bbDir)` ; si `readSoul` jette (SOUL absente), renvoie `soul:null` sans planter.

- [ ] **Step 1 : Écrire les tests**

```js
// test/engine.test.mjs
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
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/engine.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer hud/engine.mjs**

```js
import { runSkill as realRunSkill } from '../lib/runner.mjs';
import { readSoul as realReadSoul } from '../lib/soul.mjs';
import { listEditions as realListEditions } from '../lib/editions.mjs';
import { loadEngineConfig } from '../lib/config.mjs';

export function defaultDeps(env = process.env) {
  return {
    bbDir: loadEngineConfig(env).bbDir,
    runSkill: realRunSkill,
    readSoul: realReadSoul,
    listEditions: realListEditions,
  };
}

export async function dispatch({ skill, inputs, onEvent }, deps) {
  return deps.runSkill({ skill, inputs, bbDir: deps.bbDir, onEvent });
}

export function getDashboard(deps) {
  let soul = null;
  try { soul = deps.readSoul(deps.bbDir); } catch { soul = null; }
  let editions = [];
  try { editions = deps.listEditions(deps.bbDir); } catch { editions = []; }
  return { soul, editions };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/engine.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5 : Commit**

```bash
git add hud/engine.mjs test/engine.test.mjs
git commit -m "feat(hud): dispatch moteur côté main (injectable, testé)"
```

---

## Task 5 : Shell Electron — main + preload + companion.html minimal

**Files:**
- Create: `hud/main.mjs`, `hud/preload.cjs`, `hud/companion.html` (placeholder)
- Modify: `package.json` (devDep electron + script `hud`)

**Interfaces:**
- Consumes : `hud/engine.mjs` (`defaultDeps`, `dispatch`, `getDashboard`).
- Produces (exposé au renderer via preload `window.breves`) :
  - `sendCommand(skill, inputs) -> Promise<{ok,value}|{ok:false,error}>` (IPC `invoke 'send-command'`)
  - `onCommandEvent(cb)` : abonnement aux events streamés (`webContents.send('command-event', e)`)
  - `getDashboard() -> Promise<{soul,editions}>` (IPC `invoke 'get-dashboard'`)
  - `copy(text)` (IPC `invoke 'copy'` → clipboard), `hideWindow()`, `setTheme(theme)` (no-op côté main, géré renderer)

**Note (vérification) :** Electron/DOM non couverts par `node --test`. Vérification = lancer `npm run hud` et observer la fenêtre.

- [ ] **Step 1 : Ajouter electron** : `npm install --save-dev electron@^33` et le script `"hud": "electron hud/main.mjs"` dans package.json.

- [ ] **Step 2 : Créer hud/preload.cjs**

```js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('breves', {
  sendCommand: (skill, inputs) => ipcRenderer.invoke('send-command', { skill, inputs }),
  onCommandEvent: (cb) => ipcRenderer.on('command-event', (_e, ev) => cb(ev)),
  getDashboard: () => ipcRenderer.invoke('get-dashboard'),
  copy: (text) => ipcRenderer.invoke('copy', text),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
});
```

- [ ] **Step 3 : Créer hud/main.mjs**

```js
import { app, BrowserWindow, Menu, ipcMain, clipboard } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultDeps, dispatch, getDashboard } from './engine.mjs';
import { loadEnvFile } from '../lib/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let win = null;

function makeWindow() {
  win = new BrowserWindow({
    width: 400, height: 760, show: false, title: 'Brèves IA', backgroundColor: '#e7e1d4',
    frame: false, // en-tête custom draggable (cf. companion.html)
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, 'companion.html'));
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  loadEnvFile();
  const deps = defaultDeps();

  ipcMain.handle('send-command', async (e, { skill, inputs }) => {
    const onEvent = (ev) => { if (!e.sender.isDestroyed()) e.sender.send('command-event', ev); };
    try { return await dispatch({ skill, inputs, onEvent }, deps); }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('get-dashboard', () => getDashboard(deps));
  ipcMain.handle('copy', (_e, text) => { clipboard.writeText(String(text)); return true; });
  ipcMain.handle('hide-window', () => { if (win) win.hide(); });

  makeWindow();
});
app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 4 : Créer hud/companion.html (placeholder minimal)** — juste de quoi vérifier que la fenêtre s'ouvre et que l'IPC répond :

```html
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>html,body{margin:0;height:100%;background:#e7e1d4;font-family:system-ui;color:#2e2a22}
.bar{height:46px;-webkit-app-region:drag;display:flex;align-items:center;padding:0 14px;font-weight:600}
.c{padding:16px}</style></head>
<body>
  <div class="bar">Brèves IA</div>
  <div class="c"><button id="probe">Tester le dashboard</button><pre id="out"></pre></div>
  <script type="module" src="renderer.mjs"></script>
  <script>
    document.getElementById('probe').onclick = async () => {
      const d = await window.breves.getDashboard();
      document.getElementById('out').textContent = JSON.stringify(d, null, 2);
    };
  </script>
</body></html>
```

  (Créer aussi un `hud/renderer.mjs` vide à ce stade : `// placeholder` — remplacé en Task 7.)

- [ ] **Step 5 : Vérifier le shell**

Run: `npm run hud`
Expected: une fenêtre frameless 400×760 fond crème s'ouvre ; cliquer « Tester le dashboard » affiche le JSON `{soul,editions}` lu depuis BoilingBrain (SOUL v…, éditions). Fermer la fenêtre.

- [ ] **Step 6 : Lancer la suite (non-régression logique)**

Run: `npm test`
Expected: tous les tests passent (Plan A + Tasks 1-4).

- [ ] **Step 7 : Commit**

```bash
git add hud/main.mjs hud/preload.cjs hud/companion.html hud/renderer.mjs package.json package-lock.json
git commit -m "feat(hud): shell Electron (fenêtre frameless + IPC moteur)"
```

---

## Task 6 : Port statique de `design.html` → `companion.html`

**Files:**
- Modify: `hud/companion.html` (remplace le placeholder)

**Contexte :** `design.html` (à la racine du repo) est la source de vérité visuelle. C'est un mockup `<x-dc>` avec un runtime propriétaire (sc-if/sc-for, DCLogic) qui NE tourne PAS hors Claude Design. On porte sa **structure et son CSS** en HTML statique vanilla : un conteneur par vue (caché par défaut, affiché selon l'état), des IDs/`data-*` fixes que `renderer.mjs` (Task 7+) peuplera. AUCUNE logique JS ici (le `<script type="x-dc">` du mockup est abandonné).

**Note (vérification) :** rendu statique, vérifié à l'œil en lançant l'app. Pas de `node --test`.

- [ ] **Step 1 : Reprendre les design tokens** — copier dans un `<style>` les variables de `design.html` `tokens()` (direction C « Halo » par défaut, clair ET sombre via `body.dark`) : `--bg,--win,--panel,--panel2,--line,--text,--muted,--faint,--accent,--accentSoft,--onAccent,--good,--goodSoft,--warn,--warnSoft,--nuance,--nuanceSoft,--radius,--radiusSm`, fonts Hanken Grotesk / JetBrains Mono, keyframes `spin`/`pulse`. Valeurs exactes : voir `design.html` lignes 595-625 (clair = bloc `else`, sombre = bloc `dark`).

- [ ] **Step 2 : Structure de la fenêtre** — porter le chrome : en-tête draggable (titre `#view-title`, sous-titre, bouton retour `#btn-back`, bouton thème `#btn-theme`), le stepper compact `#stepper` (4 pastilles + `#step-line`), et le conteneur de contenu `#content`. Reprendre les styles inline de `design.html` lignes 31-71.

- [ ] **Step 3 : Les 7 conteneurs de vue** dans `#content`, chacun `<section data-view="dashboard|compose|checking|editor|archived|soul|history" hidden>`, en portant le markup statique de chaque vue de `design.html` (dashboard 75-122, compose 125-150, checking 153-204, editor 207-266, archived 269-296, soul 299-339, history 342-362). Remplacer chaque boucle `sc-for` par un conteneur vide à id stable (ex. `#editions-list`, `#checking-cards`, `#corrections-list`, `#sources-list`, `#soul-rules`, etc.) que le renderer remplira. Remplacer chaque `{{ … }}` par un élément à id (ex. `#dash-date`, `#last-count`).

- [ ] **Step 4 : Les overlays** — porter drawer détail-sujet `#drawer`, reader `#reader`, modal correction `#correct-modal` (textarea `#correct-text` + case `#correct-soul`), toast `#toast` (design.html 367-463), cachés par défaut.

- [ ] **Step 5 : Charger le renderer** — `<script type="module" src="renderer.mjs"></script>` en fin de body (déjà présent).

- [ ] **Step 6 : Vérifier le rendu statique**

Run: `npm run hud`
Expected: la fenêtre affiche le dashboard (ou un état vide cohérent) avec la bonne palette/typo ; bascule clair/sombre via `#btn-theme` change les couleurs. (Les données seront branchées en Task 7.) Aucune erreur console.

- [ ] **Step 7 : Commit**

```bash
git add hud/companion.html
git commit -m "feat(hud): port statique du mockup (7 vues + overlays + tokens)"
```

---

## Task 7 : Renderer — bootstrap, thème, navigation, dashboard

**Files:**
- Modify: `hud/renderer.mjs`

**Interfaces:**
- Consumes : `lib/ui-state.mjs` (`nextView, stepper, viewTitle`), `lib/ui-format.mjs` (`dateLong, inlineMd, soulVersionLabel`), `window.breves` (`getDashboard, copy, onCommandEvent, sendCommand`).
- Produces : un module qui tient `state = { view, theme, ... }`, fonctions `show(view)`, `go(action)`, `renderShell()`, `renderDashboard(data)`.

**Note (vérification) :** DOM, vérifié en lançant l'app.

- [ ] **Step 1 : Bootstrap + navigation + thème**

```js
// hud/renderer.mjs
import { nextView, stepper, viewTitle } from '../lib/ui-state.mjs';
import { dateLong, inlineMd, soulVersionLabel } from '../lib/ui-format.mjs';

const $ = (s) => document.querySelector(s);
const $all = (s) => [...document.querySelectorAll(s)];
const state = { view: 'dashboard', theme: 'light', dashboard: null };

function renderShell() {
  $all('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== state.view; });
  $('#view-title').textContent = viewTitle(state.view);
  const st = stepper(state.view);
  $('#stepper').hidden = st.steps.length === 0;
  $('#step-line').textContent = st.line;
  $('#btn-back').hidden = state.view === 'dashboard';
  // (rendu des pastilles du stepper depuis st.steps — done/active/todo)
}
function show(view) { state.view = view; renderShell(); onEnter(view); }
function go(action) { show(nextView(state.view, action)); }

function applyTheme() { document.body.classList.toggle('dark', state.theme === 'dark'); }
function toggleTheme() { state.theme = state.theme === 'light' ? 'dark' : 'light'; applyTheme(); }

function onEnter(view) {
  if (view === 'dashboard') loadDashboard();
  if (view === 'soul') renderSoul();
  if (view === 'history') renderHistory();
}
```

- [ ] **Step 2 : Dashboard depuis l'IPC**

```js
async function loadDashboard() {
  state.dashboard = await window.breves.getDashboard();
  renderDashboard(state.dashboard);
}
function renderDashboard(data) {
  $('#dash-date').textContent = dateLong(new Date().toISOString().slice(0, 10));
  const eds = data?.editions || [];
  const last = eds[0];
  $('#last-range').textContent = last ? dateLong(last.date) : '—';
  $('#last-count').textContent = last ? String(last.count) : '0';
  const list = $('#editions-list'); list.innerHTML = '';
  for (const e of eds.slice(0, 4)) {
    const b = document.createElement('button');
    b.className = 'edition';
    b.innerHTML = `<span class="r">${dateLong(e.date)}</span><span class="m">${e.count} brèves · ${e.corr} corr.</span>`;
    b.onclick = () => openReader(e);
    list.appendChild(b);
  }
  $('#soul-version').textContent = soulVersionLabel(data?.soul?.version);
}
```

- [ ] **Step 3 : Câbler les boutons de navigation** : `#btn-back`→`go('goDash')`, CTA Nouvelle édition→`go('goCompose')`, carte SOUL→`go('goSoul')`, Historique→`go('goHist')`, `#btn-theme`→`toggleTheme()`. Initialiser : `applyTheme(); show('dashboard');`.

- [ ] **Step 4 : Vérifier**

Run: `npm run hud`
Expected: le dashboard affiche la date du jour, la dernière édition (depuis `raw/notes`), la version SOUL, la liste des éditions récentes ; les boutons SOUL/Historique/Nouvelle édition naviguent ; le retour revient au dashboard ; le thème bascule.

- [ ] **Step 5 : Commit**

```bash
git add hud/renderer.mjs
git commit -m "feat(hud): renderer bootstrap + navigation + dashboard"
```

---

## Task 8 : Compose + Checking (verify en direct)

**Files:**
- Modify: `hud/renderer.mjs`

**Interfaces:**
- Consumes : `lib/checking-model.mjs` (`initCard, applyEvent, applyResult, summary, STEPS`), `window.breves` (`sendCommand, onCommandEvent`).

- [ ] **Step 1 : Compose** — rendre la textarea `#raw-text` ; bouton « Lancer l'enquête » → lit le texte, passe à `checking`, lance verify :

```js
let cards = [];
function go_launch() {
  const sujets = $('#raw-text').value.trim();
  if (!sujets) return;
  cards = [];
  show('checking');
  renderChecking();
  runVerify(sujets);
}
```

- [ ] **Step 2 : S'abonner aux events (une seule fois, au bootstrap) + helper toast**

```js
// helper toast partagé (utilisé dès cette tâche)
let toastTimer = null;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2900);
}

window.breves.onCommandEvent((ev) => {
  if (['topic-detected', 'topic-progress', 'topic-done', 'topic-error'].includes(ev.type)) {
    cards = applyEvent(cards, ev);
    renderChecking();
  }
});
```

- [ ] **Step 3 : Lancer verify + appliquer le filet résultat**

```js
let verifyValue = null;
async function runVerify(sujets) {
  const r = await window.breves.sendCommand('breves-verify', { sujets });
  if (!r.ok) { toast('Échec de la vérification : ' + r.error); return; }
  verifyValue = r.value;
  cards = applyResult(cards, verifyValue);   // filet : termine les cartes même sans sentinelle
  renderChecking(true);
}
```

- [ ] **Step 4 : `renderChecking(done)`** — rendre une carte par `cards[]` dans `#checking-cards` (les 5 étapes avec état done/active/todo, badge source + alerte quand `card.done`), et quand `done` afficher le bilan `summary(cards)` (`N vérifiés · X corrigés · Y nuancés`) + bouton « Rédiger les brèves » → `go('toEditor')` puis `runDraft()`. Drawer détail au clic sur une carte.

- [ ] **Step 5 : Vérifier (smoke réel)**

Run: `npm run hud` puis saisir « GLM 5.2 modèle chinois open source 753B » et lancer.
Expected: une carte apparaît, se termine (badge source + éventuelle alerte), le bilan s'affiche, « Rédiger » devient disponible. (Si aucune sentinelle n'arrive, la carte se termine via le résultat final : pas de blocage.)

- [ ] **Step 6 : Commit**

```bash
git add hud/renderer.mjs
git commit -m "feat(hud): compose + checking en direct (verify streamé + filet résultat)"
```

---

## Task 9 : Editor + gate (draft / corriger / valider)

**Files:**
- Modify: `hud/renderer.mjs`

- [ ] **Step 1 : `runDraft(feedback?)`** — appelle `breves-draft` avec les topics vérifiés :

```js
let draftValue = null;
async function runDraft(feedback) {
  const inputs = { topics: verifyValue.topics };
  if (feedback) inputs.feedback = feedback;
  const r = await window.breves.sendCommand('breves-draft', inputs);
  if (!r.ok) { toast('Échec de la rédaction : ' + r.error); return; }
  draftValue = r.value;
  renderEditor(draftValue);
}
```

- [ ] **Step 2 : `renderEditor(d)`** — remplir `#teams-text` (contentEditable) avec `d.teamsText` (sauts de ligne→`<br>` ou `<p>`), la liste `#corrections-list` (niveau/titre/detail, couleur par niveau), `#sources-list` (name + url_citee, repli signalé). Boutons : `#btn-corriger`→ouvre `#correct-modal` ; `#btn-valider`→`runArchive()`.

- [ ] **Step 3 : Gate Corriger** — `#correct-modal` : `#correct-text` (feedback) + case `#correct-soul` (« enrichir la SOUL »). « Envoyer » → ferme la modale, `runDraft($('#correct-text').value)` ; mémoriser l'intention SOUL pour l'archive (si cochée et que le draft renvoie `soulLessonProposee`, on la passera comme `leconSOUL`).

```js
let wantSoulLesson = true;
function submitCorrect() {
  const fb = $('#correct-text').value.trim();
  wantSoulLesson = $('#correct-soul').checked;
  $('#correct-modal').hidden = true;
  if (fb) runDraft(fb);
}
```

- [ ] **Step 4 : `runArchive()`** — `breves-archive` avec le draft validé :

```js
let archiveValue = null;
async function runArchive() {
  const leconSOUL = (wantSoulLesson && draftValue.soulLessonProposee) || undefined;
  const inputs = { teamsText: draftValue.teamsText, topics: verifyValue.topics, sources: draftValue.sources };
  if (leconSOUL) inputs.leconSOUL = leconSOUL;
  const r = await window.breves.sendCommand('breves-archive', inputs);
  if (!r.ok) { toast('Échec de l’archivage : ' + r.error); return; }
  archiveValue = r.value;
  show('archived');
  renderArchived(archiveValue);
}
```

- [ ] **Step 5 : Vérifier (sans archiver pour de vrai si tu ne veux pas écrire dans raw/)** : enchaîner verify→draft, vérifier que l'éditeur affiche le texte Teams (zéro tiret cadratin hors titres), corrections, sources ; tester Corriger (le texte change). **Ne clique Valider que si tu acceptes d'écrire dans le wiki** (archive réel).

- [ ] **Step 6 : Commit**

```bash
git add hud/renderer.mjs
git commit -m "feat(hud): editor + gate (draft/corriger/valider→archive)"
```

---

## Task 10 : Archived + SOUL + History + overlays + finitions

**Files:**
- Modify: `hud/renderer.mjs`
- Create: `README.md`

- [ ] **Step 1 : `renderArchived(a)`** — étapes `a.archiveSteps` dans `#archive-steps`, `#newsletter-final` = `a.newsletterText`, bouton « Copier » → `window.breves.copy(a.newsletterText)` + toast ; boutons Historique / Nouvelle édition.

- [ ] **Step 2 : `renderSoul()`** — depuis `state.dashboard.soul` (recharger si besoin) : règles `#soul-rules`, exemples `#soul-examples`, leçons `#soul-lessons`.

- [ ] **Step 3 : `renderHistory()` + reader** — liste `state.dashboard.editions` dans `#history-list` ; clic → `openReader(e)` ouvre `#reader` (le texte d'édition n'est pas en mémoire : afficher `range`, `count`, et un bouton Copier qui copie ce qu'on a ; OU lire le fichier via un IPC `read-edition` si tu l'ajoutes — sinon afficher un message « ouvrir le fichier »). Garder simple : copier la newsletter de l'édition courante si disponible.

- [ ] **Step 4 : Overlays + toast** — `openDrawer(card)` (faits/source/clipping du topic depuis `verifyValue`), `closeDrawer`, `toast(msg)` (affiche `#toast` 2.9s).

- [ ] **Step 5 : README.md** — court : prérequis (`BREVES_BB_DIR`, auth Claude locale), `npm install`, `npm run hud`, `npm test` ; rappel que `breves-archive` écrit dans le wiki via MCP.

- [ ] **Step 6 : Vérification finale (clic-through complet)**

Run: `npm run hud`
Expected: parcours dashboard → compose → checking → editor → (Valider sur une vraie veille) → archived → copier ; SOUL et History s'affichent ; thème clair/sombre OK ; overlays OK.

- [ ] **Step 7 : Suite + commit**

```bash
npm test   # logique pure verte
git add hud/renderer.mjs README.md
git commit -m "feat(hud): archived + soul + history + overlays + README"
```

---

## Notes de fin

- **Vérification** : les modules `lib/ui-state`, `lib/checking-model`, `lib/ui-format`, `hud/engine` sont testés en `node --test`. Le shell Electron, `companion.html` et `renderer.mjs` se vérifient en lançant `npm run hud` (œil humain / screenshots).
- **Sentinelles** : si on veut une vraie animation des 5 étapes, c'est un durcissement de `breves-verify.md` (émettre les jalons de façon fiable) — hors scope ici ; le filet `applyResult` garantit que les cartes se terminent.
- **Archive réel** : écrit dans `raw/` du wiki via MCP + `/ingest`. Ne valider que sur une vraie édition.
- **Reader d'historique** : si tu veux relire le texte intégral d'une ancienne édition, ajouter un IPC `read-edition(file)` lisant `raw/notes/<file>` — petite extension optionnelle.
