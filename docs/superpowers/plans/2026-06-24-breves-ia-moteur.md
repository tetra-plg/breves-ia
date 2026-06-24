# Plan A — Moteur & sous-commandes Brèves IA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le moteur headless qui pilote `/breves-ia` : 3 sous-commandes Claude Code (`breves-verify`, `breves-draft`, `breves-archive`) + une `lib/` Node (runner sur Claude Agent SDK, validation des inputs, parsing/validation du JSON de sortie, lecture SOUL/éditions), entièrement testable sans UI.

**Architecture :** La `lib/` vit dans le repo `breves-ia/`. Le runner exécute `query()` du Claude Agent SDK avec `cwd` = repo BoilingBrain et `permissionMode:'bypassPermissions'`, ce qui recharge tels quels les sous-commandes, la SOUL, les sous-agents et le MCP `boiling-brain-wiki`. Chaque sous-commande termine par un bloc ` ```json ` que le runner extrait et valide. La progression « checking » remonte via des lignes sentinelles `«BREVES» …` émises par la commande et parsées dans le flux streamé.

**Tech Stack :** Node ≥ 20, ESM (`type: module`), `@anthropic-ai/claude-agent-sdk`, tests `node --test` (SDK mocké, zéro réseau). Commandes Claude Code en markdown dans `BoilingBrain/.claude/`.

## Global Constraints

- **Aucune invention** : un fait non confirmé est `fiabilite: non_verifie`, jamais affirmé. (SOUL §4, garde-fous commande)
- **`raw/` immutable** : écriture uniquement via `drop_to_raw(...)` du MCP ; jamais d'écriture directe dans `raw/`. La SOUL n'est jamais dans `raw/`.
- **Zéro tiret cadratin** dans le texte rédigé (ni « — » ni « – ») : deux-points, parenthèses, virgules à la place. (SOUL §3)
- **Repli source auto** : si paywall/403/timeout, basculer sur une source accessible équivalente en gardant l'URL citée d'origine ; le repli est signalé.
- **Slugs kebab-case sans date** ; fichiers datés `YYYY-MM-DD-<slug>.md`.
- **Regroupement par date réelle**, ordre chronologique.
- **Sous-commandes sans question** : aucune `AskUserQuestion` ; les inputs arrivent en JSON (« utilise-les, ne pose aucune question »). Les gates humains sont gérés par l'UI (Plan B).
- **Fidélité workflow** : les sous-commandes reproduisent les phases 1/2/3 de `BoilingBrain/.claude/commands/breves-ia.md` sans en retirer un seul garde-fou (cf. spec §4).
- **Chemin BoilingBrain** configurable via `BREVES_BB_DIR` (défaut `/Users/pleguern/Workspace/BoilingBrain`).

---

## Structure de fichiers

```
breves-ia/                         (repo app — ce repo)
  package.json                     type module ; deps SDK ; scripts test
  .env.example                     BREVES_BB_DIR=...
  lib/
    load-env.mjs                   chargeur .env minimal (repris de poker-suivi)
    config.mjs                     loadEngineConfig(env) -> { bbDir }
    skills.mjs                     ALLOWED_SKILLS = [3 sous-cmds]
    command-inputs.mjs             validateInputs(skill, inputs) + buildPrompt(skill, inputs)
    contracts.mjs                  validateVerifyOutput/DraftOutput/ArchiveOutput(obj)
    parse-result.mjs              extractJsonBlock(text) + parseSentinels(text)
    runner.mjs                     runSkill({skill, inputs, bbDir, onEvent, query})
    soul.mjs                       readSoul(bbDir) -> {version, rules[], examples[], lessons[]}
    editions.mjs                   listEditions(bbDir) -> [{date, file, count, ...}]
  scripts/
    breves-cli.mjs                 driver terminal verify->draft->archive (smoke manuel)
  test/
    command-inputs.test.mjs
    contracts.test.mjs
    parse-result.test.mjs
    runner.test.mjs
    soul.test.mjs
    editions.test.mjs
  test/fixtures/
    SOUL.sample.md
    note.sample.md

BoilingBrain/.claude/                (repo moteur — cross-repo)
  breves-ia/
    _brief-enqueteur.md            brief partagé (Phase 1) — lu par verify & breves-ia
    _archive.md                    procédure d'archive partagée (Phase 3)
    SOUL.md                        (existant)
  commands/
    breves-verify.md               nouvelle sous-commande
    breves-draft.md                nouvelle sous-commande
    breves-archive.md              nouvelle sous-commande
    breves-ia.md                   (existant — refactor pour pointer les snippets partagés)
```

---

## Task 1 : Scaffold du repo moteur

**Files:**
- Create: `package.json`, `.env.example`, `lib/load-env.mjs`, `lib/config.mjs`
- Test: `test/config.test.mjs`

**Interfaces:**
- Produces: `loadEnvFile(path?, env?)` (repris tel quel de poker-suivi) ; `loadEngineConfig(env=process.env) -> { bbDir }`.

- [ ] **Step 1 : Écrire le test de config**

```js
// test/config.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngineConfig } from '../lib/config.mjs';

test('bbDir par défaut', () => {
  assert.equal(loadEngineConfig({}).bbDir, '/Users/pleguern/Workspace/BoilingBrain');
});
test('bbDir surchargé par BREVES_BB_DIR', () => {
  assert.equal(loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb' }).bbDir, '/tmp/bb');
});
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `node --test test/config.test.mjs`
Expected: FAIL (`Cannot find module '../lib/config.mjs'`)

- [ ] **Step 3 : Créer package.json**

```json
{
  "name": "breves-ia-companion",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.3.181"
  }
}
```

- [ ] **Step 4 : Créer lib/load-env.mjs** (copie conforme de `poker-suivi/lib/load-env.mjs` : `parseEnv(text)` + `loadEnvFile(path='.env', env=process.env)`, no-clobber, fichier absent => `{}`).

- [ ] **Step 5 : Créer lib/config.mjs**

```js
export function loadEngineConfig(env = process.env) {
  return { bbDir: env.BREVES_BB_DIR || '/Users/pleguern/Workspace/BoilingBrain' };
}
```

- [ ] **Step 6 : Créer .env.example**

```
# Chemin du repo BoilingBrain (cwd des sous-commandes)
BREVES_BB_DIR=/Users/pleguern/Workspace/BoilingBrain
```

- [ ] **Step 7 : Installer les deps**

Run: `npm install`
Expected: `@anthropic-ai/claude-agent-sdk` installé, `node_modules/` créé.

- [ ] **Step 8 : Lancer le test, vérifier le succès**

Run: `node --test test/config.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 9 : Commit**

```bash
git add package.json package-lock.json .env.example lib/load-env.mjs lib/config.mjs test/config.test.mjs
git commit -m "feat(moteur): scaffold repo + config bbDir"
```

---

## Task 2 : Allow-list + validation/construction des inputs

**Files:**
- Create: `lib/skills.mjs`, `lib/command-inputs.mjs`
- Test: `test/command-inputs.test.mjs`

**Interfaces:**
- Produces:
  - `ALLOWED_SKILLS = ['breves-verify', 'breves-draft', 'breves-archive']`
  - `validateInputs(skill, inputs) -> { ok: true } | { ok: false, errors: string[] }`
  - `buildPrompt(skill, inputs) -> string` (lève si skill hors allow-list)

**Notes de domaine :** contrairement à poker-suivi (inputs mono-ligne), `breves-verify` reçoit un texte multi-lignes (sujets en vrac). On autorise donc `\n` mais on borne la taille et on retire les autres caractères de contrôle (anti-injection). Les inputs `topics`/`sources`/`teamsText` de draft/archive sont des structures issues d'un appel précédent : on valide leur forme via `contracts.mjs` (Task 3), pas ici.

- [ ] **Step 1 : Écrire les tests**

```js
// test/command-inputs.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInputs, buildPrompt } from '../lib/command-inputs.mjs';

test('verify accepte un texte multi-lignes borné', () => {
  assert.deepEqual(validateInputs('breves-verify', { sujets: 'GLM 5.2\nMidjourney scan' }), { ok: true });
});
test('verify refuse sujets vide', () => {
  assert.equal(validateInputs('breves-verify', { sujets: '   ' }).ok, false);
});
test('verify refuse une clé inattendue', () => {
  assert.equal(validateInputs('breves-verify', { sujets: 'x', autre: 1 }).ok, false);
});
test('verify accepte les sauts de ligne mais refuse les autres contrôles', () => {
  assert.equal(validateInputs('breves-verify', { sujets: 'a\nb' }).ok, true);   // \n autorisé
  assert.equal(validateInputs('breves-verify', { sujets: 'a\u0000b' }).ok, false); // NUL refusé
  assert.equal(validateInputs('breves-verify', { sujets: 'a\tb' }).ok, false);   // \t refusé
});
test('draft exige topics tableau et feedback optionnel string', () => {
  assert.equal(validateInputs('breves-draft', { topics: [], feedback: 'plus court' }).ok, true);
  assert.equal(validateInputs('breves-draft', { topics: 'x' }).ok, false);
});
test('archive exige teamsText + topics + sources', () => {
  assert.equal(validateInputs('breves-archive', { teamsText: 't', topics: [], sources: [] }).ok, true);
  assert.equal(validateInputs('breves-archive', { teamsText: 't', topics: [] }).ok, false);
});
test('skill inconnu rejeté', () => {
  assert.equal(validateInputs('autre', {}).ok, false);
});
test('buildPrompt produit /skill + bloc INPUTS et lève hors allow-list', () => {
  const p = buildPrompt('breves-verify', { sujets: 'GLM 5.2' });
  assert.match(p, /^\/breves-verify/);
  assert.match(p, /INPUTS/);
  assert.match(p, /ne pose aucune question/);
  assert.throws(() => buildPrompt('rm-rf', {}));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/command-inputs.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/skills.mjs**

```js
export const ALLOWED_SKILLS = ['breves-verify', 'breves-draft', 'breves-archive'];
```

- [ ] **Step 4 : Créer lib/command-inputs.mjs**

```js
import { ALLOWED_SKILLS } from './skills.mjs';

// chaîne libre courte mono-ligne (anti-injection) : ≤280, sans caractère de contrôle
function isFreeString(v) {
  return typeof v === 'string' && v.length <= 280 && !/[\u0000-\u001f\u007f-\u009f]/.test(v);
}
// texte « sujets en vrac » : multi-lignes autorisé (\n), borné, sans autres contrôles
function isBulkText(v) {
  return typeof v === 'string'
    && v.trim().length > 0
    && v.length <= 8000
    && !/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(v);
}
function onlyKeys(obj, keys) {
  return Object.keys(obj).every((k) => keys.includes(k));
}

export function validateInputs(skill, inputs) {
  const inp = inputs == null ? {} : inputs;
  if (typeof inp !== 'object' || Array.isArray(inp)) return { ok: false, errors: ['inputs doit être un objet'] };
  const errors = [];

  if (skill === 'breves-verify') {
    if (!onlyKeys(inp, ['sujets'])) errors.push('clé inattendue');
    if (!isBulkText(inp.sujets)) errors.push('sujets invalide (texte non vide ≤8000, sans caractère de contrôle hors saut de ligne)');
  } else if (skill === 'breves-draft') {
    if (!onlyKeys(inp, ['topics', 'feedback'])) errors.push('clé inattendue');
    if (!Array.isArray(inp.topics)) errors.push('topics doit être un tableau');
    if (inp.feedback != null && !isFreeString(inp.feedback)) errors.push('feedback invalide (≤280, mono-ligne)');
  } else if (skill === 'breves-archive') {
    if (!onlyKeys(inp, ['teamsText', 'topics', 'sources', 'leconSOUL'])) errors.push('clé inattendue');
    if (typeof inp.teamsText !== 'string' || inp.teamsText.trim() === '') errors.push('teamsText requis');
    if (!Array.isArray(inp.topics)) errors.push('topics doit être un tableau');
    if (!Array.isArray(inp.sources)) errors.push('sources doit être un tableau');
    if (inp.leconSOUL != null && !isFreeString(inp.leconSOUL)) errors.push('leconSOUL invalide (≤280, mono-ligne)');
  } else {
    errors.push('skill inconnu');
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function buildPrompt(skill, inputs) {
  if (!ALLOWED_SKILLS.includes(skill)) throw new Error(`skill non autorisé: ${skill}`);
  let prompt = `/${skill}`;
  if (inputs && typeof inputs === 'object' && Object.keys(inputs).length > 0) {
    prompt += `\n\nINPUTS (utilise-les, ne pose aucune question) :\n${JSON.stringify(inputs)}`;
  }
  return prompt;
}
```

- [ ] **Step 5 : Lancer, vérifier le succès**

Run: `node --test test/command-inputs.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 6 : Commit**

```bash
git add lib/skills.mjs lib/command-inputs.mjs test/command-inputs.test.mjs
git commit -m "feat(moteur): allow-list + validation/construction des inputs"
```

---

## Task 3 : Contrats de sortie (validation du JSON des sous-commandes)

**Files:**
- Create: `lib/contracts.mjs`
- Test: `test/contracts.test.mjs`

**Interfaces:**
- Produces (chacun `-> { ok: true, value } | { ok: false, errors: string[] }`) :
  - `validateVerifyOutput(obj)` — exige `{ topics: Topic[] }` ; `Topic` = `{ key, sujet, date_reelle, fiabilite, faits[], source, url_citee, url_clippee, slug, clipping_contenu }` (+ optionnels `raw, date_fournie, date_corrigee, corrections, alerte{niveau,texte}, clipping_meta`). `fiabilite ∈ {confirme, partiel, non_verifie}`. `alerte.niveau ∈ {corrigé, nuance, date}`.
  - `validateDraftOutput(obj)` — exige `{ teamsText:string, corrections:Correction[], sources:Source[] }` (+ optionnel `soulLessonProposee:string|null`). `Correction = {niveau,titre,detail}` ; `Source = {name,url_citee,url_clippee,repli:boolean}`.
  - `validateArchiveOutput(obj)` — exige `{ archiveSteps:{t,d}[], newsletterText:string, soulVersion:string }`.

- [ ] **Step 1 : Écrire les tests**

```js
// test/contracts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVerifyOutput, validateDraftOutput, validateArchiveOutput } from '../lib/contracts.mjs';

const topic = {
  key: 'glm', sujet: 'GLM-5.2', date_reelle: '2026-06-13', fiabilite: 'confirme',
  faits: ['open weights MIT'], source: 'Z.ai Blog', url_citee: 'https://z.ai/blog/glm-5.2',
  url_clippee: 'https://z.ai/blog/glm-5.2', slug: 'glm-5-2', clipping_contenu: '...'
};

test('verify ok', () => assert.equal(validateVerifyOutput({ topics: [topic] }).ok, true));
test('verify rejette topics absent', () => assert.equal(validateVerifyOutput({}).ok, false));
test('verify rejette fiabilite invalide', () =>
  assert.equal(validateVerifyOutput({ topics: [{ ...topic, fiabilite: 'oui' }] }).ok, false));
test('verify rejette champ requis manquant', () => {
  const { slug, ...sansSlug } = topic;
  assert.equal(validateVerifyOutput({ topics: [sansSlug] }).ok, false);
});
test('verify rejette alerte.niveau invalide', () =>
  assert.equal(validateVerifyOutput({ topics: [{ ...topic, alerte: { niveau: 'x', texte: 'y' } }] }).ok, false));

test('draft ok', () => assert.equal(validateDraftOutput({
  teamsText: '...', corrections: [{ niveau: 'corrigé', titre: 't', detail: 'd' }],
  sources: [{ name: 'Z.ai', url_citee: 'u', url_clippee: 'u', repli: false }]
}).ok, true));
test('draft rejette teamsText vide', () =>
  assert.equal(validateDraftOutput({ teamsText: '', corrections: [], sources: [] }).ok, false));

test('archive ok', () => assert.equal(validateArchiveOutput({
  archiveSteps: [{ t: 'Note', d: 'raw/notes/x.md' }], newsletterText: '...', soulVersion: 'v9'
}).ok, true));
test('archive rejette archiveSteps non tableau', () =>
  assert.equal(validateArchiveOutput({ archiveSteps: 'x', newsletterText: 'y', soulVersion: 'v9' }).ok, false));
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/contracts.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/contracts.mjs**

```js
const FIABILITE = ['confirme', 'partiel', 'non_verifie'];
const NIVEAUX = ['corrigé', 'nuance', 'date'];
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isArr = (v) => Array.isArray(v);

function fail(errors) { return { ok: false, errors }; }
function ok(value) { return { ok: true, value }; }

function checkTopic(t, i, errors) {
  const req = ['key', 'sujet', 'date_reelle', 'fiabilite', 'source', 'url_citee', 'url_clippee', 'slug', 'clipping_contenu'];
  for (const k of req) if (!isStr(t?.[k])) errors.push(`topics[${i}].${k} requis`);
  if (!isArr(t?.faits)) errors.push(`topics[${i}].faits doit être un tableau`);
  if (t && !FIABILITE.includes(t.fiabilite)) errors.push(`topics[${i}].fiabilite invalide`);
  if (t?.alerte != null) {
    if (typeof t.alerte !== 'object' || !NIVEAUX.includes(t.alerte.niveau) || !isStr(t.alerte.texte)) {
      errors.push(`topics[${i}].alerte invalide`);
    }
  }
}

export function validateVerifyOutput(obj) {
  const errors = [];
  if (!obj || !isArr(obj.topics)) return fail(['topics doit être un tableau']);
  obj.topics.forEach((t, i) => checkTopic(t, i, errors));
  return errors.length ? fail(errors) : ok(obj);
}

export function validateDraftOutput(obj) {
  const errors = [];
  if (!isStr(obj?.teamsText)) errors.push('teamsText requis (non vide)');
  if (!isArr(obj?.corrections)) errors.push('corrections doit être un tableau');
  else obj.corrections.forEach((c, i) => {
    if (!NIVEAUX.includes(c?.niveau) || !isStr(c?.titre) || !isStr(c?.detail)) errors.push(`corrections[${i}] invalide`);
  });
  if (!isArr(obj?.sources)) errors.push('sources doit être un tableau');
  else obj.sources.forEach((s, i) => {
    if (!isStr(s?.name) || !isStr(s?.url_citee) || !isStr(s?.url_clippee) || typeof s?.repli !== 'boolean') {
      errors.push(`sources[${i}] invalide`);
    }
  });
  if (obj?.soulLessonProposee != null && typeof obj.soulLessonProposee !== 'string') errors.push('soulLessonProposee invalide');
  return errors.length ? fail(errors) : ok(obj);
}

export function validateArchiveOutput(obj) {
  const errors = [];
  if (!isArr(obj?.archiveSteps)) errors.push('archiveSteps doit être un tableau');
  else obj.archiveSteps.forEach((a, i) => {
    if (!isStr(a?.t) || !isStr(a?.d)) errors.push(`archiveSteps[${i}] invalide`);
  });
  if (!isStr(obj?.newsletterText)) errors.push('newsletterText requis');
  if (!isStr(obj?.soulVersion)) errors.push('soulVersion requis');
  return errors.length ? fail(errors) : ok(obj);
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/contracts.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/contracts.mjs test/contracts.test.mjs
git commit -m "feat(moteur): contrats de validation des sorties JSON"
```

---

## Task 4 : Parsing du flux (bloc JSON final + sentinelles de progression)

**Files:**
- Create: `lib/parse-result.mjs`
- Test: `test/parse-result.test.mjs`

**Interfaces:**
- Produces:
  - `extractJsonBlock(text) -> object` (lève `Error('aucun bloc JSON')` si absent/illisible). Prend le **dernier** bloc ` ```json … ``` ` ; à défaut, tente `JSON.parse` du texte entier.
  - `parseSentinels(text) -> Event[]` où `Event` ∈ `{type:'topic-detected', key, sujet}` | `{type:'topic-progress', key, step}` | `{type:'topic-done', key}` | `{type:'topic-error', key, error}`. Format de ligne : `«BREVES» topic <key> | <sujet>`, `«BREVES» step <key> <step>`, `«BREVES» done <key>`, `«BREVES» error <key> | <message>`. `step ∈ {recherche, faits, date, source, article}`.

- [ ] **Step 1 : Écrire les tests**

```js
// test/parse-result.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonBlock, parseSentinels } from '../lib/parse-result.mjs';

test('extrait le dernier bloc json fencé', () => {
  const t = 'blabla\n```json\n{"a":1}\n```\ntexte\n```json\n{"topics":[]}\n```\n';
  assert.deepEqual(extractJsonBlock(t), { topics: [] });
});
test('fallback parse du texte entier', () => {
  assert.deepEqual(extractJsonBlock('{"ok":true}'), { ok: true });
});
test('lève si aucun json', () => {
  assert.throws(() => extractJsonBlock('pas de json ici'), /aucun bloc JSON/);
});
test('parse les sentinelles dans l’ordre', () => {
  const t = [
    '«BREVES» topic glm | GLM-5.2 sort',
    'bruit intermédiaire',
    '«BREVES» step glm source',
    '«BREVES» done glm',
    '«BREVES» error mj | source inaccessible',
  ].join('\n');
  assert.deepEqual(parseSentinels(t), [
    { type: 'topic-detected', key: 'glm', sujet: 'GLM-5.2 sort' },
    { type: 'topic-progress', key: 'glm', step: 'source' },
    { type: 'topic-done', key: 'glm' },
    { type: 'topic-error', key: 'mj', error: 'source inaccessible' },
  ]);
});
test('ignore un step inconnu', () => {
  assert.deepEqual(parseSentinels('«BREVES» step glm bidon'), []);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/parse-result.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/parse-result.mjs**

```js
const STEPS = ['recherche', 'faits', 'date', 'source', 'article'];

export function extractJsonBlock(text) {
  const s = String(text);
  const fences = [...s.matchAll(/```json\s*([\s\S]*?)```/gi)];
  if (fences.length) {
    try { return JSON.parse(fences[fences.length - 1][1].trim()); } catch { /* tombe au fallback */ }
  }
  try { return JSON.parse(s.trim()); } catch { /* rien */ }
  throw new Error('aucun bloc JSON');
}

export function parseSentinels(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('«BREVES»')) continue;
    const rest = line.slice('«BREVES»'.length).trim();
    let m;
    if ((m = rest.match(/^topic\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-detected', key: m[1], sujet: m[2].trim() });
    } else if ((m = rest.match(/^step\s+(\S+)\s+(\S+)$/))) {
      if (STEPS.includes(m[2])) out.push({ type: 'topic-progress', key: m[1], step: m[2] });
    } else if ((m = rest.match(/^done\s+(\S+)$/))) {
      out.push({ type: 'topic-done', key: m[1] });
    } else if ((m = rest.match(/^error\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-error', key: m[1], error: m[2].trim() });
    }
  }
  return out;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/parse-result.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/parse-result.mjs test/parse-result.test.mjs
git commit -m "feat(moteur): parsing bloc JSON + sentinelles de progression"
```

---

## Task 5 : Runner sur le Claude Agent SDK (streaming + parsing)

**Files:**
- Create: `lib/runner.mjs`
- Test: `test/runner.test.mjs`

**Interfaces:**
- Consumes : `buildPrompt` (Task 2), `validateInputs` (Task 2), `extractJsonBlock` + `parseSentinels` (Task 4), `validateVerifyOutput/DraftOutput/ArchiveOutput` (Task 3).
- Produces :
  - `runSkill({ skill, inputs, bbDir, onEvent, query }) -> Promise<{ ok:true, value } | { ok:false, error }>`
  - `query` est **injectable** (défaut = `query` du SDK) pour tester sans réseau. Le runner itère le flux, appelle `onEvent(event)` pour chaque sentinelle vue dans les messages `assistant`, et à la fin extrait+valide le bloc JSON du `result`. La validation de sortie est choisie selon `skill`.
  - `onEvent` reçoit aussi `{type:'result-error', error}` si le JSON final est absent/invalide.

**Note streaming (honnêteté technique) :** en fan-out headless, les étapes internes des sous-agents ne sont pas toutes observables en direct. Le runner ne fabrique donc PAS de progression : il n'émet que les sentinelles réellement présentes dans le flux (`topic-detected`/`topic-progress`/`topic-done`/`topic-error`). Les sous-commandes (Tasks 7-10) émettent ces sentinelles aux frontières réelles qu'elles contrôlent. Une étape jamais signalée reste « à faire » côté UI — conforme à la décision « jalons réels, pas de fausse animation ».

- [ ] **Step 1 : Écrire les tests** (avec un faux `query` async-generator)

```js
// test/runner.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSkill } from '../lib/runner.mjs';

// Fabrique un faux query() du SDK : émet des messages assistant puis un result.
function fakeQuery(messages) {
  return async function* () { for (const m of messages) yield m; };
}
const asst = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const result = (text) => ({ type: 'result', subtype: 'success', is_error: false, result: text });

test('runSkill verify : émet les events et renvoie la valeur validée', async () => {
  const events = [];
  const stream = [
    asst('«BREVES» topic glm | GLM-5.2'),
    asst('«BREVES» step glm source'),
    asst('«BREVES» done glm'),
    result('```json\n{"topics":[{"key":"glm","sujet":"GLM-5.2","date_reelle":"2026-06-13","fiabilite":"confirme","faits":["x"],"source":"Z.ai","url_citee":"u","url_clippee":"u","slug":"glm","clipping_contenu":"c"}]}\n```'),
  ];
  const r = await runSkill({
    skill: 'breves-verify', inputs: { sujets: 'GLM-5.2' }, bbDir: '/tmp/bb',
    onEvent: (e) => events.push(e), query: fakeQuery(stream),
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.topics[0].key, 'glm');
  assert.deepEqual(events.map((e) => e.type), ['topic-detected', 'topic-progress', 'topic-done']);
});

test('runSkill rejette des inputs invalides sans appeler query', async () => {
  let called = false;
  const r = await runSkill({
    skill: 'breves-verify', inputs: { sujets: '   ' }, bbDir: '/tmp/bb',
    onEvent: () => {}, query: () => { called = true; return (async function* () {})(); },
  });
  assert.equal(r.ok, false);
  assert.equal(called, false);
});

test('runSkill signale un JSON final invalide', async () => {
  const events = [];
  const r = await runSkill({
    skill: 'breves-draft', inputs: { topics: [] }, bbDir: '/tmp/bb',
    onEvent: (e) => events.push(e),
    query: fakeQuery([result('pas de json')]),
  });
  assert.equal(r.ok, false);
  assert.ok(events.some((e) => e.type === 'result-error'));
});

test('runSkill remonte un échec SDK (result is_error)', async () => {
  const r = await runSkill({
    skill: 'breves-draft', inputs: { topics: [] }, bbDir: '/tmp/bb',
    onEvent: () => {},
    query: fakeQuery([{ type: 'result', subtype: 'error', is_error: true, result: 'boom' }]),
  });
  assert.equal(r.ok, false);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run: `node --test test/runner.test.mjs`
Expected: FAIL (module manquant)

- [ ] **Step 3 : Créer lib/runner.mjs**

```js
import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';
import { validateInputs, buildPrompt } from './command-inputs.mjs';
import { extractJsonBlock, parseSentinels } from './parse-result.mjs';
import { validateVerifyOutput, validateDraftOutput, validateArchiveOutput } from './contracts.mjs';

const VALIDATORS = {
  'breves-verify': validateVerifyOutput,
  'breves-draft': validateDraftOutput,
  'breves-archive': validateArchiveOutput,
};

function textOf(message) {
  const content = message?.message?.content;
  if (Array.isArray(content)) return content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
  return typeof content === 'string' ? content : '';
}

export async function runSkill({ skill, inputs, bbDir, onEvent = () => {}, query = sdkQuery }) {
  const v = validateInputs(skill, inputs);
  if (!v.ok) return { ok: false, error: `inputs invalides: ${v.errors.join('; ')}` };

  let prompt;
  try { prompt = buildPrompt(skill, inputs); } catch (e) { return { ok: false, error: e.message }; }

  let finalText = '';
  let sdkOk = false;
  try {
    for await (const m of query({ prompt, options: { cwd: bbDir, permissionMode: 'bypassPermissions' } })) {
      if (m.type === 'assistant') {
        for (const ev of parseSentinels(textOf(m))) onEvent(ev);
      } else if (m.type === 'result') {
        finalText = m.result ?? '';
        sdkOk = m.subtype === 'success' && !m.is_error;
      }
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (!sdkOk) return { ok: false, error: finalText || 'échec du skill' };

  let parsed;
  try { parsed = extractJsonBlock(finalText); }
  catch (e) { onEvent({ type: 'result-error', error: e.message }); return { ok: false, error: e.message }; }

  const validate = VALIDATORS[skill];
  const out = validate(parsed);
  if (!out.ok) { onEvent({ type: 'result-error', error: out.errors.join('; ') }); return { ok: false, error: out.errors.join('; ') }; }
  return { ok: true, value: out.value };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run: `node --test test/runner.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5 : Commit**

```bash
git add lib/runner.mjs test/runner.test.mjs
git commit -m "feat(moteur): runner Agent SDK (streaming sentinelles + parsing/validation)"
```

---

## Task 6 : Lecteurs filesystem (SOUL + éditions)

**Files:**
- Create: `lib/soul.mjs`, `lib/editions.mjs`, `test/fixtures/SOUL.sample.md`, `test/fixtures/note.sample.md`
- Test: `test/soul.test.mjs`, `test/editions.test.mjs`

**Interfaces:**
- Produces :
  - `readSoul(bbDir) -> { version, rules:string[], examples:{date,text}[], lessons:{date,text}[] }`. Lit `<bbDir>/.claude/breves-ia/SOUL.md`. `version` = `'v' + (1 + nb de lignes-leçons datées du §6)` ; si §6 vide (« première édition »), `version='v1'`.
  - `listEditions(bbDir) -> { range, file, date, count, corr }[]` triées du plus récent au plus ancien. Lit `<bbDir>/raw/notes/*-breves-ia-merim.md` ; `date` = préfixe `YYYY-MM-DD` du nom de fichier ; `count` = nb de blocs date (`— … —`) ; `corr` = 0 par défaut (placeholder enrichi en Plan B). Répertoire absent => `[]`.

- [ ] **Step 1 : Créer les fixtures**

`test/fixtures/SOUL.sample.md` — copie réduite de la vraie SOUL avec un §6 contenant 2 lignes-leçons datées :

```markdown
## 4. Lignes rouges
- Jamais d'invention.
- Pas de jargon non explicité.

## 5. Échantillons vivants (fenêtre glissante)
### [2026-06-17] seed: false | épinglé: non
**Midjourney se lance dans le scan corporel.** Oui, le générateur d'images.

## 6. Journal d'évolution
- (2026-06-17) Vérifier le sens d'un verbe-clé (« brevète » ≠ « open source »).
- (2026-06-06) Garder la parenthèse courte : une remarque, pas deux.
```

`test/fixtures/note.sample.md` :

```markdown
# Brèves IA — édition Merim (PM)

— 12 juin —
Texte A.
https://example.com/a

— 13 juin —
Texte B.
https://example.com/b
```

- [ ] **Step 2 : Écrire les tests**

```js
// test/soul.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readSoul } from '../lib/soul.mjs';

function bbWithSoul(content) {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  mkdirSync(join(bb, '.claude', 'breves-ia'), { recursive: true });
  if (content == null) copyFileSync(new URL('./fixtures/SOUL.sample.md', import.meta.url), join(bb, '.claude', 'breves-ia', 'SOUL.md'));
  else writeFileSync(join(bb, '.claude', 'breves-ia', 'SOUL.md'), content);
  return bb;
}

test('version = v3 quand 2 leçons datées', () => {
  const s = readSoul(bbWithSoul(null));
  assert.equal(s.version, 'v3');
  assert.equal(s.rules.length, 2);
  assert.equal(s.examples.length, 1);
  assert.equal(s.lessons.length, 2);
});
test('version = v1 quand journal vide', () => {
  const s = readSoul(bbWithSoul('## 6. Journal d\'évolution\n- (vide — première édition)\n'));
  assert.equal(s.version, 'v1');
});
```

```js
// test/editions.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listEditions } from '../lib/editions.mjs';

test('liste triée + count des blocs date', () => {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  const notes = join(bb, 'raw', 'notes');
  mkdirSync(notes, { recursive: true });
  copyFileSync(new URL('./fixtures/note.sample.md', import.meta.url), join(notes, '2026-06-17-breves-ia-merim.md'));
  copyFileSync(new URL('./fixtures/note.sample.md', import.meta.url), join(notes, '2026-06-06-breves-ia-merim.md'));
  const eds = listEditions(bb);
  assert.equal(eds.length, 2);
  assert.equal(eds[0].date, '2026-06-17'); // plus récent d'abord
  assert.equal(eds[0].count, 2);
});
test('répertoire absent => []', () => {
  const bb = mkdtempSync(join(tmpdir(), 'bb-'));
  assert.deepEqual(listEditions(bb), []);
});
```

- [ ] **Step 3 : Lancer, vérifier l'échec**

Run: `node --test test/soul.test.mjs test/editions.test.mjs`
Expected: FAIL (modules manquants)

- [ ] **Step 4 : Créer lib/soul.mjs**

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function section(md, n) {
  // découpe sur les titres `## ` ; chaque part commence par « N. Titre\n… » et s'arrête
  // au titre suivant (évite \Z, non supporté en JS).
  for (const part of md.split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) return part;
  }
  return '';
}
const datedLessons = (txt) => [...txt.matchAll(/^-\s*\((\d{4}-\d{2}-\d{2})\)\s*(.+)$/gm)]
  .map((m) => ({ date: m[1], text: m[2].trim() }));

export function readSoul(bbDir) {
  const md = readFileSync(join(bbDir, '.claude', 'breves-ia', 'SOUL.md'), 'utf8');
  const rules = [...section(md, 4).matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
  const examples = [...section(md, 5).matchAll(/^###\s*\[(\d{4}-\d{2}-\d{2})\][^\n]*\n([^\n]+)/gm)]
    .map((m) => ({ date: m[1], text: m[2].trim() }));
  const lessons = datedLessons(section(md, 6));
  return { version: `v${lessons.length + 1}`, rules, examples, lessons };
}
```

- [ ] **Step 5 : Créer lib/editions.mjs**

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function listEditions(bbDir) {
  const dir = join(bbDir, 'raw', 'notes');
  let files;
  try { files = readdirSync(dir); } catch { return []; }
  return files
    .filter((f) => /^\d{4}-\d{2}-\d{2}-breves-ia-merim\.md$/.test(f))
    .map((file) => {
      const date = file.slice(0, 10);
      const md = readFileSync(join(dir, file), 'utf8');
      const count = (md.match(/^—\s.+\s—$/gm) || []).length;
      return { file, date, range: date, count, corr: 0 };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
```

- [ ] **Step 6 : Lancer, vérifier le succès**

Run: `node --test test/soul.test.mjs test/editions.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 7 : Commit**

```bash
git add lib/soul.mjs lib/editions.mjs test/soul.test.mjs test/editions.test.mjs test/fixtures/
git commit -m "feat(moteur): lecteurs SOUL (version) + éditions archivées"
```

---

## Task 7 : Snippet partagé « brief enquêteur » + sous-commande `/breves-verify`

**Files:**
- Create: `BoilingBrain/.claude/breves-ia/_brief-enqueteur.md`, `BoilingBrain/.claude/commands/breves-verify.md`

**Interfaces:**
- Produces : commande `/breves-verify` qui, sur `INPUTS {sujets}`, exécute la Phase 1 d'origine et termine par le JSON `validateVerifyOutput`. Émet les sentinelles `«BREVES» topic|step|done|error`.

**Note :** ces artefacts sont du markdown (prompt), non couverts par `node --test`. La vérification est : (a) shape JSON conforme à `lib/contracts.mjs`, (b) smoke manuel via `scripts/breves-cli.mjs` (Task 11).

- [ ] **Step 1 : Créer le brief partagé** `BoilingBrain/.claude/breves-ia/_brief-enqueteur.md` — extraire **verbatim** le brief de sous-agent de `breves-ia.md` (lignes 18-38 : « Vérifie ce sujet… » jusqu'au bloc de réponse), pour qu'il soit la source unique.

- [ ] **Step 2 : Créer `BoilingBrain/.claude/commands/breves-verify.md`**

````markdown
---
description: (interne, piloté par l'UI) Phase 1 des brèves IA — fan-out de vérification, renvoie un JSON structuré. Ne pose aucune question.
---

# /breves-verify

Tu exécutes la **Phase 1** des brèves IA (vérification), en mode **non interactif**.
Entrée : un bloc `INPUTS` JSON `{ "sujets": "<texte en vrac>" }`. N'attends rien d'autre, ne pose aucune question.

Domaine : IA. Date du jour = date d'édition.

## Étapes
1. Extrais les **sujets distincts** du texte. Pour chacun, choisis une `key` courte en kebab-case.
   Émets immédiatement, une ligne par sujet : `«BREVES» topic <key> | <libellé court>`
2. Si **plus de 15 sujets**, n'en traite que les 15 premiers et ajoute `"avertissement_lot": true` au JSON final.
3. Dispatche **en parallèle un sous-agent `general-purpose` par sujet** (un seul message, plusieurs `Agent`).
   Brief de chaque sous-agent : **lis et applique `.claude/breves-ia/_brief-enqueteur.md`** (source unique).
4. À mesure que tu franchis une frontière réelle pour un sujet, émets le jalon correspondant :
   `«BREVES» step <key> source` (source retenue), `«BREVES» step <key> article` (contenu récupéré).
   Quand un sujet est entièrement traité : `«BREVES» done <key>`. En cas d'échec irrécupérable : `«BREVES» error <key> | <message>`.

## Garde-fous (identiques à /breves-ia)
- Aucune invention : `fiabilite: non_verifie` si non confirmé.
- Repli source auto si paywall/403/timeout, URL citée d'origine conservée, repli signalé.
- N'écris RIEN dans `raw/`. Ne rédige PAS les brèves.

## Sortie (et UNIQUEMENT ça, en dernier)
Un bloc ```json``` :
```json
{ "topics": [ {
  "key": "...", "sujet": "...", "raw": "<énoncé d'origine>",
  "date_reelle": "YYYY-MM-DD", "date_fournie": "YYYY-MM-DD|aucune", "date_corrigee": false,
  "fiabilite": "confirme|partiel|non_verifie",
  "faits": ["..."], "corrections": "<écarts ou 'aucune'>",
  "alerte": { "niveau": "corrigé|nuance|date", "texte": "..." },
  "source": "<publication>", "url_citee": "...", "url_clippee": "...",
  "clipping_meta": "publication — auteur — date", "slug": "kebab-sans-date",
  "clipping_contenu": "<markdown fidèle, sans pub ni navigation>"
} ] }
```
Omets `alerte` s'il n'y a ni correction ni nuance.
````

- [ ] **Step 3 : Vérifier la cohérence de forme** — relire que les clés du bloc JSON correspondent exactement à `validateVerifyOutput` (Task 3) : `key, sujet, date_reelle, fiabilite, faits, source, url_citee, url_clippee, slug, clipping_contenu` requis ; `alerte.niveau ∈ {corrigé,nuance,date}`.

- [ ] **Step 4 : Commit (dans le repo BoilingBrain)**

```bash
cd /Users/pleguern/Workspace/BoilingBrain
git add .claude/breves-ia/_brief-enqueteur.md .claude/commands/breves-verify.md
git commit -m "feat(breves): sous-commande /breves-verify + brief enquêteur partagé"
```

---

## Task 8 : Sous-commande `/breves-draft`

**Files:**
- Create: `BoilingBrain/.claude/commands/breves-draft.md`

**Interfaces:**
- Produces : `/breves-draft` qui, sur `INPUTS {topics, feedback?}`, lit la SOUL, rédige, et renvoie le JSON `validateDraftOutput`.

- [ ] **Step 1 : Créer `BoilingBrain/.claude/commands/breves-draft.md`**

````markdown
---
description: (interne, piloté par l'UI) Phase 2 des brèves IA — rédaction dans la plume (SOUL), renvoie un JSON. Ne pose aucune question.
---

# /breves-draft

Tu exécutes la **Phase 2** (rédaction), en mode **non interactif**.
Entrée : `INPUTS` JSON `{ "topics": [<résultats de /breves-verify>], "feedback": "<optionnel>" }`.

## Étapes
1. **Lis `.claude/breves-ia/SOUL.md`** et incarne-la (voix §3, lignes rouges §4, exemples §5).
2. Rédige chaque brève dans la plume de Pierre. **Regroupe par `date_reelle`**, ordre chronologique.
   Une brève `non_verifie` est signalée comme telle, jamais affirmée. **Zéro tiret cadratin** dans le texte.
3. Format `teamsText` (prêt à coller Teams) : titres `— <date en toutes lettres> —`, accroche en gras,
   puis l'URL nue de la source sur sa propre ligne.
4. Si `feedback` est présent : applique la correction demandée au draft, et **déduis une éventuelle règle de
   style** → `soulLessonProposee` (sinon `null`).

## Garde-fous
- Aucune invention ; le factuel prime ; pas de jargon non explicité.
- N'écris RIEN dans `raw/`, ne touche pas à la SOUL (l'archivage s'en charge).

## Sortie (UNIQUEMENT, en dernier)
```json
{
  "teamsText": "<prêt-à-coller>",
  "corrections": [ { "niveau": "corrigé|date|nuance", "titre": "...", "detail": "..." } ],
  "sources": [ { "name": "...", "url_citee": "...", "url_clippee": "...", "repli": false } ],
  "soulLessonProposee": null
}
```
Déduis `corrections` et `sources` des `topics` reçus (un `source` par topic ; `repli=true` si `url_clippee ≠ url_citee`).
````

- [ ] **Step 2 : Vérifier la cohérence de forme** vs `validateDraftOutput` (Task 3) : `teamsText` non vide ; `corrections[].niveau ∈ {corrigé,date,nuance}` ; `sources[]` avec `name,url_citee,url_clippee,repli:boolean`.

- [ ] **Step 3 : Commit (repo BoilingBrain)**

```bash
cd /Users/pleguern/Workspace/BoilingBrain
git add .claude/commands/breves-draft.md
git commit -m "feat(breves): sous-commande /breves-draft"
```

---

## Task 9 : Snippet « archive » partagé + sous-commande `/breves-archive`

**Files:**
- Create: `BoilingBrain/.claude/breves-ia/_archive.md`, `BoilingBrain/.claude/commands/breves-archive.md`

**Interfaces:**
- Produces : `/breves-archive` qui, sur `INPUTS {teamsText, topics, sources, leconSOUL?}`, dépose note + clippings, met à jour la SOUL, ingère, et renvoie `validateArchiveOutput`.

- [ ] **Step 1 : Créer le snippet partagé** `BoilingBrain/.claude/breves-ia/_archive.md` — extraire **verbatim** la Phase 3 de `breves-ia.md` (lignes 53-56 : dépôt note, dépôt clippings avec règles de saut `non_verifie`, MAJ SOUL §5/§6, ingest).

- [ ] **Step 2 : Créer `BoilingBrain/.claude/commands/breves-archive.md`**

````markdown
---
description: (interne, piloté par l'UI) Phase 3 des brèves IA — clip + note + MAJ SOUL + ingest. Ne pose aucune question.
---

# /breves-archive

Tu exécutes la **Phase 3** (archivage), en mode **non interactif**, APRÈS validation humaine côté UI.
Entrée : `INPUTS` JSON `{ "teamsText", "topics", "sources", "leconSOUL": "<optionnel>" }`.

## Procédure
**Applique `.claude/breves-ia/_archive.md`** (source unique), avec ces précisions :
- Note : `drop_to_raw('notes', 'YYYY-MM-DD-breves-ia-merim.md', <contenu>)` = en-tête de contexte
  (« Brèves IA — édition Merim (PM) », date, 1 ligne de cadrage) + `teamsText` + sources.
- Un clipping par topic : `drop_to_raw('clippings', 'YYYY-MM-DD-<slug>.md', <contenu>)`.
  Si `fiabilite=non_verifie` ou repli épuisé : **ne clippe pas**, garde l'URL dans la note, signale-le.
- **MAJ SOUL §5** : insère la/les brève(s) validée(s) en tête de la fenêtre glissante (FIFO 3 hors épinglés).
- Si `leconSOUL` présent : ajoute une ligne datée `- (YYYY-MM-DD) <leconSOUL>` au **§6 Journal d'évolution**.
- Enchaîne l'**ingestion** : invoque la skill `/ingest`.

## Garde-fous
- `raw/` immutable : écris uniquement via `drop_to_raw`. La SOUL n'est jamais dans `raw/`.
- Slugs kebab-case datés.

## Sortie (UNIQUEMENT, en dernier)
```json
{
  "archiveSteps": [
    { "t": "Newsletter enregistrée", "d": "raw/notes/YYYY-MM-DD-breves-ia-merim.md" },
    { "t": "N clippings archivés", "d": "raw/clippings/" },
    { "t": "SOUL mise à jour", "d": "vX → vY · +K leçon(s)" },
    { "t": "Intégré au wiki personnel", "d": "llm-wiki" }
  ],
  "newsletterText": "<copie finale prête à coller>",
  "soulVersion": "vY"
}
```
````

- [ ] **Step 3 : Vérifier la cohérence de forme** vs `validateArchiveOutput` (Task 3).

- [ ] **Step 4 : Commit (repo BoilingBrain)**

```bash
cd /Users/pleguern/Workspace/BoilingBrain
git add .claude/breves-ia/_archive.md .claude/commands/breves-archive.md
git commit -m "feat(breves): sous-commande /breves-archive + snippet d'archive partagé"
```

---

## Task 10 : Refactor de `/breves-ia` vers les snippets partagés (anti-duplication)

**Files:**
- Modify: `BoilingBrain/.claude/commands/breves-ia.md`

**Objectif :** supprimer la duplication : `/breves-ia` (interactif, terminal) doit pointer vers `_brief-enqueteur.md` et `_archive.md` au lieu de réinscrire ces blocs, **sans changer son comportement** (il garde ses 2 gates `AskUserQuestion`).

- [ ] **Step 1 : Modifier la Phase 1** — remplacer le brief inline (lignes ~16-38) par : « Donne à chaque sous-agent le brief de `.claude/breves-ia/_brief-enqueteur.md`. »

- [ ] **Step 2 : Modifier la Phase 3** — remplacer les étapes inline (lignes ~53-56) par : « Applique `.claude/breves-ia/_archive.md`. » (les gates `AskUserQuestion` de Phase 2 restent inchangés).

- [ ] **Step 3 : Relecture diff** — vérifier qu'aucun garde-fou ni gate n'a disparu ; seuls les blocs dupliqués sont remplacés par une référence.

- [ ] **Step 4 : Commit (repo BoilingBrain)**

```bash
cd /Users/pleguern/Workspace/BoilingBrain
git add .claude/commands/breves-ia.md
git commit -m "refactor(breves): /breves-ia pointe les snippets partagés (DRY)"
```

---

## Task 11 : Driver terminal + smoke bout-en-bout

**Files:**
- Create: `scripts/breves-cli.mjs`
- Modify: `package.json` (script `breves`)

**Interfaces:**
- Consumes : `runSkill` (Task 5), `loadEngineConfig` (Task 1), `loadEnvFile` (Task 1).
- Produces : `node scripts/breves-cli.mjs verify "<sujets>"` (et `draft`/`archive` lisant un JSON sur stdin) — affiche les events au fil de l'eau et le JSON final. Permet le smoke réel (avec réseau/SDK).

- [ ] **Step 1 : Créer scripts/breves-cli.mjs**

```js
import { runSkill } from '../lib/runner.mjs';
import { loadEngineConfig } from '../lib/config.mjs';
import { loadEnvFile } from '../lib/load-env.mjs';

loadEnvFile();
const { bbDir } = loadEngineConfig();
const [, , skillShort, arg] = process.argv;
const SKILL = { verify: 'breves-verify', draft: 'breves-draft', archive: 'breves-archive' }[skillShort];
if (!SKILL) { console.error('usage: breves-cli <verify|draft|archive> [arg]'); process.exit(1); }

async function readStdin() {
  let data = ''; for await (const c of process.stdin) data += c; return data.trim();
}

const inputs = SKILL === 'breves-verify'
  ? { sujets: arg ?? await readStdin() }
  : JSON.parse(await readStdin());

const r = await runSkill({
  skill: SKILL, inputs, bbDir,
  onEvent: (e) => console.error('·', JSON.stringify(e)),
});
if (!r.ok) { console.error('ÉCHEC:', r.error); process.exit(1); }
console.log(JSON.stringify(r.value, null, 2));
```

- [ ] **Step 2 : Ajouter le script** dans `package.json` : `"breves": "node scripts/breves-cli.mjs"`.

- [ ] **Step 3 : Smoke réel verify** (nécessite l'auth Claude locale + réseau)

Run: `node scripts/breves-cli.mjs verify "GLM 5.2 modèle chinois open source 753B"`
Expected: des lignes `· {"type":"topic-detected",...}` puis un JSON `{ "topics": [...] }` conforme. Vérifier à l'œil : date trouvée, source officielle, `fiabilite`, pas d'invention.

- [ ] **Step 4 : Smoke réel draft** (réutilise la sortie de Step 3)

```bash
# 1) capture la sortie verify (le JSON va sur stdout, les events sur stderr)
node scripts/breves-cli.mjs verify "GLM 5.2 modèle chinois open source 753B" > /tmp/verify.json
# 2) draft lit le JSON {topics:[...]} sur stdin
node scripts/breves-cli.mjs draft < /tmp/verify.json
```
Expected: `teamsText` groupé par date, **zéro tiret cadratin**, `corrections`/`sources` cohérents avec les topics.

- [ ] **Step 5 : Vérifier la suite complète**

Run: `npm test`
Expected: tous les tests `node --test` PASS (config, command-inputs, contracts, parse-result, runner, soul, editions).

- [ ] **Step 6 : Commit**

```bash
git add scripts/breves-cli.mjs package.json
git commit -m "feat(moteur): driver CLI verify/draft/archive + smoke bout-en-bout"
```

---

## Notes de fin (handoff vers Plan B)

- À l'issue de Plan A : un moteur prouvé (sous-commandes + lib testée + CLI de smoke). Le Plan B (app Electron + port du mockup) consommera `runSkill`, `readSoul`, `listEditions` via IPC, et tranchera le framework de rendu (vanilla façon poker-suivi vs Preact).
- **Risque connu** (documenté Task 5) : la granularité des jalons dépend de ce que le flux expose réellement ; on n'anime jamais de fausse progression.
- **Smoke E2E archive** (drop_to_raw + ingest réels) : à exécuter avec prudence sur une vraie veille (écrit dans `raw/` du wiki), comme la commande d'origine.
