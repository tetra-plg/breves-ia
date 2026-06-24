# Agents formalisés + passe sceptique (Plan 1/2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formaliser les enquêteurs en fichiers d'agent injectés programmatiquement dans le SDK, et ajouter une passe sceptique (réfutation adversariale) à `breves-verify`, réglable par mode.

**Architecture :** Les fichiers `.claude/agents/*.md` (frontmatter + corps = prompt système) sont la **source éditable**. L'auto-découverte `.claude/agents/` ne marche PAS en SDK headless (vérifié) ; l'engine **lit les fichiers et les injecte via `options.agents`** du SDK (comme le MCP en Plan C). `breves-verify` dispatche alors `subagent_type: enqueteur` par sujet, puis `subagent_type: sceptique` selon le mode reçu en INPUTS, et fusionne les verdicts.

**Tech Stack :** Node ≥ 20, ESM, `@anthropic-ai/claude-agent-sdk` (`options.agents`), `node --test`. Commandes/agents Claude Code en markdown.

## Global Constraints

- **Agents injectés programmatiquement** : `options.agents = { <nom>: { description, prompt, tools?, model? } }` (PAS d'auto-découverte `.claude/agents/`).
- **`AgentDefinition`** (SDK) : `{ description:string, prompt:string (system), tools?:string[], model?:string }`.
- **Mode sceptique** : `off | ciblé | toujours` (défaut ciblé) ; passé en `INPUTS.sceptique` à `breves-verify`.
- **Fusion** : si le sceptique réfute → `fiabilite` rétrogradée (`partiel`/`non_verifie`) + `alerte`/`corrections` ; sinon inchangé. Contrat `validateVerifyOutput` inchangé.
- **Outils des agents** : web/lecture uniquement (`WebSearch`, `WebFetch`) ; jamais d'écriture.
- Agents désactivés (`breves_enabled: false`) ou absents ⇒ non injectés ; sceptique absent/off ⇒ verify comme aujourd'hui.
- `cwd` du SDK = `repoDir` (déjà le cas). Pas de nouvelle dépendance.

---

## Task 1 : Parseur de fichier d'agent — `lib/agent-file.mjs`

**Files:**
- Create: `lib/agent-file.mjs`, `test/fixtures/agent.sample.md`
- Test: `test/agent-file.test.mjs`

**Interfaces:**
- Produces :
  - `parseAgent(raw) -> { name, description, tools, model, enabled, mode, systemPrompt }`
    - frontmatter `--- … ---` parsé en `key: value` ; `tools` = liste séparée par virgules (vide ⇒ `[]`) ; `model` (string|''), `enabled` = `breves_enabled` !== 'false' (défaut true), `mode` = `breves_mode` (''|off|ciblé|toujours) ; `systemPrompt` = le corps après le frontmatter (trim). Champs absents ⇒ valeurs par défaut, ne jette pas.
  - `toAgentDefinition(a) -> { description, prompt, tools?, model? }` (forme SDK ; `tools` omis si vide, `model` omis si vide/inherit).

- [ ] **Step 1 : Créer la fixture** `test/fixtures/agent.sample.md`

```markdown
---
name: enqueteur
description: Vérifie un sujet IA pour une brève.
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
---
Tu es un enquêteur. Vérifie les faits, la date, la source, récupère le clipping.
```

- [ ] **Step 2 : Écrire les tests**

```js
// test/agent-file.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAgent, toAgentDefinition } from '../lib/agent-file.mjs';

const RAW = readFileSync(new URL('./fixtures/agent.sample.md', import.meta.url), 'utf8');

test('parseAgent : frontmatter + corps', () => {
  const a = parseAgent(RAW);
  assert.equal(a.name, 'enqueteur');
  assert.equal(a.description, 'Vérifie un sujet IA pour une brève.');
  assert.deepEqual(a.tools, ['WebSearch', 'WebFetch']);
  assert.equal(a.model, 'sonnet');
  assert.equal(a.enabled, true);
  assert.match(a.systemPrompt, /^Tu es un enquêteur\./);
});
test('parseAgent : breves_mode + enabled=false', () => {
  const a = parseAgent('---\nname: sceptique\nbreves_enabled: false\nbreves_mode: toujours\n---\ncorps');
  assert.equal(a.enabled, false);
  assert.equal(a.mode, 'toujours');
});
test('parseAgent : champs manquants → défauts, ne jette pas', () => {
  const a = parseAgent('---\nname: x\n---\nprompt');
  assert.deepEqual(a.tools, []);
  assert.equal(a.model, '');
  assert.equal(a.enabled, true);
  assert.equal(a.systemPrompt, 'prompt');
});
test('toAgentDefinition : forme SDK', () => {
  const def = toAgentDefinition({ description: 'd', systemPrompt: 'p', tools: ['WebSearch'], model: 'sonnet' });
  assert.deepEqual(def, { description: 'd', prompt: 'p', tools: ['WebSearch'], model: 'sonnet' });
  const def2 = toAgentDefinition({ description: 'd', systemPrompt: 'p', tools: [], model: '' });
  assert.deepEqual(def2, { description: 'd', prompt: 'p' });   // tools/model omis si vides
});
```

- [ ] **Step 3 : Lancer, vérifier l'échec** — `node --test test/agent-file.test.mjs` → FAIL.

- [ ] **Step 4 : Créer lib/agent-file.mjs**

```js
function splitFrontmatter(raw) {
  const m = String(raw).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: String(raw).trim() };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: m[2].trim() };
}

export function parseAgent(raw) {
  const { fm, body } = splitFrontmatter(raw);
  const tools = fm.tools ? fm.tools.split(',').map((t) => t.trim()).filter(Boolean) : [];
  return {
    name: fm.name || '',
    description: fm.description || '',
    tools,
    model: fm.model && fm.model !== 'inherit' ? fm.model : '',
    enabled: fm.breves_enabled !== 'false',
    mode: fm.breves_mode || '',
    systemPrompt: body,
  };
}

export function toAgentDefinition(a) {
  const def = { description: a.description, prompt: a.systemPrompt };
  if (a.tools && a.tools.length) def.tools = a.tools;
  if (a.model) def.model = a.model;
  return def;
}
```

- [ ] **Step 5 : Lancer, vérifier le succès** — `node --test test/agent-file.test.mjs` → PASS (4 tests). Puis `npm test`.

- [ ] **Step 6 : Commit** — `git add lib/agent-file.mjs test/agent-file.test.mjs test/fixtures/agent.sample.md && git commit -m "feat(agents): parseAgent + toAgentDefinition (fichier d'agent → définition SDK)"`

---

## Task 2 : Les fichiers d'agent `enqueteur` + `sceptique`

**Files:**
- Create: `.claude/agents/enqueteur.md`, `.claude/agents/sceptique.md`

**Note :** prompts (markdown), pas de `node --test`. Vérifiés par parsing (Task 1) + smoke (Task 5).

- [ ] **Step 1 : `.claude/agents/enqueteur.md`** — reprendre le contenu de `.claude/breves-ia/_brief-enqueteur.md` comme **prompt système** (corps), reformulé « Tu es un enquêteur… » :

```markdown
---
name: enqueteur
description: Vérifie un sujet d'actualité IA pour une brève (faits, date, source, clipping).
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
---
Tu es un enquêteur de vérification pour les brèves IA. On te donne UN sujet (et éventuellement une date/URL fournies).
1. Vérifie les FAITS via WebSearch/WebFetch. Signale toute inexactitude.
2. VALIDE la date fournie (flag si fausse) ou TROUVE-la si absente.
3. Choisis la MEILLEURE source (officiel > presse de référence).
4. RÉCUPÈRE le contenu de la source pour clipping. Si paywall/403/timeout, bascule sur une source accessible équivalente en gardant l'URL citée d'origine.
N'écris RIEN dans raw/. Ne rédige PAS la brève. Réponds UNIQUEMENT le bloc demandé :
sujet, date_reelle, date_fournie, date_corrigee, faits_verifies (liste), corrections, fiabilite (confirme|partiel|non_verifie), url_citee, url_clippee, clipping_meta, slug, clipping_contenu.
Aucune invention : si ce n'est pas vérifié, fiabilite = non_verifie.
```

- [ ] **Step 2 : `.claude/agents/sceptique.md`** :

```markdown
---
name: sceptique
description: Tente de réfuter l'affirmation centrale d'une brève (vérification adversariale).
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
breves_mode: ciblé
---
Ton SEUL job est de RÉFUTER. On te donne une brève déjà vérifiée (affirmation, date, source).
Cherche activement à la démolir via WebSearch/WebFetch :
- L'affirmation centrale est-elle vraie, ou exagérée/inversée/sortie de contexte ?
- La date tient-elle ? La source dit-elle VRAIMENT ça ?
Doute par défaut : si tu n'es pas sûr, considère que ce n'est pas confirmé.
Réponds UNIQUEMENT :
refute: <oui|non>
raison: <ce qui cloche, ou "rien">
fiabilite_suggeree: <confirme|partiel|non_verifie>
```

- [ ] **Step 3 : Vérifier le parsing** — `node -e` rapide : `parseAgent(readFile('.claude/agents/enqueteur.md'))` donne `enabled:true`, `tools:['WebSearch','WebFetch']`, `model:'sonnet'` ; sceptique donne `mode:'ciblé'`.

- [ ] **Step 4 : Commit** — `git add .claude/agents/enqueteur.md .claude/agents/sceptique.md && git commit -m "feat(agents): fichiers enqueteur + sceptique (prompts système)"`

---

## Task 3 : Engine — injection des agents + mode sceptique + input verify

**Files:**
- Modify: `lib/runner.mjs`, `hud/engine.mjs`, `lib/command-inputs.mjs`
- Test: `test/runner.test.mjs`, `test/engine.test.mjs`, `test/command-inputs.test.mjs`

**Interfaces:**
- Consumes : `parseAgent`, `toAgentDefinition` (Task 1).
- Produces :
  - `runSkill`/`runRaw` acceptent une option `agents` (Record) insérée dans `options.agents` du SDK (comme `mcpServers`).
  - `hud/engine.mjs` : `loadAgents(deps) -> { defs, byName }` (lit `<repoDir>/.claude/agents/*.md` ; `defs` = `{nom: AgentDefinition}` des agents `enabled` ; `byName` = parsés). `dispatch` injecte `agents: loadAgents(deps).defs` ; pour `breves-verify`, calcule le mode sceptique (`byName.sceptique.enabled ? mode : 'off'`) et l'ajoute à `inputs.sceptique` s'il n'y est pas déjà.
  - `validateInputs('breves-verify', …)` autorise la clé optionnelle `sceptique ∈ {off, ciblé, toujours}`.

- [ ] **Step 1 : Tests runner (option agents)**

```js
// test/runner.test.mjs — AJOUTER
test('runSkill insère agents dans les options', async () => {
  let opts = null;
  const fq = (a) => { opts = a.options; return (async function*(){ yield { type:'result', subtype:'success', is_error:false, result:'```json\n{"topics":[]}\n```' }; })(); };
  await runSkill({ skill:'breves-verify', inputs:{ sujets:'x' }, bbDir:'/cwd', agents:{ enqueteur:{ description:'d', prompt:'p' } }, onEvent:()=>{}, query: fq });
  assert.deepEqual(opts.agents, { enqueteur:{ description:'d', prompt:'p' } });
});
```

- [ ] **Step 2 : Tests command-inputs (clé sceptique)**

```js
// test/command-inputs.test.mjs — AJOUTER
test('verify accepte un mode sceptique valide et refuse un invalide', () => {
  assert.equal(validateInputs('breves-verify', { sujets: 'x', sceptique: 'ciblé' }).ok, true);
  assert.equal(validateInputs('breves-verify', { sujets: 'x', sceptique: 'bidon' }).ok, false);
});
```

- [ ] **Step 3 : Tests engine (loadAgents + dispatch injecte agents + mode)**

```js
// test/engine.test.mjs — AJOUTER
import { loadAgents } from '../hud/engine.mjs';

test('loadAgents lit les agents activés en définitions SDK', () => {
  const files = { 'enqueteur.md': '---\nname: enqueteur\ndescription: d\ntools: WebSearch\nmodel: sonnet\n---\nprompt enq',
                  'sceptique.md': '---\nname: sceptique\nbreves_enabled: false\nbreves_mode: ciblé\n---\nprompt scep' };
  const deps = { repoDir: '/repo', readdir: () => Object.keys(files), readFile: (p) => files[p.split('/').pop()] };
  const { defs, byName } = loadAgents(deps);
  assert.deepEqual(defs.enqueteur, { description: 'd', prompt: 'prompt enq', tools: ['WebSearch'], model: 'sonnet' });
  assert.equal(defs.sceptique, undefined);           // désactivé → non injecté
  assert.equal(byName.sceptique.mode, 'ciblé');
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
```

- [ ] **Step 4 : Lancer, vérifier l'échec** — `npm test` → les nouveaux tests FAIL.

- [ ] **Step 5 : Implémenter**
  - `lib/runner.mjs` : dans `runSkill` ET `runRaw`, après `if (mcpServers) options.mcpServers = mcpServers;`, ajouter `if (agents) options.agents = agents;` et ajouter `agents` au destructuring des params.
  - `lib/command-inputs.mjs` : dans la branche `breves-verify`, autoriser `sceptique` : `if (!onlyKeys(inp, ['sujets', 'sceptique'])) …` et `if (inp.sceptique != null && !['off','ciblé','toujours'].includes(inp.sceptique)) errors.push('sceptique invalide');`
  - `hud/engine.mjs` :

```js
import { readdirSync } from 'node:fs';
import { parseAgent, toAgentDefinition } from '../lib/agent-file.mjs';

export function loadAgents(deps) {
  const dir = join(deps.repoDir, '.claude', 'agents');
  let files = [];
  try { files = deps.readdir(dir); } catch { return { defs: {}, byName: {} }; }
  const defs = {}, byName = {};
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const a = parseAgent(deps.readFile(join(dir, f)));
    if (!a.name) continue;
    byName[a.name] = a;
    if (a.enabled) defs[a.name] = toAgentDefinition(a);
  }
  return { defs, byName };
}

export async function dispatch({ skill, inputs, onEvent }, deps) {
  const { defs, byName } = loadAgents(deps);
  const finalInputs = { ...inputs };
  if (skill === 'breves-verify' && finalInputs.sceptique == null) {
    const s = byName.sceptique;
    finalInputs.sceptique = (s && s.enabled && s.mode) ? s.mode : 'off';
  }
  return deps.runSkill({
    skill, inputs: finalInputs, bbDir: deps.repoDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    agents: Object.keys(defs).length ? defs : undefined,
    onEvent,
  });
}
```

  `defaultDeps` : ajouter `readdir: (p) => readdirSync(p)`.

- [ ] **Step 6 : Lancer, vérifier le succès** — `npm test` vert.

- [ ] **Step 7 : Commit** — `git add lib/runner.mjs lib/command-inputs.mjs hud/engine.mjs test/ && git commit -m "feat(engine): injection programmatique des agents + mode sceptique dans verify"`

---

## Task 4 : Recâblage de `breves-verify`

**Files:**
- Modify: `.claude/commands/breves-verify.md`

**Note :** prompt. Vérifié par cohérence du contrat + smoke (Task 5).

- [ ] **Step 1 : Réécrire la Phase 1** — remplacer « Dispatche en parallèle un sous-agent `general-purpose` par sujet … lis `_brief-enqueteur.md` » par :

```markdown
3. Dispatche **en parallèle un sous-agent par sujet** via l'outil Task avec **`subagent_type: "enqueteur"`** (un seul message, plusieurs `Task`). Tâche = le sujet (+ date/URL fournies). Le brief EST le prompt système de l'agent : ne le répète pas.
```

- [ ] **Step 2 : Ajouter la passe sceptique** — après la collecte des enquêteurs, avant le JSON final :

```markdown
## Passe sceptique (selon INPUTS.sceptique : off | ciblé | toujours)
- `off` : ne fais rien.
- `toujours` : pour CHAQUE brève, dispatche un Task `subagent_type: "sceptique"` (donne l'affirmation centrale + la date + la source à réfuter).
- `ciblé` : seulement pour les brèves à affirmation forte (un chiffre, un superlatif, « premier/record/jamais »), dispatche le sceptique.
Fusion des verdicts : si le sceptique répond `refute: oui`, applique sa `fiabilite_suggeree` (rétrograde `fiabilite` en `partiel`/`non_verifie`) et ajoute une `alerte` (niveau `nuance` ou `corrigé`) + une ligne dans `corrections` résumant la réfutation. Sinon, ne change rien.
```

- [ ] **Step 3 : Vérifier la cohérence** — le bloc JSON final reste conforme à `validateVerifyOutput` (clés inchangées ; `fiabilite`/`alerte`/`corrections` éventuellement ajustées). Mentionner `INPUTS.sceptique` dans l'en-tête des inputs attendus.

- [ ] **Step 4 : Commit** — `git add .claude/commands/breves-verify.md && git commit -m "feat(breves): verify dispatche enqueteur + passe sceptique (mode)"`

---

## Task 5 : Smoke réel (valide subagent_type + sceptique)

- [ ] **Step 1 : Suite complète** — `npm test` vert.

- [ ] **Step 2 : Smoke verify avec sceptique ciblé** (réseau + SDK)

```bash
node scripts/breves-cli.mjs verify "GLM 5.2, un modèle chinois open source de 753 milliards de paramètres (record)"
```

Attendu : exit 0, JSON `topics` valide. Vérifier à l'œil dans les events/logs qu'un Task `subagent_type: enqueteur` part par sujet, et — l'affirmation contenant un chiffre/record — qu'un Task `sceptique` se déclenche (mode ciblé par défaut depuis `.claude/agents/sceptique.md`). La `fiabilite` reflète l'éventuelle réfutation.

- [ ] **Step 3 : Smoke mode off** — éditer temporairement `.claude/agents/sceptique.md` `breves_enabled: false` (ou `breves_mode: off`), relancer : aucun sceptique ne part ; rétablir ensuite.

- [ ] **Step 4 : Commit éventuel** (ajustements prompts) puis **merge/push** (après review).

---

## Notes de fin

- **Risque `subagent_type` levé** : probe décisif — `options.agents` programmatique fonctionne (un Task vers l'agent custom applique bien son prompt système). On n'utilise PAS l'auto-découverte `.claude/agents/`.
- Le `_brief-enqueteur.md` (snippet) devient redondant pour l'app (l'agent porte le prompt) ; le `/breves-ia` interactif (BoilingBrain) le garde. À nettoyer plus tard si besoin.
- **Plan 2** (vue config UI) suivra : `serializeAgent` + `getAgents`/`saveAgent`, IPC, vue « Agents » (modèle/outils/prompt/activer-désactiver/mode). `parseAgent` (Task 1 ici) y sera réutilisé.
- Build log à écrire en fin d'exécution.
