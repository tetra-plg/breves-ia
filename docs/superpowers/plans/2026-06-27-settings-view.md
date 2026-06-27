# Vue Settings (« Var ») + config persistante — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une vue de réglages pour configurer les 3 chemins essentiels (BoilingBrain, repo SOUL/agents, binaire claude) via pickers natifs macOS, avec validation visuelle et persistance hors bundle ; et un rework léger du header (historique en lien, bouton Réglages, bouton Quitter).

**Architecture:** La config est persistée dans `<userData>/config.json`. `loadEngineConfig` applique la précédence **env > config.json > défaut en dur**. Les changements s'appliquent à chaud en mutant l'objet `deps` partagé par les handlers IPC. Un module `config.ts` gère lecture/écriture/validation ; des handlers IPC `settings` exposent getSettings/validatePath/pickPath/saveSettings/quitApp ; les pickers passent par `dialog.showOpenDialog`.

**Tech Stack:** Electron (main + preload + IPC), React 19 + Zustand (renderer), TypeScript, Vitest (`.mjs`).

## Global Constraints

- Node **22** pour builder (`.nvmrc`=22). Charger nvm avant tout build : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.
- Tests : fichiers `tests/**/*.test.mjs`, `import { test } from 'vitest'` + `import assert from 'node:assert/strict'`. Alias `@main`, `@domain`, `@shared` disponibles.
- Le pre-commit husky lance `typecheck` + `lint` + `test` : un commit qui passe = ces trois verts.
- Pas de nouvelle dépendance runtime.
- Français pour les libellés UI et messages (accents corrects).
- Les 3 clés de config : `bbDir` (dossier), `repoDir` (dossier), `claudeBin` (fichier exécutable).
- Variables d'env : `BREVES_BB_DIR`, `BREVES_REPO_DIR`, `BREVES_CLAUDE_BIN`.
- **Design system** : tout nouveau composant suit le pattern `X.tsx` + `X.module.css` + `X.stories.tsx` (CSF3, `@storybook/react-vite`). Primitives → `src/renderer/components/ui/`, titre `Primitives/X`. Composites → `src/renderer/components/`, titre `Composants/X`. **Pas de styles inline** : utiliser les tokens de `src/renderer/styles/tokens.css` (`--good` vert, `--warn` rouge, `--line`, `--accent`, `--text`, `--mono`, `--panel`, `--radius`). Réutiliser les primitives existantes (Button, Eyebrow, Text, StatusDot…). Les stories compilent sous typecheck/lint et le storybook builde (`npm run build-storybook`).

---

## File Structure

**Main**
- `src/main/io/config.ts` (neuf) — persistance `config.json` + validation de chemin.
- `src/main/io/env.ts` (modif) — `DEFAULTS`, `ENV_KEYS`, `resolveSetting`, `buildWikiMcp`, `loadEngineConfig(env, userConfig)`.
- `src/main/engine.ts` (modif) — `defaultDeps(env, userConfig)` + `applyConfig(deps, patch, env)`.
- `src/main/ipc/system.handlers.ts` (modif) — `SystemBridge` gagne `pickPath` + `quit`.
- `src/main/ipc/settings.handlers.ts` (neuf) — `buildSettingsState` + `registerSettingsHandlers`.
- `src/main/ipc/index.ts` (modif) — `registerAllHandlers` gagne `userDataDir` ; appelle settings.
- `src/main/index.ts` (modif) — `userDataDir`, init config au 1er lancement, impl `pickPath`/`quit`, passe `userDataDir`.

**Shared**
- `src/shared/types/api.ts` (modif) — types `SettingKey/SettingSource/SettingField/SettingsState/SettingsPatch` + méthodes `Api`.
- `src/shared/types/ipc.ts` (modif) — canaux `getSettings/validatePath/pickPath/saveSettings/quitApp`.
- `src/preload/index.ts` (modif) — câblage des 5 méthodes.

**Domain**
- `src/domain/navigation.ts` (modif) — vue `settings` + action `goSettings` + `viewTitle`.

**Renderer — design system (avec stories)**
- `src/renderer/components/ui/Input.tsx` + `.module.css` + `.stories.tsx` (neuf) — primitive champ texte.
- `src/renderer/components/ui/StatusDot.tsx` + `.module.css` + `.stories.tsx` (modif) — état `error` (rouge).
- `src/renderer/components/PathField.tsx` + `.module.css` + `.stories.tsx` (neuf) — composite label+dot+input+bouton.

**Renderer — pages/layout**
- `src/renderer/pages/Settings.tsx` (neuf) — compose `PathField` ×3.
- `src/renderer/App.tsx` (modif) — enregistre la vue.
- `src/renderer/layouts/Shell.tsx` (modif) — rework header.
- `src/renderer/pages/Dashboard.tsx` (modif) — lien « voir l'historique ».

**Divers**
- `.env.example` (modif).

---

## Task 1 : Module de persistance config (`config.ts`)

**Files:**
- Create: `src/main/io/config.ts`
- Test: `tests/main/config.test.mjs`

**Interfaces:**
- Produces: `UserConfig` (`{ bbDir?; repoDir?; claudeBin? }`), `configPath(userDataDir): string`, `readUserConfig(userDataDir): UserConfig`, `writeUserConfig(userDataDir, cfg): void`, `pathValid(p, kind: 'directory'|'file'): boolean`.

- [ ] **Step 1: Write the failing test**

```js
// tests/main/config.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readUserConfig, writeUserConfig, pathValid } from '@main/io/config';

test('readUserConfig: fichier absent → {}', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  assert.deepEqual(readUserConfig(d), {});
});

test('writeUserConfig puis readUserConfig : round-trip', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  writeUserConfig(d, { bbDir: '/a', repoDir: '/b', claudeBin: '/c' });
  assert.deepEqual(readUserConfig(d), { bbDir: '/a', repoDir: '/b', claudeBin: '/c' });
});

test('readUserConfig: JSON cassé → {}', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  writeFileSync(join(d, 'config.json'), '{pas du json');
  assert.deepEqual(readUserConfig(d), {});
});

test('pathValid: dossier existant → true, absent → false', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  assert.equal(pathValid(d, 'directory'), true);
  assert.equal(pathValid(join(d, 'nope'), 'directory'), false);
});

test('pathValid: fichier exécutable → true, non-exécutable → false', () => {
  const d = mkdtempSync(join(tmpdir(), 'cfg-'));
  const exe = join(d, 'bin'); writeFileSync(exe, '#!/bin/sh\n'); chmodSync(exe, 0o755);
  assert.equal(pathValid(exe, 'file'), true);
  const plain = join(d, 'plain'); writeFileSync(plain, 'x'); chmodSync(plain, 0o644);
  assert.equal(pathValid(plain, 'file'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/config.test.mjs`
Expected: FAIL (module `@main/io/config` introuvable).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/main/io/config.ts
import { readFileSync, writeFileSync, mkdirSync, statSync, accessSync, constants } from 'node:fs';
import { join, dirname } from 'node:path';

export interface UserConfig {
  bbDir?: string;
  repoDir?: string;
  claudeBin?: string;
}

const KEYS = ['bbDir', 'repoDir', 'claudeBin'] as const;

export function configPath(userDataDir: string): string {
  return join(userDataDir, 'config.json');
}

export function readUserConfig(userDataDir: string): UserConfig {
  try {
    const obj = JSON.parse(readFileSync(configPath(userDataDir), 'utf8')) as Record<string, unknown>;
    const out: UserConfig = {};
    for (const k of KEYS) if (typeof obj[k] === 'string') out[k] = obj[k] as string;
    return out;
  } catch {
    return {};
  }
}

export function writeUserConfig(userDataDir: string, cfg: UserConfig): void {
  const p = configPath(userDataDir);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
}

export function pathValid(p: string, kind: 'directory' | 'file'): boolean {
  if (!p) return false;
  try {
    const st = statSync(p); // suit les symlinks (claudeBin est un symlink)
    if (kind === 'directory') return st.isDirectory();
    if (!st.isFile()) return false;
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/config.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/io/config.ts tests/main/config.test.mjs
git commit -m "feat(config): persistance config.json + validation de chemin"
```

---

## Task 2 : Résolution config + sources dans `env.ts`

**Files:**
- Modify: `src/main/io/env.ts`
- Test: `tests/main/env.test.mjs` (ajouts)

**Interfaces:**
- Consumes: `UserConfig` (Task 1).
- Produces: `SettingKey` (depuis `@shared/types/api`, Task 5 — mais on le définit ici aussi en attendant ? **non** : voir note), `DEFAULTS`, `ENV_KEYS`, `resolveSetting(key, env, userConfig): { value; source }`, `buildWikiMcp(env, bbDir): WikiMcp`, `loadEngineConfig(env?, userConfig?): EngineConfig`.

> Note de dépendance : `SettingKey` est défini dans `@shared/types/api` (Task 5). Pour éviter un ordre bloquant, **Task 2 définit `SettingKey` localement dans env.ts** ; Task 5 le déplacera dans `api.ts` et env.ts l'importera. Les deux étapes typent identique (`'bbDir' | 'repoDir' | 'claudeBin'`).

- [ ] **Step 1: Write the failing test**

```js
// tests/main/env.test.mjs — AJOUTER ces tests (garder l'existant)
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { resolveSetting, loadEngineConfig, buildWikiMcp } from '@main/io/env';

test('resolveSetting: env > file > défaut', () => {
  assert.equal(resolveSetting('bbDir', { BREVES_BB_DIR: '/env' }, { bbDir: '/file' }).source, 'env');
  assert.equal(resolveSetting('bbDir', { BREVES_BB_DIR: '/env' }, { bbDir: '/file' }).value, '/env');
  assert.equal(resolveSetting('bbDir', {}, { bbDir: '/file' }).source, 'file');
  assert.equal(resolveSetting('bbDir', {}, {}).source, 'default');
});

test('loadEngineConfig applique userConfig', () => {
  const c = loadEngineConfig({}, { repoDir: '/my/repo', claudeBin: '/my/claude' });
  assert.equal(c.repoDir, '/my/repo');
  assert.equal(c.claudeBin, '/my/claude');
});

test('buildWikiMcp dérive le script de bbDir', () => {
  const w = buildWikiMcp({}, '/BB');
  assert.equal(w.args[0], '/BB/scripts/mcp/mcp-wiki.py');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/env.test.mjs`
Expected: FAIL (`resolveSetting`/`buildWikiMcp` non exportés).

- [ ] **Step 3: Write minimal implementation**

Remplacer le haut de `src/main/io/env.ts` (jusqu'à la fin de `loadEngineConfig`) par :

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UserConfig } from '@main/io/config';

export interface WikiMcp {
  type: 'stdio';
  command: string;
  args: string[];
}

export interface EngineConfig {
  bbDir: string;
  repoDir: string;
  claudeBin: string;
  wikiMcp: WikiMcp;
}

export type SettingKey = 'bbDir' | 'repoDir' | 'claudeBin';

export const DEFAULTS: Record<SettingKey, string> = {
  bbDir: '/Users/pleguern/Workspace/BoilingBrain',
  repoDir: '/Users/pleguern/Workspace/breves-ia',
  claudeBin: '/Users/pleguern/.local/bin/claude',
};

export const ENV_KEYS: Record<SettingKey, string> = {
  bbDir: 'BREVES_BB_DIR',
  repoDir: 'BREVES_REPO_DIR',
  claudeBin: 'BREVES_CLAUDE_BIN',
};

export function resolveSetting(
  key: SettingKey,
  env: NodeJS.ProcessEnv,
  userConfig: UserConfig,
): { value: string; source: 'env' | 'file' | 'default' } {
  const envVal = env[ENV_KEYS[key]];
  if (envVal) return { value: envVal, source: 'env' };
  const fileVal = userConfig[key];
  if (fileVal) return { value: fileVal, source: 'file' };
  return { value: DEFAULTS[key], source: 'default' };
}

export function buildWikiMcp(env: NodeJS.ProcessEnv, bbDir: string): WikiMcp {
  return {
    type: 'stdio',
    command: env.BREVES_WIKI_PY || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
    args: [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
  };
}

export function loadEngineConfig(env: NodeJS.ProcessEnv = process.env, userConfig: UserConfig = {}): EngineConfig {
  const bbDir = resolveSetting('bbDir', env, userConfig).value;
  const repoDir = resolveSetting('repoDir', env, userConfig).value;
  const claudeBin = resolveSetting('claudeBin', env, userConfig).value;
  return { bbDir, repoDir, claudeBin, wikiMcp: buildWikiMcp(env, bbDir) };
}
```

Garder `parseEnv` et `loadEnvFile` inchangés en dessous.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/env.test.mjs`
Expected: PASS (existant + 3 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/main/io/env.ts tests/main/env.test.mjs
git commit -m "feat(env): resolveSetting (env>file>défaut) + buildWikiMcp + userConfig"
```

---

## Task 3 : `applyConfig` + `defaultDeps(userConfig)` dans `engine.ts`

**Files:**
- Modify: `src/main/engine.ts`
- Test: `tests/main/engine.test.mjs` (ajout)

**Interfaces:**
- Consumes: `loadEngineConfig`, `buildWikiMcp` (Task 2), `UserConfig` (Task 1).
- Produces: `defaultDeps(env?, userConfig?): EngineDeps`, `applyConfig(deps, patch: UserConfig, env?): void`.

- [ ] **Step 1: Write the failing test**

```js
// tests/main/engine.test.mjs — AJOUTER
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { applyConfig } from '@main/engine';

test('applyConfig mute les champs fournis et recompute wikiMcp depuis bbDir', () => {
  const deps = {
    bbDir: '/old', repoDir: '/r', claudeBin: '/c',
    wikiMcp: { type: 'stdio', command: 'py', args: ['/old/scripts/mcp/mcp-wiki.py'] },
  };
  applyConfig(deps, { bbDir: '/new', claudeBin: '/newclaude' }, {});
  assert.equal(deps.bbDir, '/new');
  assert.equal(deps.claudeBin, '/newclaude');
  assert.equal(deps.repoDir, '/r'); // non fourni → inchangé
  assert.equal(deps.wikiMcp.args[0], '/new/scripts/mcp/mcp-wiki.py');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/engine.test.mjs`
Expected: FAIL (`applyConfig` non exporté).

- [ ] **Step 3: Write minimal implementation**

Dans `src/main/engine.ts` : ajouter l'import de `buildWikiMcp` et `UserConfig`, modifier `defaultDeps`, ajouter `applyConfig`.

```ts
// en tête : ajouter buildWikiMcp à l'import existant de '@main/io/env'
import { loadEngineConfig, buildWikiMcp } from '@main/io/env';
import type { WikiMcp } from '@main/io/env';
import type { UserConfig } from '@main/io/config';
```

```ts
// remplacer la signature de defaultDeps
export function defaultDeps(env: NodeJS.ProcessEnv = process.env, userConfig: UserConfig = {}): EngineDeps {
  const { bbDir, repoDir, claudeBin, wikiMcp } = loadEngineConfig(env, userConfig);
  return {
    bbDir,
    repoDir,
    claudeBin,
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

// nouvelle fonction (à placer après defaultDeps)
export function applyConfig(deps: EngineDeps, patch: UserConfig, env: NodeJS.ProcessEnv = process.env): void {
  if (patch.bbDir != null) deps.bbDir = patch.bbDir;
  if (patch.repoDir != null) deps.repoDir = patch.repoDir;
  if (patch.claudeBin != null) deps.claudeBin = patch.claudeBin;
  deps.wikiMcp = buildWikiMcp(env, deps.bbDir);
}
```

(Si `WikiMcp` n'était pas déjà importé, l'import ci-dessus suffit ; sinon retirer le doublon.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/engine.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/engine.ts tests/main/engine.test.mjs
git commit -m "feat(engine): applyConfig à chaud + defaultDeps(userConfig)"
```

---

## Task 4 : Navigation — vue `settings`

**Files:**
- Modify: `src/domain/navigation.ts`
- Test: `tests/domain/navigation.test.mjs` (neuf)

**Interfaces:**
- Produces: `nextView(_, 'goSettings') === 'settings'`, `viewTitle('settings') === 'Réglages'`, `'settings' ∈ VIEWS`.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/navigation.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { nextView, viewTitle, VIEWS } from '@domain/navigation';

test('goSettings → settings', () => {
  assert.equal(nextView('dashboard', 'goSettings'), 'settings');
});
test('viewTitle(settings) = Réglages', () => {
  assert.equal(viewTitle('settings'), 'Réglages');
});
test('VIEWS contient settings', () => {
  assert.ok((VIEWS).includes('settings'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/navigation.test.mjs`
Expected: FAIL (`nextView` renvoie 'dashboard', `viewTitle` renvoie 'Brèves IA').

- [ ] **Step 3: Write minimal implementation**

Dans `src/domain/navigation.ts` :
- Ajouter `'settings'` à la fin du tableau `VIEWS`.
- Dans `ACTIONS`, ajouter `goSettings: 'settings',`.
- Dans `viewTitle`, avant le `return 'Brèves IA'` final, ajouter :

```ts
  if (view === 'settings') return 'Réglages';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/navigation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/navigation.ts tests/domain/navigation.test.mjs
git commit -m "feat(nav): vue settings (goSettings + Réglages)"
```

---

## Task 5 : IPC Settings — types, canaux, preload, bridge, handlers

**Files:**
- Modify: `src/shared/types/api.ts`, `src/shared/types/ipc.ts`, `src/preload/index.ts`, `src/main/ipc/system.handlers.ts`, `src/main/ipc/index.ts`, `src/main/io/env.ts`
- Create: `src/main/ipc/settings.handlers.ts`
- Test: `tests/main/settings.handlers.test.mjs`

**Interfaces:**
- Consumes: `applyConfig` (Task 3), `readUserConfig`/`writeUserConfig`/`pathValid` (Task 1), `resolveSetting`/`SettingKey` (Task 2), `SystemBridge` (modifié ici).
- Produces: `SettingsState` (api.ts), `buildSettingsState(env, userConfig): SettingsState`, `registerSettingsHandlers(ipc, deps, sys, userDataDir, env?): void`, `SystemBridge.pickPath/quit`.

- [ ] **Step 1: Write the failing test**

```js
// tests/main/settings.handlers.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSettingsState, registerSettingsHandlers } from '@main/ipc/settings.handlers';
import { readUserConfig } from '@main/io/config';

function fakeIpc() {
  const h = {};
  return { ipc: { handle: (ch, fn) => { h[ch] = fn; } }, h };
}
const fakeSys = { writeClipboard() {}, openExternal() {}, hideWindow() {}, pickPath: async () => null, quit() {} };

test('buildSettingsState: source=env quand variable définie', () => {
  const st = buildSettingsState({ BREVES_BB_DIR: '/x' }, {});
  assert.equal(st.bbDir.source, 'env');
  assert.equal(st.bbDir.value, '/x');
});

test('buildSettingsState: source=file + valid quand dossier existe', () => {
  const d = mkdtempSync(join(tmpdir(), 'set-'));
  const st = buildSettingsState({}, { repoDir: d });
  assert.equal(st.repoDir.source, 'file');
  assert.equal(st.repoDir.valid, true);
});

test('saveSettings: persiste + applique quand chemins valides', async () => {
  const { ipc, h } = fakeIpc();
  const userData = mkdtempSync(join(tmpdir(), 'ud-'));
  const valid = mkdtempSync(join(tmpdir(), 'ok-'));
  const deps = { bbDir: '/o', repoDir: '/o', claudeBin: '/o', wikiMcp: { type: 'stdio', command: 'p', args: ['/o/scripts/mcp/mcp-wiki.py'] } };
  registerSettingsHandlers(ipc, deps, fakeSys, userData, {});
  const r = await h['save-settings'](null, { bbDir: valid, repoDir: valid });
  assert.equal(r.ok, true);
  assert.equal(deps.bbDir, valid);
  assert.equal(deps.wikiMcp.args[0], join(valid, 'scripts/mcp/mcp-wiki.py'));
  assert.equal(readUserConfig(userData).bbDir, valid);
});

test('saveSettings: chemin invalide → ok:false, rien persisté', async () => {
  const { ipc, h } = fakeIpc();
  const userData = mkdtempSync(join(tmpdir(), 'ud-'));
  const deps = { bbDir: '/o', repoDir: '/o', claudeBin: '/o', wikiMcp: { type: 'stdio', command: 'p', args: [] } };
  registerSettingsHandlers(ipc, deps, fakeSys, userData, {});
  const r = await h['save-settings'](null, { bbDir: '/n/existe/pas' });
  assert.equal(r.ok, false);
  assert.deepEqual(readUserConfig(userData), {});
});

test('getSettings handler renvoie un SettingsState', async () => {
  const { ipc, h } = fakeIpc();
  const userData = mkdtempSync(join(tmpdir(), 'ud-'));
  const deps = { bbDir: '/o', repoDir: '/o', claudeBin: '/o', wikiMcp: { type: 'stdio', command: 'p', args: [] } };
  registerSettingsHandlers(ipc, deps, fakeSys, userData, { BREVES_BB_DIR: '/x' });
  const st = await h['get-settings'](null);
  assert.equal(st.bbDir.source, 'env');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/settings.handlers.test.mjs`
Expected: FAIL (`@main/ipc/settings.handlers` introuvable).

- [ ] **Step 3a: Types partagés** — dans `src/shared/types/api.ts`, ajouter avant `export interface Api` :

```ts
export type SettingKey = 'bbDir' | 'repoDir' | 'claudeBin';
export type SettingSource = 'env' | 'file' | 'default';
export interface SettingField { value: string; source: SettingSource; valid: boolean }
export type SettingsState = Record<SettingKey, SettingField>;
export type SettingsPatch = Partial<Record<SettingKey, string>>;
```

et dans l'interface `Api`, ajouter :

```ts
  getSettings(): Promise<SettingsState>;
  validatePath(path: string, kind: 'directory' | 'file'): Promise<boolean>;
  pickPath(kind: 'directory' | 'file'): Promise<string | null>;
  saveSettings(patch: SettingsPatch): Promise<SaveResult>;
  quitApp(): Promise<void>;
```

- [ ] **Step 3b: Canaux IPC** — dans `src/shared/types/ipc.ts`, ajouter dans l'objet `IPC` :

```ts
  getSettings: 'get-settings',
  validatePath: 'validate-path',
  pickPath: 'pick-path',
  saveSettings: 'save-settings',
  quitApp: 'quit-app',
```

- [ ] **Step 3c: env.ts importe SettingKey du shared** — remplacer dans `src/main/io/env.ts` la ligne `export type SettingKey = ...` par un import, pour DRY :

```ts
import type { SettingKey } from '@shared/types/api';
export type { SettingKey };
```

(garder `DEFAULTS`/`ENV_KEYS`/`resolveSetting` qui l'utilisent.)

- [ ] **Step 3d: Bridge** — dans `src/main/ipc/system.handlers.ts`, étendre l'interface :

```ts
export interface SystemBridge {
  writeClipboard(text: string): void;
  openExternal(url: string): void;
  hideWindow(): void;
  pickPath(kind: 'directory' | 'file'): Promise<string | null>;
  quit(): void;
}
```

- [ ] **Step 3e: Handlers** — créer `src/main/ipc/settings.handlers.ts` :

```ts
import { IPC, type IpcLike } from '@shared/types/ipc';
import type { EngineDeps } from '@main/engine';
import { applyConfig } from '@main/engine';
import type { SystemBridge } from '@main/ipc/system.handlers';
import { readUserConfig, writeUserConfig, pathValid, type UserConfig } from '@main/io/config';
import { resolveSetting } from '@main/io/env';
import type { SettingKey, SettingsState } from '@shared/types/api';

const KINDS: Record<SettingKey, 'directory' | 'file'> = {
  bbDir: 'directory',
  repoDir: 'directory',
  claudeBin: 'file',
};

export function buildSettingsState(env: NodeJS.ProcessEnv, userConfig: UserConfig): SettingsState {
  const mk = (key: SettingKey): SettingsState[SettingKey] => {
    const { value, source } = resolveSetting(key, env, userConfig);
    return { value, source, valid: pathValid(value, KINDS[key]) };
  };
  return { bbDir: mk('bbDir'), repoDir: mk('repoDir'), claudeBin: mk('claudeBin') };
}

export function registerSettingsHandlers(
  ipc: IpcLike,
  deps: EngineDeps,
  sys: SystemBridge,
  userDataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  ipc.handle(IPC.getSettings, () => buildSettingsState(env, readUserConfig(userDataDir)));

  ipc.handle(IPC.validatePath, (_e, payload: unknown) => {
    const { path, kind } = (payload ?? {}) as { path?: string; kind?: 'directory' | 'file' };
    return pathValid(path ?? '', kind === 'file' ? 'file' : 'directory');
  });

  ipc.handle(IPC.pickPath, (_e, kind: unknown) => sys.pickPath(kind === 'file' ? 'file' : 'directory'));

  ipc.handle(IPC.saveSettings, (_e, payload: unknown) => {
    const patch = (payload ?? {}) as UserConfig;
    for (const key of Object.keys(patch) as SettingKey[]) {
      const v = patch[key];
      if (v != null && !pathValid(v, KINDS[key])) {
        return { ok: false, error: `Chemin invalide pour ${key} : ${v}` };
      }
    }
    try {
      writeUserConfig(userDataDir, { ...readUserConfig(userDataDir), ...patch });
      applyConfig(deps, patch, env);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

  ipc.handle(IPC.quitApp, () => {
    sys.quit();
  });
}
```

- [ ] **Step 3f: Preload** — dans `src/preload/index.ts`, ajouter à l'objet `api` :

```ts
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  validatePath: (path, kind) => ipcRenderer.invoke(IPC.validatePath, { path, kind }),
  pickPath: (kind) => ipcRenderer.invoke(IPC.pickPath, kind),
  saveSettings: (patch) => ipcRenderer.invoke(IPC.saveSettings, patch),
  quitApp: () => ipcRenderer.invoke(IPC.quitApp),
```

- [ ] **Step 3g: Enregistrement** — dans `src/main/ipc/index.ts` :

```ts
import { registerSettingsHandlers } from '@main/ipc/settings.handlers';

export function registerAllHandlers(
  ipc: IpcLike,
  deps: EngineDeps,
  sys: SystemBridge,
  userDataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  registerCommandHandlers(ipc, deps);
  registerDashboardHandlers(ipc, deps);
  registerSoulHandlers(ipc, deps);
  registerAgentsHandlers(ipc, deps);
  registerSystemHandlers(ipc, sys);
  registerSettingsHandlers(ipc, deps, sys, userDataDir, env);
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/main/settings.handlers.test.mjs && npm run typecheck`
Expected: vitest PASS (5) ; typecheck **échoue** sur `src/main/index.ts` (argument `userDataDir` manquant + `SystemBridge` incomplet) — c'est attendu, corrigé en Task 6. Pour committer maintenant sans casser le hook, faire Task 6 d'abord OU committer Task 5+6 ensemble.

> **Note d'exécution** : Task 5 et Task 6 partagent la même barrière typecheck (l'interface `SystemBridge` et la signature `registerAllHandlers` changent). **Committer Task 5 et Task 6 dans le même commit** (ne pas committer entre les deux). Les steps restent séparés pour la lisibilité.

- [ ] **Step 5: (pas de commit ici — voir Task 6)**

---

## Task 6 : Boot — userData, init config, impl bridge (pickPath/quit)

**Files:**
- Modify: `src/main/index.ts`
- (Commit conjoint avec Task 5.)

**Interfaces:**
- Consumes: `readUserConfig`/`writeUserConfig` (Task 1), `loadEngineConfig` (Task 2), `defaultDeps` (Task 3), `registerAllHandlers(…, userDataDir)` (Task 5).

- [ ] **Step 1: Implémenter le boot**

Dans `src/main/index.ts` :
- Ajouter `dialog` à l'import electron : `import { app, BrowserWindow, Menu, ipcMain, clipboard, shell, dialog } from 'electron';`
- Ajouter les imports : `import { readUserConfig, writeUserConfig } from '@main/io/config';` et `import { loadEngineConfig } from '@main/io/env';`
- Remplacer le bloc `const deps = defaultDeps(); const sys … ; registerAllHandlers(…)` par :

```ts
  const userDataDir = app.getPath('userData');
  let userConfig = readUserConfig(userDataDir);
  if (Object.keys(userConfig).length === 0) {
    // 1er lancement : initialiser config.json avec les valeurs effectives par défaut
    const eff = loadEngineConfig(process.env, {});
    userConfig = { bbDir: eff.bbDir, repoDir: eff.repoDir, claudeBin: eff.claudeBin };
    writeUserConfig(userDataDir, userConfig);
  }
  const deps = defaultDeps(process.env, userConfig);
  const sys: SystemBridge = {
    writeClipboard: (text) => clipboard.writeText(text),
    openExternal: (url) => {
      void shell.openExternal(url);
    },
    hideWindow: () => win?.hide(),
    pickPath: async (kind) => {
      if (!win) return null;
      const res = await dialog.showOpenDialog(win, {
        properties:
          kind === 'directory'
            ? ['openDirectory', 'showHiddenFiles', 'createDirectory']
            : ['openFile', 'showHiddenFiles'],
      });
      return res.canceled || !res.filePaths[0] ? null : res.filePaths[0];
    },
    quit: () => app.quit(),
  };
  registerAllHandlers(ipcMain as unknown as IpcLike, deps, sys, userDataDir);
```

- [ ] **Step 2: Vérifier typecheck + lint + tests**

Run: `npm run typecheck && npm run lint && npx vitest run`
Expected: tout PASS (179 + nouveaux).

- [ ] **Step 3: Commit conjoint Task 5 + 6**

```bash
git add src/shared/types/api.ts src/shared/types/ipc.ts src/preload/index.ts \
        src/main/io/env.ts src/main/ipc/system.handlers.ts src/main/ipc/settings.handlers.ts \
        src/main/ipc/index.ts src/main/index.ts tests/main/settings.handlers.test.mjs
git commit -m "feat(ipc): handlers Settings + picker natif + quit + init config au boot"
```

---

## Task 7.1 : Primitive `Input` (design system)

**Files:**
- Create: `src/renderer/components/ui/Input.tsx`, `src/renderer/components/ui/Input.module.css`, `src/renderer/components/ui/Input.stories.tsx`

**Interfaces:**
- Produces: `Input` (wrapper de `<input>`, mêmes props natives, classe design system).

- [ ] **Step 1: Créer la primitive** (calquée sur `Textarea`)

```tsx
// src/renderer/components/ui/Input.tsx
import type { InputHTMLAttributes } from 'react';
import s from './Input.module.css';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className ? `${s.root} ${className}` : s.root} {...rest} />;
}
```

```css
/* src/renderer/components/ui/Input.module.css */
.root{width:100%;border:1px solid var(--line);padding:9px 12px;font:400 12.5px var(--mono);color:var(--text);background:var(--panel);border-radius:var(--radius)}
.root:disabled{opacity:.55;cursor:not-allowed}
```

- [ ] **Step 2: Créer la story**

```tsx
// src/renderer/components/ui/Input.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  component: Input,
  title: 'Primitives/Input',
  argTypes: { disabled: { control: 'boolean' } },
};
export default meta;

export const Default: StoryObj<typeof Input> = { args: { defaultValue: '/Users/pleguern/Workspace/BoilingBrain' } };
export const Vide: StoryObj<typeof Input> = { args: { placeholder: 'Sélectionne un dossier…' } };
export const Disabled: StoryObj<typeof Input> = { args: { defaultValue: '/verrouillé', disabled: true } };
```

- [ ] **Step 3: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ui/Input.tsx src/renderer/components/ui/Input.module.css src/renderer/components/ui/Input.stories.tsx
git commit -m "feat(ds): primitive Input + story"
```

---

## Task 7.2 : Étendre `StatusDot` avec l'état `error`

**Files:**
- Modify: `src/renderer/components/ui/StatusDot.tsx`, `src/renderer/components/ui/StatusDot.module.css`, `src/renderer/components/ui/StatusDot.stories.tsx`

**Interfaces:**
- Produces: `StatusDot` accepte `state: 'done' | 'active' | 'todo' | 'error'` (`error` = pastille rouge ✕).

- [ ] **Step 1: Ajouter l'état**

```tsx
// src/renderer/components/ui/StatusDot.tsx
import s from './StatusDot.module.css';

type State = 'done' | 'active' | 'todo' | 'error';
interface StatusDotProps { state: State; }

export function StatusDot({ state }: StatusDotProps) {
  const glyph = state === 'done' ? '✓' : state === 'error' ? '✕' : null;
  return <span className={`${s.root} ${s[state]}`} data-state={state} aria-hidden="true">{glyph}</span>;
}
```

Ajouter dans `src/renderer/components/ui/StatusDot.module.css`, après la règle `.done` :

```css
.error{background:var(--warn);color:#fff;font-size:9px}
```

- [ ] **Step 2: Mettre à jour la story** — dans `src/renderer/components/ui/StatusDot.stories.tsx` :
- Si un `argTypes.state.options` existe, y ajouter `'error'`.
- Ajouter l'export : `export const Error: StoryObj<typeof StatusDot> = { args: { state: 'error' } };`

- [ ] **Step 3: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ui/StatusDot.tsx src/renderer/components/ui/StatusDot.module.css src/renderer/components/ui/StatusDot.stories.tsx
git commit -m "feat(ds): StatusDot — état error (rouge)"
```

---

## Task 7.3 : Composite `PathField` (présentationnel)

**Files:**
- Create: `src/renderer/components/PathField.tsx`, `src/renderer/components/PathField.module.css`, `src/renderer/components/PathField.stories.tsx`

**Interfaces:**
- Consumes: `Input` (7.1), `StatusDot` état `error` (7.2), `Button`, `Eyebrow`, `Text`.
- Produces: `PathField` avec props `{ label: string; value: string; valid: boolean; locked?: boolean; onChange: (value: string) => void; onBrowse: () => void }`. **Présentationnel** (aucun accès IPC) → storybookable.

- [ ] **Step 1: Créer le composite**

```tsx
// src/renderer/components/PathField.tsx
import { Eyebrow } from '@renderer/components/ui/Eyebrow';
import { Input } from '@renderer/components/ui/Input';
import { Button } from '@renderer/components/ui/Button';
import { StatusDot } from '@renderer/components/ui/StatusDot';
import { Text } from '@renderer/components/ui/Text';
import s from './PathField.module.css';

export interface PathFieldProps {
  label: string;
  value: string;
  valid: boolean;
  locked?: boolean;
  onChange: (value: string) => void;
  onBrowse: () => void;
}

export function PathField({ label, value, valid, locked = false, onChange, onBrowse }: PathFieldProps) {
  return (
    <div className={s.root}>
      <Eyebrow style={{ margin: 0 }}>{label}</Eyebrow>
      <div className={s.row}>
        <StatusDot state={valid ? 'done' : 'error'} />
        <Input value={value} disabled={locked} onChange={(e) => onChange(e.target.value)} />
        <Button variant="ghost" disabled={locked} onClick={onBrowse}>
          Parcourir…
        </Button>
      </div>
      {locked && (
        <Text tone="faint" as="div" style={{ fontSize: 11 }}>
          Verrouillé par une variable d'environnement.
        </Text>
      )}
    </div>
  );
}
```

```css
/* src/renderer/components/PathField.module.css */
.root{display:flex;flex-direction:column;gap:6px}
.row{display:flex;align-items:center;gap:8px}
.row > input{flex:1;min-width:0}
```

- [ ] **Step 2: Créer la story**

```tsx
// src/renderer/components/PathField.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PathField } from './PathField';

const meta: Meta<typeof PathField> = {
  component: PathField,
  title: 'Composants/PathField',
  args: { onChange: () => {}, onBrowse: () => {} },
  argTypes: { valid: { control: 'boolean' }, locked: { control: 'boolean' } },
};
export default meta;

export const Valide: StoryObj<typeof PathField> = {
  args: { label: 'BoilingBrain (dossier)', value: '/Users/pleguern/Workspace/BoilingBrain', valid: true },
};
export const Invalide: StoryObj<typeof PathField> = {
  args: { label: 'Binaire claude (fichier)', value: '/chemin/introuvable', valid: false },
};
export const Verrouille: StoryObj<typeof PathField> = {
  args: { label: 'Repo SOUL / agents (dossier)', value: '/env/locked', valid: true, locked: true },
};
```

- [ ] **Step 3: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/PathField.tsx src/renderer/components/PathField.module.css src/renderer/components/PathField.stories.tsx
git commit -m "feat(ds): composite PathField + story"
```

---

## Task 7.4 : Page `Settings` + route

**Files:**
- Create: `src/renderer/pages/Settings.tsx`
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `PathField` (7.3), `window.api.getSettings/validatePath/pickPath/saveSettings` (Task 5), `SettingsState`/`SettingKey` (api.ts).

- [ ] **Step 1: Créer la page** (compose `PathField`, aucun style inline)

```tsx
// src/renderer/pages/Settings.tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { SettingsState, SettingKey } from '@shared/types/api';
import { Button } from '@renderer/components/ui/Button';
import { Text } from '@renderer/components/ui/Text';
import { PathField } from '@renderer/components/PathField';

type Kind = 'directory' | 'file';
const FIELDS: { key: SettingKey; label: string; kind: Kind }[] = [
  { key: 'bbDir', label: 'BoilingBrain (dossier)', kind: 'directory' },
  { key: 'repoDir', label: 'Repo SOUL / agents (dossier)', kind: 'directory' },
  { key: 'claudeBin', label: 'Binaire claude (fichier)', kind: 'file' },
];

export function Settings() {
  const showToast = useAppStore((s) => s.showToast);
  const setDashboard = useAppStore((s) => s.setDashboard);
  const [state, setState] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void window.api.getSettings().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function setValue(key: SettingKey, kind: Kind, value: string): Promise<void> {
    const valid = await window.api.validatePath(value, kind);
    setState((prev) => (prev ? { ...prev, [key]: { ...prev[key], value, valid } } : prev));
  }

  async function browse(key: SettingKey, kind: Kind): Promise<void> {
    const picked = await window.api.pickPath(kind);
    if (picked) await setValue(key, kind, picked);
  }

  async function save(): Promise<void> {
    if (!state) return;
    setSaving(true);
    const patch: Record<string, string> = {};
    for (const f of FIELDS) if (state[f.key].source !== 'env') patch[f.key] = state[f.key].value;
    const r = await window.api.saveSettings(patch);
    setSaving(false);
    showToast(r.ok ? 'Réglages enregistrés' : 'Échec : ' + (r.error ?? 'inconnu'));
    if (r.ok) void window.api.getDashboard().then(setDashboard);
  }

  if (!state) {
    return (
      <section>
        <div className="pad">
          <Text tone="faint" as="div">Chargement…</Text>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Text tone="muted" as="p" style={{ margin: 0 }}>
          Chemins utilisés par l'app. Appliqués immédiatement à l'enregistrement.
        </Text>
        {FIELDS.map((f) => (
          <PathField
            key={f.key}
            label={f.label}
            value={state[f.key].value}
            valid={state[f.key].valid}
            locked={state[f.key].source === 'env'}
            onChange={(v) => void setValue(f.key, f.kind, v)}
            onBrowse={() => void browse(f.key, f.kind)}
          />
        ))}
        <div>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            Enregistrer
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Enregistrer la vue** — dans `src/renderer/App.tsx` :
- Ajouter l'import : `import { Settings } from '@renderer/pages/Settings';`
- Ajouter dans `VIEWS` : `settings: Settings,`

- [ ] **Step 3: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/pages/Settings.tsx src/renderer/App.tsx
git commit -m "feat(ui): page Réglages (compose PathField)"
```

---

## Task 8 : Rework header (Shell)

**Files:**
- Modify: `src/renderer/layouts/Shell.tsx`

**Interfaces:**
- Consumes: `go('goSettings')` (Task 4), `window.api.quitApp()` (Task 5).

- [ ] **Step 1: Modifier le header**

Dans `src/renderer/layouts/Shell.tsx` :
- Sous-titre dashboard : remplacer `rédacteur en chef · /breves-ia` par `rédacteur en chef`.
- **Supprimer** le bouton Historique :

```tsx
        <Button variant="icon" title="Historique" onClick={() => go('goHist')}>
          ⏱
        </Button>
```

- Le bloc des boutons config devient (Soul · Agents · Réglages · Thème · Quitter) :

```tsx
        <Button variant="icon" title="SOUL — le style" onClick={() => go('goSoul')}>
          ✦
        </Button>
        <Button variant="icon" title="Agents" onClick={() => go('goAgents')}>
          ⚙
        </Button>
        <Button variant="icon" title="Réglages" onClick={() => go('goSettings')}>
          ⛭
        </Button>
        <Button variant="icon" title="Thème" onClick={() => toggleTheme()}>
          ◑
        </Button>
        <Button variant="icon" title="Quitter" onClick={() => void window.api.quitApp()}>
          ✕
        </Button>
```

(Le bouton Quitter est en dernier → extrême droite.)

- [ ] **Step 2: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/layouts/Shell.tsx
git commit -m "feat(ui): header — Réglages + Quitter, retrait historique et /breves-ia"
```

---

## Task 9 : Lien « voir l'historique » sur le Dashboard

**Files:**
- Modify: `src/renderer/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `go('goHist')` (existant).

- [ ] **Step 1: Remplacer l'en-tête « Éditions récentes »**

Dans `src/renderer/pages/Dashboard.tsx`, remplacer :

```tsx
        <Eyebrow style={{ margin: '0 0 9px' }}>
          Éditions récentes
        </Eyebrow>
```

par :

```tsx
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 9px' }}>
          <Eyebrow style={{ margin: 0 }}>Éditions récentes</Eyebrow>
          <button
            type="button"
            onClick={() => go('goHist')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              font: '500 12px var(--body)',
              color: 'var(--accent)',
            }}
          >
            voir l'historique →
          </button>
        </div>
```

- [ ] **Step 2: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/pages/Dashboard.tsx
git commit -m "feat(ui): lien « voir l'historique » sur le dashboard"
```

---

## Task 10 : `.env.example` + intégration packagée

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Compléter `.env.example`**

```bash
# Chemin du repo BoilingBrain (cwd des sous-commandes, éditions)
BREVES_BB_DIR=/Users/pleguern/Workspace/BoilingBrain
# Chemin du repo Brèves (SOUL + agents dans .claude/)
BREVES_REPO_DIR=/Users/pleguern/Workspace/breves-ia
# Binaire natif Claude Code exécuté par le SDK
BREVES_CLAUDE_BIN=/Users/pleguern/.local/bin/claude
```

- [ ] **Step 2: Storybook builde (toutes les stories OK) + build + réinstall packagé**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
npm run build-storybook 2>&1 | tail -5
npm run make 2>&1 | grep -iE "Making a dmg|Making distributables|FAILED|error"
bash scripts/install-local.sh
```

Expected: Storybook builde sans erreur (Input, StatusDot/error, PathField inclus) ; DMG construit ; app installée sans quarantaine.

- [ ] **Step 3: Vérification manuelle (à faire tourner par l'humain)**

Lancer `open "/Applications/Brèves IA.app"` puis vérifier :
- Header : ✦ Soul · ⚙ Agents · ⛭ Réglages · ◑ Thème · ✕ (extrême droite) ; plus de ⏱ ; sous-titre `rédacteur en chef` sans `/breves-ia`.
- Dashboard : lien « voir l'historique → » à droite de « Éditions récentes » ouvre l'historique.
- ⛭ Réglages : 3 chemins pré-remplis, pastille verte ; « Parcourir… » ouvre le Finder ; modifier un chemin invalide → pastille rouge ; Enregistrer un chemin valide → toast « Réglages enregistrés ».
- ✕ ferme l'app.
- Après changement de chemin valide → lancer une édition utilise bien la nouvelle config (à chaud).

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs(env): documenter BREVES_REPO_DIR et BREVES_CLAUDE_BIN"
```

---

## Self-Review (rempli)

- **Couverture spec** : persistance JSON (T1), précédence env>file>défaut (T2), init 1er lancement (T6), application à chaud (T3+T5), validation+pastille (T1 pathValid + T7.2 StatusDot/error + T7.3 PathField + T7.4 page), picker Finder (T5/T6), getSettings/saveSettings/validatePath/pickPath/quitApp (T5), header rework + quit (T8), historique en lien (T9), retrait /breves-ia (T8), .env.example (T10). ✓
- **Design system / stories** : `Input` primitive + story (T7.1), `StatusDot` état `error` + story (T7.2), `PathField` composite + story (T7.3) ; page sans style inline (T7.4) ; storybook buildé en T10. ✓
- **Placeholders** : aucun ; code complet à chaque step.
- **Cohérence des types** : `SettingKey`/`SettingsState` définis dans `api.ts` (T5), importés par env.ts (T5 step 3c) et settings.handlers (T5) ; `UserConfig` (T1) = forme persistée ; `applyConfig(deps, patch, env)` signature constante T3↔T5 ; `PathFieldProps` (T7.3) ↔ usage page (T7.4) ; `StatusDot` état `'error'` (T7.2) consommé par PathField (T7.3) ; canaux IPC string identiques entre `ipc.ts` (T5) et tests (`'save-settings'`, `'get-settings'`). ✓
- **Ordre de barrière** : T5 et T6 changent ensemble `SystemBridge` + `registerAllHandlers` → commit conjoint (noté dans T5 step 4 / T6 step 3). T7.3 dépend de T7.1+T7.2 ; T7.4 dépend de T7.3 → exécuter 7.1→7.2→7.3→7.4 dans l'ordre.
