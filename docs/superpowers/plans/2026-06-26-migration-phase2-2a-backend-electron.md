# Migration Phase 2.2a — Backend cœur Electron (io + services + engine) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la logique backend de `lib/` (fs/SDK) et `hud/engine.mjs` en TypeScript strict sous `src/main/{io,services}` et `src/main/engine.ts`, branchée sur `domain/`+`shared/` (2.1), **sans Electron** (pas d'`ipcMain`, pas de fenêtre — c'est 2.2b) et sans changer le comportement.

**Architecture:** Couche **additive** (les `.mjs` legacy restent). Tout est testé via **injection de dépendances** (le pattern existant) : le SDK est injecté en test (jamais appelé), et chargé en **`import()` dynamique** en prod (le main Forge est CJS, le SDK est ESM — cf. spike 2.0). Les tests `runner`/`engine`/`config`/`soul`/`editions` sont **portés** (changement d'import) vers les nouveaux modules TS.

**Tech Stack:** TypeScript strict, Vitest, Zod (via 2.1), `@anthropic-ai/claude-agent-sdk` (chargé dynamiquement). Alias `@main`/`@domain`/`@shared` câblés.

## Global Constraints

- Node ≥ 20. Projet ESM (`"type": "module"`). Le main est **bundlé en CJS** par Vite (Forge) — pas de `require` statique du SDK (ESM) : **`import()` dynamique** uniquement.
- **Pas de code Electron dans 2.2a** : `src/main/io`, `src/main/services`, `src/main/engine.ts` ne doivent PAS importer `electron` (l'`ipcMain`/fenêtre = 2.2b). Ils peuvent importer `node:fs`/`node:path` (ce sont des modules main, pas le domaine pur).
- **Comportement inchangé** : ports 1:1 ; les tests portés gardent leurs assertions (changement d'import seulement, sauf `config` — voir Task 1).
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée.
- **Ne pas modifier** `lib/*.mjs` ni `hud/*` (suppression = Phase 4).
- **Aucun appel réseau ni écriture wiki réelle en test** : le SDK est toujours injecté (mock) ; `breves-archive` n'est jamais exécuté pour de vrai.
- Suite verte à chaque commit. **Lancer `npm run lint` ET `npm run typecheck` ET `npm test` à chaque tâche** (leçon 2.1 : le lint avait été oublié).
- **Carry-over 2.1** : ne JAMAIS brancher sur le *texte* des erreurs Zod (seul le flag `{ ok }` est 1:1).
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md](../specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md).

**Convention de port de test** (sauf mention contraire) : `git mv tests/<x>.test.mjs tests/main/<y>.test.mjs`, créer `tests/main/` au besoin, changer la/les ligne(s) d'import vers `@main/...`, corriger les chemins de fixtures `./fixtures/` → `../fixtures/` si le test en lit. Garder `import { test } from 'vitest'` + `node:assert/strict`.

---

### Task 1 : `main/io/env.ts` (← config.mjs + load-env.mjs)

**Files:**
- Create: `src/main/io/env.ts`
- Move: `tests/config.test.mjs` → `tests/main/env.test.mjs`
- Create (test add): bloc de tests `parseEnv`/`loadEnvFile` dans `tests/main/env.test.mjs`

**Interfaces:**
- Produces : interfaces `WikiMcp`, `EngineConfig` ; `loadEngineConfig(env?): EngineConfig`, `parseEnv(text: string): Record<string,string>`, `loadEnvFile(path?, env?): Record<string,string>`.

> **Déviation assumée** : `config.mjs` dérivait `REPO_ROOT` via `import.meta.url` (indisponible dans le bundle CJS du main). On remplace le défaut `repoDir` par **`process.cwd()`**. Le test `repoDir par défaut … endsWith('breves-ia')` reste vert (cwd sous Vitest/CLI/Forge-dev = racine du repo). L'override `BREVES_REPO_DIR` est inchangé.

- [ ] **Step 1 : Porter le test config + ajouter un test load-env**

```bash
mkdir -p tests/main
git mv tests/config.test.mjs tests/main/env.test.mjs
```
Dans `tests/main/env.test.mjs` : remplacer `import { loadEngineConfig } from '../lib/config.mjs';` par `import { loadEngineConfig, parseEnv, loadEnvFile } from '@main/io/env';`. Puis ajouter à la fin :
```js
test('parseEnv lit KEY=val, ignore # et lignes vides, retire les guillemets', () => {
  const out = parseEnv('# commentaire\nA=1\n\nB="deux"\nC=\'trois\'\nMAUVAIS');
  assert.deepEqual(out, { A: '1', B: 'deux', C: 'trois' });
});
test('loadEnvFile n\'écrase pas une variable déjà définie', () => {
  const env = { A: 'déjà' };
  const applied = loadEnvFile('/chemin/inexistant/.env', env);
  assert.deepEqual(applied, {}); // fichier absent -> no-op
  assert.equal(env.A, 'déjà');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/env.test.mjs`
Expected : FAIL — `@main/io/env` non résolu.

- [ ] **Step 3 : Écrire `src/main/io/env.ts`**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WikiMcp {
  type: 'stdio';
  command: string;
  args: string[];
}

export interface EngineConfig {
  bbDir: string;
  repoDir: string;
  wikiMcp: WikiMcp;
}

export function loadEngineConfig(env: NodeJS.ProcessEnv = process.env): EngineConfig {
  const bbDir = env.BREVES_BB_DIR || '/Users/pleguern/Workspace/BoilingBrain';
  return {
    bbDir,
    // import.meta.url indisponible dans le bundle CJS du main → cwd (racine du repo en dev/CLI/Forge)
    repoDir: env.BREVES_REPO_DIR || process.cwd(),
    wikiMcp: {
      type: 'stdio',
      command: env.BREVES_WIKI_PY || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
      args: [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
    },
  };
}

// Chargeur .env minimal (sans dépendance). Format : KEY=valeur ; # et lignes vides ignorés ; guillemets optionnels.
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Charge `path` dans `env` SANS écraser une variable déjà définie. Fichier absent → no-op.
export function loadEnvFile(path = '.env', env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const parsed = parseEnv(text);
  const applied: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (env[k] === undefined) {
      env[k] = v;
      applied[k] = v;
    }
  }
  return applied;
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/env.test.mjs` → PASS.
Run : `npm run typecheck` → exit 0. Run : `npm run lint` → exit 0. Run : `npm test` → 18 fichiers verts (config porté, +0/+2 tests load-env dans le même fichier ; compte de fichiers inchangé).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2a): main/io/env.ts (← config + load-env, repoDir via cwd) + tests portés"
```

---

### Task 2 : `main/io/soul.io.ts` (← soul.mjs)

**Files:**
- Create: `src/main/io/soul.io.ts`
- Move: `tests/soul.test.mjs` → `tests/main/soul-io.test.mjs`

**Interfaces:**
- Produces : interfaces `SoulExample`, `SoulLesson`, `SoulSummary` ; `readSoul(baseDir: string): SoulSummary`. (Résumé dashboard — distinct de `parseSoul` de `@domain/soul`.)

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/soul.test.mjs tests/main/soul-io.test.mjs
```
Remplacer `import { readSoul } from '../lib/soul.mjs';` → `import { readSoul } from '@main/io/soul.io';`. Corriger les chemins de fixtures `./fixtures/` → `../fixtures/` (ce test copie `SOUL.sample.md`).

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/soul-io.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/main/io/soul.io.ts`**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SoulExample {
  date: string;
  text: string;
}
export interface SoulLesson {
  date: string;
  text: string;
}
export interface SoulSummary {
  version: string;
  rules: string[];
  examples: SoulExample[];
  lessons: SoulLesson[];
}

function section(md: string, n: number): string {
  for (const part of md.split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) return part;
  }
  return '';
}

function datedLessons(txt: string): SoulLesson[] {
  return [...txt.matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)].map((m) => ({
    date: m[1],
    text: m[2].trim(),
  }));
}

export function readSoul(baseDir: string): SoulSummary {
  const md = readFileSync(join(baseDir, '.claude', 'breves-ia', 'SOUL.md'), 'utf8');
  const rules = [...section(md, 4).matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
  const examples = [
    ...section(md, 5).matchAll(/^###\s*\[(\d{4}-\d{2}-\d{2})\][^\n]*\n([^\n]+)/gm),
  ].map((m) => ({ date: m[1], text: m[2].trim() }));
  const lessons = datedLessons(section(md, 6));
  return { version: `v${lessons.length + 1}`, rules, examples, lessons };
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/soul-io.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (18 verts).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2a): main/io/soul.io.ts (← soul.mjs, résumé dashboard) + test porté"
```

---

### Task 3 : `main/io/editions.io.ts` (← editions.mjs)

**Files:**
- Create: `src/main/io/editions.io.ts`
- Move: `tests/editions.test.mjs` → `tests/main/editions-io.test.mjs`

**Interfaces:**
- Produces : interface `EditionSummary { file: string; date: string; range: string; count: number; corr: number; title: string }` ; `listEditions(bbDir: string): EditionSummary[]`.

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/editions.test.mjs tests/main/editions-io.test.mjs
```
Remplacer `import { listEditions } from '../lib/editions.mjs';` → `import { listEditions } from '@main/io/editions.io';`. Corriger `./fixtures/` → `../fixtures/` (ce test copie `note.sample.md`).

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/editions-io.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/main/io/editions.io.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EDITION_RE = /^(\d{4}-\d{2}-\d{2})-breves-ia-merim(?:-([a-z0-9-]+))?\.md$/;

export interface EditionSummary {
  file: string;
  date: string;
  range: string;
  count: number;
  corr: number;
  title: string;
}

function titleFromSlug(slug: string | undefined): string {
  if (!slug) return '';
  const t = slug.replace(/-/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

export function listEditions(bbDir: string): EditionSummary[] {
  const dir = join(bbDir, 'raw', 'notes');
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .map((file) => ({ file, m: file.match(EDITION_RE) }))
    .filter((x): x is { file: string; m: RegExpMatchArray } => x.m !== null)
    .map(({ file, m }) => {
      const date = m[1];
      const title = titleFromSlug(m[2]);
      const md = readFileSync(join(dir, file), 'utf8');
      const count = (md.match(/^—\s.+\s—$/gm) || []).length;
      return { file, date, range: date, count, corr: 0, title };
    })
    .sort((a, b) => (a.file < b.file ? 1 : a.file > b.file ? -1 : 0));
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/editions-io.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (18 verts).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2a): main/io/editions.io.ts (← editions.mjs) + test porté"
```

---

### Task 4 : `shared/errors.ts` + `shared/logger.ts`

**Files:**
- Create: `src/shared/errors.ts`, `src/shared/logger.ts`
- Create: `tests/shared/errors.test.mjs`

**Interfaces:**
- Produces : classe `AppError` (`message: string`, `code?: string`, `instanceof Error`) ; `logger` (`info`/`warn`/`error`, signature `(...args: unknown[]) => void`).

- [ ] **Step 1 : Écrire le test**

`tests/shared/errors.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { AppError } from '@shared/errors';

test('AppError est une Error avec message et code', () => {
  const e = new AppError('boum', 'E_BOOM');
  assert.ok(e instanceof Error);
  assert.equal(e.message, 'boum');
  assert.equal(e.code, 'E_BOOM');
  assert.equal(e.name, 'AppError');
});
test('AppError sans code', () => {
  const e = new AppError('seul');
  assert.equal(e.code, undefined);
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/shared/errors.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire les deux modules**

`src/shared/errors.ts` :
```ts
export class AppError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
```

`src/shared/logger.ts` :
```ts
// Logger unique (remplace les console.* côté main). Minimal : on garde la console comme backend.
/* eslint-disable no-console */
export const logger = {
  info: (...args: unknown[]): void => console.log(...args),
  warn: (...args: unknown[]): void => console.warn(...args),
  error: (...args: unknown[]): void => console.error(...args),
};
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/shared/errors.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → **19 fichiers verts** (nouveau fichier de test).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2a): shared/errors.ts (AppError) + shared/logger.ts"
```

---

### Task 5 : `main/services/llm.service.ts` (← runner.mjs, SDK dynamique)

**Files:**
- Create: `src/main/services/llm.service.ts`
- Move: `tests/runner.test.mjs` → `tests/main/llm.service.test.mjs`

**Interfaces:**
- Consumes : `buildPrompt` (`@shared/skills`), `validateInputs` (`@shared/schemas/inputs`), `validateVerifyOutput`/`Draft`/`Archive` (`@shared/schemas/outputs`), `extractJsonBlock`/`parseSentinels` (`@domain/edition`), `activityFromMessage` (`@domain/agents`).
- Produces : types `SdkMessage`, `QueryFn` ; `runSkill(args): Promise<RunResult>`, `runRaw(args): Promise<RunRawResult>`. Le paramètre `query` est **optionnel** : absent → SDK chargé en `import()` dynamique ; présent → utilisé tel quel (tests).

> **Changement clé vs runner.mjs** : pas d'`import { query } from '@anthropic-ai/claude-agent-sdk'` statique. Le SDK est chargé paresseusement (`loadSdkQuery`) uniquement quand aucun `query` n'est injecté. Les tests injectent toujours un faux `query` → le SDK réel n'est jamais touché.

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/runner.test.mjs tests/main/llm.service.test.mjs
```
Remplacer `import { runSkill, runRaw } from '../lib/runner.mjs';` → `import { runSkill, runRaw } from '@main/services/llm.service';`. (Pas de fixture ; assertions inchangées — tous les tests injectent `query`.)

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/llm.service.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/main/services/llm.service.ts`**

```ts
import { buildPrompt } from '@shared/skills';
import { validateInputs } from '@shared/schemas/inputs';
import {
  validateVerifyOutput,
  validateDraftOutput,
  validateArchiveOutput,
} from '@shared/schemas/outputs';
import { extractJsonBlock, parseSentinels } from '@domain/edition';
import { activityFromMessage } from '@domain/agents';

export interface SdkMessage {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  message?: { content?: unknown };
}

export interface QueryArg {
  prompt: string;
  options: Record<string, unknown>;
}

export type QueryFn = (arg: QueryArg) => AsyncIterable<SdkMessage>;

export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

export type RunResult = { ok: true; value: unknown } | { ok: false; error: string };
export type RunRawResult = { ok: boolean; text: string };

const VALIDATORS: Record<string, (obj: unknown) => { ok: true; value: unknown } | { ok: false; errors: string[] }> = {
  'breves-verify': validateVerifyOutput,
  'breves-draft': validateDraftOutput,
  'breves-archive': validateArchiveOutput,
};

let cachedQuery: QueryFn | null = null;
// Chargement paresseux du SDK (ESM) depuis le main CJS : import() dynamique uniquement en prod.
async function loadSdkQuery(): Promise<QueryFn> {
  if (!cachedQuery) {
    const sdk = (await import('@anthropic-ai/claude-agent-sdk')) as { query: QueryFn };
    cachedQuery = sdk.query;
  }
  return cachedQuery;
}

function textOf(message: SdkMessage): string {
  const content = message?.message?.content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: string; text: string } => (b as { type?: string })?.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }
  return typeof content === 'string' ? content : '';
}

export interface RunSkillArgs {
  skill: string;
  inputs: unknown;
  bbDir: string;
  onEvent?: (ev: StreamEvent) => void;
  query?: QueryFn;
  mcpServers?: Record<string, unknown>;
  agents?: Record<string, unknown>;
}

export async function runSkill({
  skill,
  inputs,
  bbDir,
  onEvent = () => {},
  query,
  mcpServers,
  agents,
}: RunSkillArgs): Promise<RunResult> {
  const v = validateInputs(skill, inputs);
  if (!v.ok) return { ok: false, error: `inputs invalides: ${v.errors.join('; ')}` };

  let prompt: string;
  try {
    prompt = buildPrompt(skill, inputs);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const q = query ?? (await loadSdkQuery());
  let finalText = '';
  let sdkOk = false;
  const options: Record<string, unknown> = {
    cwd: bbDir,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };
  if (mcpServers) options.mcpServers = mcpServers;
  if (agents) options.agents = agents;
  try {
    for await (const m of q({ prompt, options })) {
      if (m.type === 'assistant') {
        for (const ev of parseSentinels(textOf(m))) onEvent(ev);
        for (const ev of activityFromMessage(m)) onEvent(ev);
      } else if (m.type === 'result') {
        finalText = m.result ?? '';
        sdkOk = m.subtype === 'success' && !m.is_error;
      }
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!sdkOk) return { ok: false, error: finalText || 'échec du skill' };

  let parsed: unknown;
  try {
    parsed = extractJsonBlock(finalText);
  } catch (e) {
    onEvent({ type: 'result-error', error: (e as Error).message });
    return { ok: false, error: (e as Error).message };
  }

  const validate = VALIDATORS[skill];
  const out = validate(parsed);
  if (!out.ok) {
    onEvent({ type: 'result-error', error: out.errors.join('; ') });
    return { ok: false, error: out.errors.join('; ') };
  }
  return { ok: true, value: out.value };
}

export interface RunRawArgs {
  prompt: string;
  cwd: string;
  onEvent?: (ev: StreamEvent) => void;
  query?: QueryFn;
  mcpServers?: Record<string, unknown>;
  agents?: Record<string, unknown>;
}

export async function runRaw({
  prompt,
  cwd,
  onEvent = () => {},
  query,
  mcpServers,
  agents,
}: RunRawArgs): Promise<RunRawResult> {
  const q = query ?? (await loadSdkQuery());
  const options: Record<string, unknown> = {
    cwd,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };
  if (mcpServers) options.mcpServers = mcpServers;
  if (agents) options.agents = agents;
  let text = '';
  let ok = false;
  try {
    for await (const m of q({ prompt, options })) {
      if (m.type === 'assistant') {
        for (const ev of parseSentinels(textOf(m))) onEvent(ev);
      } else if (m.type === 'result') {
        text = m.result ?? '';
        ok = m.subtype === 'success' && !m.is_error;
      }
    }
  } catch (e) {
    return { ok: false, text: (e as Error).message };
  }
  return { ok, text };
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/llm.service.test.mjs` → PASS (les 8 tests : events, inputs invalides sans appel query, JSON invalide, échec SDK, mcpServers, runRaw ok/échec, agents).
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (19 verts).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2a): main/services/llm.service.ts (← runner.mjs, SDK en import() dynamique) + test porté"
```

---

### Task 6 : `main/engine.ts` (← hud/engine.mjs)

**Files:**
- Create: `src/main/engine.ts`
- Move: `tests/engine.test.mjs` → `tests/main/engine.test.mjs`

**Interfaces:**
- Consumes : `loadEngineConfig` (`@main/io/env`), `readSoul` (`@main/io/soul.io`), `listEditions` (`@main/io/editions.io`), `runSkill`/`runRaw` (`@main/services/llm.service`), `parseSoul`/`replaceSoulSections`/`replaceSoulEchantillons`/types Soul (`@domain/soul`), `parseAgent`/`toAgentDefinition`/`serializeAgent`/type `Agent` (`@domain/agents`).
- Produces : interface `EngineDeps` ; `defaultDeps(env?): EngineDeps` ; `dispatch`, `getDashboard`, `readEdition`, `getSoul`, `saveSoulSections`, `saveSoulEchantillons`, `getAgents`, `saveAgent`, `loadAgents`, `archiveAndIngest` (mêmes signatures que `hud/engine.mjs`, typées).

> Les fonctions prennent `deps: EngineDeps` ; les tests (`.mjs`, non typés par `tsc`) passent des `deps` partiels — OK au runtime (chaque fonction ne touche que ses deps). `EngineDeps` est donc entièrement requis côté types, fourni en entier par `defaultDeps`.

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/engine.test.mjs tests/main/engine.test.mjs
```
Remplacer l'import `../hud/engine.mjs` → `@main/engine` (mêmes symboles). Corriger `./fixtures/` → `../fixtures/` (lit `SOUL.full.md`).

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/engine.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/main/engine.ts`**

```ts
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSkill as realRunSkill, runRaw as realRunRaw } from '@main/services/llm.service';
import type { RunResult, RunRawResult, StreamEvent } from '@main/services/llm.service';
import { readSoul as realReadSoul } from '@main/io/soul.io';
import type { SoulSummary } from '@main/io/soul.io';
import { listEditions as realListEditions } from '@main/io/editions.io';
import type { EditionSummary } from '@main/io/editions.io';
import { loadEngineConfig } from '@main/io/env';
import type { WikiMcp } from '@main/io/env';
import {
  parseSoul,
  replaceSoulSections,
  replaceSoulEchantillons,
  type Soul,
  type Echantillon,
  type SoulSectionEdits,
} from '@domain/soul';
import { parseAgent, toAgentDefinition, serializeAgent, type Agent, type AgentDefinition } from '@domain/agents';

const SOUL_PARTS = ['.claude', 'breves-ia', 'SOUL.md'];

export interface EngineDeps {
  bbDir: string;
  repoDir: string;
  wikiMcp?: WikiMcp;
  runSkill: typeof realRunSkill;
  runRaw: typeof realRunRaw;
  readSoul: (baseDir: string) => SoulSummary;
  listEditions: (bbDir: string) => EditionSummary[];
  readFile: (p: string) => string;
  writeFile: (p: string, t: string) => void;
  readdir: (p: string) => string[];
}

export function defaultDeps(env: NodeJS.ProcessEnv = process.env): EngineDeps {
  const { bbDir, repoDir, wikiMcp } = loadEngineConfig(env);
  return {
    bbDir,
    repoDir,
    wikiMcp,
    runSkill: realRunSkill,
    runRaw: realRunRaw,
    readSoul: realReadSoul,
    listEditions: realListEditions,
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, t) => writeFileSync(p, t, 'utf8'),
    readdir: (p) => readdirSync(p),
  };
}

export function loadAgents(deps: EngineDeps): { defs: Record<string, AgentDefinition>; byName: Record<string, Agent> } {
  const dir = join(deps.repoDir, '.claude', 'agents');
  let files: string[] = [];
  try {
    files = deps.readdir(dir);
  } catch {
    return { defs: {}, byName: {} };
  }
  const defs: Record<string, AgentDefinition> = {};
  const byName: Record<string, Agent> = {};
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const a = parseAgent(deps.readFile(join(dir, f)));
    if (!a.name) continue;
    byName[a.name] = a;
    if (a.enabled) defs[a.name] = toAgentDefinition(a);
  }
  return { defs, byName };
}

export function getSoul(deps: EngineDeps): Soul | null {
  try {
    return parseSoul(deps.readFile(join(deps.repoDir, ...SOUL_PARTS)));
  } catch {
    return null;
  }
}

export function saveSoulSections(deps: EngineDeps, edits: SoulSectionEdits): { ok: boolean; error?: string } {
  const req: (keyof SoulSectionEdits)[] = ['quiParle', 'audience', 'voix', 'lignesRouges'];
  for (const k of req) {
    if (typeof edits?.[k] !== 'string' || !edits[k].trim()) return { ok: false, error: `${k} vide` };
  }
  try {
    const raw = deps.readFile(join(deps.repoDir, ...SOUL_PARTS));
    deps.writeFile(join(deps.repoDir, ...SOUL_PARTS), replaceSoulSections(raw, edits));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function saveSoulEchantillons(deps: EngineDeps, entries: Echantillon[]): { ok: boolean; error?: string } {
  if (!Array.isArray(entries) || entries.length > 3) return { ok: false, error: 'max 3 échantillons' };
  if (entries.some((e) => typeof e?.texte !== 'string' || !e.texte.trim())) {
    return { ok: false, error: 'échantillon vide' };
  }
  try {
    const path = join(deps.repoDir, ...SOUL_PARTS);
    deps.writeFile(path, replaceSoulEchantillons(deps.readFile(path), entries));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Lit une édition archivée. Nom strictement validé (anti-traversal). Renvoie null sinon.
export function readEdition(deps: EngineDeps, file: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}-breves-ia-merim(-[a-z0-9-]+)?\.md$/.test(String(file))) return null;
  try {
    return deps.readFile(join(deps.bbDir, 'raw', 'notes', file));
  } catch {
    return null;
  }
}

export interface DispatchArgs {
  skill: string;
  inputs: Record<string, unknown>;
  onEvent?: (ev: StreamEvent) => void;
}

export async function dispatch({ skill, inputs, onEvent }: DispatchArgs, deps: EngineDeps): Promise<RunResult> {
  const { defs, byName } = loadAgents(deps);
  const finalInputs: Record<string, unknown> = { ...inputs };
  if (skill === 'breves-verify' && finalInputs.sceptique == null) {
    const s = byName.sceptique;
    finalInputs.sceptique = s && s.enabled && s.mode ? s.mode : 'off';
  }
  if (skill === 'breves-draft' && finalInputs.redacteur == null) {
    const r = byName.redacteur;
    finalInputs.redacteur = r && r.enabled ? 'on' : 'off';
  }
  return deps.runSkill({
    skill,
    inputs: finalInputs,
    bbDir: deps.repoDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    agents: Object.keys(defs).length ? defs : undefined,
    onEvent,
  });
}

export interface Dashboard {
  soul: SoulSummary | null;
  editions: EditionSummary[];
}

export function getDashboard(deps: EngineDeps): Dashboard {
  let soul: SoulSummary | null = null;
  try {
    soul = deps.readSoul(deps.repoDir);
  } catch {
    soul = null;
  }
  let editions: EditionSummary[] = [];
  try {
    editions = deps.listEditions(deps.bbDir);
  } catch {
    editions = [];
  }
  return { soul, editions };
}

export function getAgents(deps: EngineDeps): Agent[] {
  const { byName } = loadAgents(deps);
  return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
}

export interface AgentEdits {
  systemPrompt: string;
  model?: string;
  tools?: string[];
  enabled?: boolean;
  mode?: string;
  description?: string;
}

export function saveAgent(deps: EngineDeps, name: string, edits: AgentEdits): { ok: boolean; error?: string } {
  if (!name || typeof edits?.systemPrompt !== 'string' || !edits.systemPrompt.trim()) {
    return { ok: false, error: 'nom ou prompt vide' };
  }
  const path = join(deps.repoDir, '.claude', 'agents', `${name}.md`);
  try {
    const current = parseAgent(deps.readFile(path));
    const merged: Agent = {
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
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface ArchiveArgs {
  teamsText: string;
  topics: unknown[];
  sources: unknown[];
  leconSOUL?: string;
  onEvent?: (ev: StreamEvent) => void;
}

export async function archiveAndIngest(
  { teamsText, topics, sources, leconSOUL, onEvent }: ArchiveArgs,
  deps: EngineDeps,
): Promise<RunResult & { ingest?: RunRawResult }> {
  const archiveResult = await dispatch(
    { skill: 'breves-archive', inputs: { teamsText, topics, sources, leconSOUL }, onEvent },
    deps,
  );
  if (!archiveResult.ok) return archiveResult;
  const ingest = await deps.runRaw({
    prompt: '/ingest',
    cwd: deps.bbDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    onEvent,
  });
  return { ...archiveResult, ingest };
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/engine.test.mjs` → PASS (dispatch args, getDashboard agrège/tolère absente, readEdition lit/anti-traversal/échec, getSoul parse/null, saveSoulSections écrit/refuse vide, dispatch cwd+MCP, etc.).
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → **19 fichiers verts**.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2a): main/engine.ts (← hud/engine.mjs, deps typées sur io+services+domain) + test porté"
```

---

## Critères de réussite Phase 2.2a (revue finale)

- [ ] `src/main/io/{env,soul.io,editions.io}.ts`, `src/main/services/llm.service.ts`, `src/main/engine.ts`, `src/shared/{errors,logger}.ts` en TS strict.
- [ ] **Aucun import `electron`** dans 2.2a (vérifiable : `grep -rn "from 'electron'" src/main` → vide).
- [ ] SDK chargé en `import()` dynamique (pas de `require`/`import` statique du SDK) ; tests injectent toujours `query`.
- [ ] Tests portés sous `tests/main/`, fixtures repointées ; `npm test` = 19 fichiers verts ; `npm run typecheck` + `npm run lint` exit 0.
- [ ] `lib/*.mjs` et `hud/*` **inchangés**.
- [ ] Aucun appel réseau / écriture wiki réelle en test.
- [ ] Comportement identique (ports 1:1 ; seule déviation : `repoDir` défaut via `process.cwd()`).

## Reste (Phase 2.2b, plan séparé après 2.2a)

`shared/types/{api,ipc}.ts` (contrat `window.api`), `main/ipc/*.handlers.ts` (par domaine, Zod sur entrées), `main/index.ts` (fenêtre + enregistrement IPC + externalisation SDK dans `vite.main.config.ts`), `preload/index.ts` (`window.api` typé + alias `window.breves`), **smoke de boot SDK**.
