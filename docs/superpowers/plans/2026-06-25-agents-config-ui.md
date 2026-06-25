# Vue de configuration des agents (Plan 2/2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une vue « Agents » dans l'app pour configurer chaque agent (modèle, outils, prompt système, activer/désactiver, et le mode du sceptique), en éditant les fichiers `.claude/agents/*.md`.

**Architecture :** `lib/agent-file.mjs` gagne `serializeAgent` (round-trip avec `parseAgent`). `hud/engine.mjs` expose `getAgents`/`saveAgent` (lecture/écriture des fichiers d'agent). L'app a une vue « Agents » (liste + édition + enregistrement), accessible depuis le dashboard. Le moteur de brèves (Plan 1) consomme déjà ces fichiers.

**Tech Stack :** Node ≥ 20, ESM, vanilla JS/HTML, `node --test`, Electron.

## Global Constraints

- **Éditable par agent** : modèle (`opus|sonnet|haiku` ou « Hériter » = vide), outils (liste), prompt système (corps), activer/désactiver (`breves_enabled`), et — sceptique uniquement — mode (`off|ciblé|toujours` via `breves_mode`).
- **Round-trip** : `parseAgent(serializeAgent(a))` redonne `a` (champs).
- **`saveAgent` refuse** un `name` ou un `systemPrompt` vide (ne jamais écrire un agent cassé).
- **Fichier** : `<repoDir>/.claude/agents/<name>.md`.
- `getAgents` liste TOUS les agents (activés + désactivés). Dossier absent ⇒ `[]`.
- Pas de nouvelle dépendance. Le moteur de brèves (Plan 1) n'est pas modifié.

---

## Task 1 : `serializeAgent` (round-trip)

**Files:**
- Modify: `lib/agent-file.mjs`
- Test: `test/agent-file.test.mjs`

**Interfaces:**
- Consumes : `parseAgent` (Plan 1).
- Produces : `serializeAgent(a) -> string` — reconstruit le fichier (frontmatter `name, description, tools, model?, breves_enabled, breves_mode?` + corps). `model` omis si vide ; `breves_mode` omis si vide ; `tools` joints par `, ` (vide ⇒ ligne `tools:`).

- [ ] **Step 1 : Écrire les tests**

```js
// test/agent-file.test.mjs — AJOUTER
import { serializeAgent } from '../lib/agent-file.mjs';

test('serializeAgent → parseAgent : round-trip des champs', () => {
  const a = { name: 'sceptique', description: 'Réfute.', tools: ['WebSearch', 'WebFetch'], model: 'sonnet', enabled: true, mode: 'ciblé', systemPrompt: 'Ton job: réfuter.' };
  const re = parseAgent(serializeAgent(a));
  assert.deepEqual(re, a);
});
test('serializeAgent : modèle « hériter » (vide) et mode vide omis', () => {
  const raw = serializeAgent({ name: 'x', description: 'd', tools: [], model: '', enabled: false, mode: '', systemPrompt: 'p' });
  assert.doesNotMatch(raw, /^model:/m);
  assert.doesNotMatch(raw, /breves_mode:/);
  assert.match(raw, /breves_enabled: false/);
  const re = parseAgent(raw);
  assert.equal(re.model, '');
  assert.equal(re.enabled, false);
  assert.deepEqual(re.tools, []);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/agent-file.test.mjs` → FAIL.

- [ ] **Step 3 : Implémenter dans lib/agent-file.mjs**

```js
export function serializeAgent(a) {
  const fm = ['---', `name: ${a.name || ''}`];
  if (a.description) fm.push(`description: ${a.description}`);
  fm.push(`tools: ${(a.tools || []).join(', ')}`);
  if (a.model) fm.push(`model: ${a.model}`);
  fm.push(`breves_enabled: ${a.enabled === false ? 'false' : 'true'}`);
  if (a.mode) fm.push(`breves_mode: ${a.mode}`);
  fm.push('---');
  return `${fm.join('\n')}\n${(a.systemPrompt || '').trim()}\n`;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/agent-file.test.mjs` → PASS. Puis `npm test`.

- [ ] **Step 5 : Commit** — `git add lib/agent-file.mjs test/agent-file.test.mjs && git commit -m "feat(agents): serializeAgent (round-trip parseAgent)"`

---

## Task 2 : Engine — `getAgents` + `saveAgent`

**Files:**
- Modify: `hud/engine.mjs`
- Test: `test/engine.test.mjs`

**Interfaces:**
- Consumes : `loadAgents` (Plan 1, retourne `{defs, byName}`), `serializeAgent`/`parseAgent` (Task 1 + Plan 1).
- Produces :
  - `getAgents(deps) -> Agent[]` — tous les agents parsés, triés par `name`. (Réutilise `loadAgents(deps).byName`.)
  - `saveAgent(deps, name, edits) -> { ok:true } | { ok:false, error }` — `edits = { model, tools, systemPrompt, enabled, mode, description? }`. Refuse `name` vide ou `systemPrompt` vide/blanc. Lit le fichier existant `<repoDir>/.claude/agents/<name>.md`, fusionne les `edits` au-dessus du parsé, `serializeAgent`, écrit.

- [ ] **Step 1 : Écrire les tests** (AJOUTER à `test/engine.test.mjs`)

```js
import { getAgents, saveAgent } from '../hud/engine.mjs';

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
test('saveAgent refuse un prompt vide (n’écrit pas)', () => {
  let called = false;
  const deps = { repoDir: '/repo', readFile: () => '---\nname: x\n---\np', writeFile: () => { called = true; } };
  assert.equal(saveAgent(deps, 'x', { model: 'sonnet', tools: [], systemPrompt: '   ', enabled: true }).ok, false);
  assert.equal(called, false);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/engine.test.mjs` → FAIL.

- [ ] **Step 3 : Implémenter dans hud/engine.mjs**

Ajouter l'import : `import { parseAgent, toAgentDefinition, serializeAgent } from '../lib/agent-file.mjs';` (compléter l'import existant avec `serializeAgent`).

```js
export function getAgents(deps) {
  const { byName } = loadAgents(deps);
  return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
}

export function saveAgent(deps, name, edits) {
  if (!name || typeof edits?.systemPrompt !== 'string' || !edits.systemPrompt.trim()) {
    return { ok: false, error: 'nom ou prompt vide' };
  }
  const path = join(deps.repoDir, '.claude', 'agents', `${name}.md`);
  try {
    const current = parseAgent(deps.readFile(path));
    const merged = {
      ...current,
      model: edits.model ?? current.model,
      tools: edits.tools ?? current.tools,
      systemPrompt: edits.systemPrompt,
      enabled: edits.enabled ?? current.enabled,
      mode: edits.mode ?? current.mode,
      description: edits.description ?? current.description,
    };
    deps.writeFile(path, serializeAgent(merged));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/engine.test.mjs` → PASS. Puis `npm test`.

- [ ] **Step 5 : Commit** — `git add hud/engine.mjs test/engine.test.mjs && git commit -m "feat(engine): getAgents + saveAgent (lecture/écriture des fichiers d'agent)"`

---

## Task 3 : IPC + preload

**Files:**
- Modify: `hud/main.mjs`, `hud/preload.cjs`

**Interfaces:**
- Consumes : `getAgents`, `saveAgent` (Task 2).
- Produces (preload `window.breves`) : `getAgents()` ; `saveAgent(name, edits)`.

- [ ] **Step 1 : main.mjs** — compléter l'import depuis `./engine.mjs` avec `getAgents, saveAgent`, et ajouter les handlers (près de `get-soul-structured`) :

```js
  ipcMain.handle('get-agents', () => getAgents(deps));
  ipcMain.handle('save-agent', (_e, { name, edits }) => saveAgent(deps, name, edits));
```

- [ ] **Step 2 : preload.cjs** — ajouter :

```js
  getAgents: () => ipcRenderer.invoke('get-agents'),
  saveAgent: (name, edits) => ipcRenderer.invoke('save-agent', { name, edits }),
```

- [ ] **Step 3 : Vérifier** — `node --check hud/main.mjs` ; l'app démarre (`ELECTRON_RUN_AS_NODE= npx electron hud/main.mjs`) sans erreur.

- [ ] **Step 4 : Commit** — `git add hud/main.mjs hud/preload.cjs && git commit -m "feat(hud): IPC get-agents / save-agent"`

---

## Task 4 : Vue « Agents »

**Files:**
- Modify: `hud/companion.html`, `hud/renderer.mjs`

**Note (vérification) :** DOM/Electron, vérifié en lançant l'app.

- [ ] **Step 1 : companion.html — bouton d'accès** — dans la vue dashboard, sous la `.row` SOUL/Historique, ajouter :

```html
        <button id="btn-agents" class="card" style="width:100%;text-align:left;margin-top:8px;display:flex;flex-direction:column;gap:3px">
          <span style="font:600 13px var(--body)">Agents</span>
          <span style="font:400 11px var(--body);color:var(--muted)">Enquêteur &amp; sceptique : modèle, outils, prompt</span>
        </button>
```

- [ ] **Step 2 : companion.html — section de vue** — ajouter, près des autres `data-view` :

```html
    <!-- AGENTS (config) -->
    <section data-view="agents">
      <div class="pad">
        <p class="muted" style="font:400 12.5px/1.5 var(--body);margin:0 0 14px">Configure les sous-agents de vérification. Le sceptique tente de réfuter chaque brève (selon son mode).</p>
        <div id="agents-list" style="display:flex;flex-direction:column;gap:14px"></div>
      </div>
    </section>
```

- [ ] **Step 3 : renderer.mjs — état machine** — ajouter `agents` aux actions de navigation. Dans `lib/ui-state.mjs`, ajouter `goAgents: 'agents'` à `ACTIONS`, et `viewTitle('agents') -> 'Agents'`. (Mettre à jour le test `ui-state.test.mjs` en conséquence : `nextView('dashboard','goAgents') === 'agents'` et `viewTitle('agents') === 'Agents'`.)

```js
// lib/ui-state.mjs — ACTIONS : ajouter
  goAgents: 'agents',
// viewTitle : ajouter avant le return final
  if (view === 'agents') return 'Agents';
```

- [ ] **Step 4 : renderer.mjs — rendu + enregistrement**

```js
// ============ AGENTS (config) ============
const MODELES = [['', 'Hériter'], ['opus', 'Opus'], ['sonnet', 'Sonnet'], ['haiku', 'Haiku']];
async function renderAgents() {
  const agents = await window.breves.getAgents();
  const box = $('#agents-list'); box.innerHTML = '';
  if (!agents || !agents.length) { box.appendChild(el('div', 'faint', 'Aucun agent dans .claude/agents/.')); return; }
  agents.forEach((a) => box.appendChild(agentCard(a)));
}
function agentCard(a) {
  const card = el('div', 'card');
  const opts = MODELES.map(([v, l]) => `<option value="${v}"${a.model === v ? ' selected' : ''}>${l}</option>`).join('');
  const isScept = !!a.mode || a.name === 'sceptique';
  const modes = ['off', 'ciblé', 'toujours'].map((m) => `<option value="${m}"${a.mode === m ? ' selected' : ''}>${m}</option>`).join('');
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font:600 14px var(--display)">${escapeHtml(a.name)}</span>
      <label style="margin-left:auto;display:flex;align-items:center;gap:6px;font:500 11px var(--body);color:var(--muted)">
        <input type="checkbox" class="ag-enabled"${a.enabled ? ' checked' : ''}> activé</label>
    </div>
    <div style="font:400 11.5px var(--body);color:var(--muted);margin-bottom:10px">${escapeHtml(a.description || '')}</div>
    <label class="eyebrow" style="display:block;margin-bottom:4px">Modèle</label>
    <select class="ag-model" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:var(--radiusSm);background:var(--panel);color:var(--text);margin-bottom:10px">${opts}</select>
    ${isScept ? `<label class="eyebrow" style="display:block;margin-bottom:4px">Mode sceptique</label>
    <select class="ag-mode" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:var(--radiusSm);background:var(--panel);color:var(--text);margin-bottom:10px">${modes}</select>` : ''}
    <label class="eyebrow" style="display:block;margin-bottom:4px">Outils (séparés par des virgules)</label>
    <input class="ag-tools" value="${escapeHtml((a.tools || []).join(', '))}" style="width:100%;padding:8px;border:1px solid var(--line);border-radius:var(--radiusSm);background:var(--panel);color:var(--text);font:400 12px var(--mono);margin-bottom:10px">
    <label class="eyebrow" style="display:block;margin-bottom:4px">Prompt système</label>
    <textarea class="ag-prompt" spellcheck="false" style="min-height:160px;font:400 12px/1.55 var(--mono)">${escapeHtml(a.systemPrompt || '')}</textarea>
    <button class="ag-save btn-primary" style="margin-top:10px">Enregistrer</button>`;
  card.querySelector('.ag-save').onclick = async () => {
    const edits = {
      model: card.querySelector('.ag-model').value,
      tools: card.querySelector('.ag-tools').value.split(',').map((t) => t.trim()).filter(Boolean),
      systemPrompt: card.querySelector('.ag-prompt').value,
      enabled: card.querySelector('.ag-enabled').checked,
    };
    const m = card.querySelector('.ag-mode'); if (m) edits.mode = m.value;
    const r = await window.breves.saveAgent(a.name, edits);
    toast(r && r.ok ? `Agent « ${a.name} » enregistré` : 'Échec : ' + (r?.error || 'inconnu'));
  };
  return card;
}
```

  Brancher : dans `onEnter`, ajouter `if (view === 'agents') renderAgents();` ; dans `wire()`, ajouter `$('#btn-agents').onclick = () => go('goAgents');`.

- [ ] **Step 5 : Vérifier** — `npm test` vert (y compris `ui-state` mis à jour). Lancer l'app : le dashboard a un bouton « Agents » ; la vue liste enquêteur + sceptique ; modifier le **mode** du sceptique (ex. `toujours`) + Enregistrer → toast ; vérifier que `.claude/agents/sceptique.md` reflète `breves_mode: toujours`. Le retour ramène au dashboard.

- [ ] **Step 6 : Commit** — `git add hud/companion.html hud/renderer.mjs lib/ui-state.mjs test/ui-state.test.mjs && git commit -m "feat(hud): vue Agents (config modèle/outils/prompt/activation/mode)"`

---

## Notes de fin

- Modules testés : `serializeAgent` (round-trip), `getAgents`/`saveAgent` (deps injectés), `ui-state` (action/titre agents). Vue vérifiée en lançant l'app.
- Le mode sceptique réglé ici est lu par le moteur (Plan 1 : `dispatch` passe `inputs.sceptique`) — boucle complète : UI → fichier d'agent → engine → verify.
- Build log à écrire en fin d'exécution : `docs/buildlog/2026-06-25-g-agents-config-ui.md`.
