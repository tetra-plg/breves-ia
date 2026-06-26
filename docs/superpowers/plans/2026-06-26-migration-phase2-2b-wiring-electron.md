# Migration Phase 2.2b — Wiring Electron (ipc + main + preload + smoke) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Câbler le cœur Electron typé (2.2a) au runtime Forge : handlers IPC par domaine, `main/index.ts` réel (fenêtre + enregistrement IPC + env), `preload` exposant `window.api` (+ alias `window.breves`), externalisation du SDK, et un smoke de boot SDK lançable via `npm run smoke`.

**Architecture:** Les handlers sont des **fonctions `registerXHandlers(ipc, deps)`** prenant un `ipc` injecté (`{ handle }`) → testables en **Vitest headless** (pas d'Electron), routant vers le moteur 2.2a via `deps` mockées. `main/index.ts` (entrée Forge, CJS) instancie la fenêtre placeholder, charge l'env, construit `defaultDeps()`, enregistre les handlers, et — sous `BREVES_SMOKE=1` — charge le SDK puis quitte (drivé par le script smoke). Le SDK est externalisé du bundle Vite pour que l'`import()` dynamique résolve au runtime.

**Tech Stack:** TypeScript strict, Electron Forge + Vite, Vitest (headless), `@anthropic-ai/claude-agent-sdk` (externalisé + dynamique). Alias `@main`/`@shared`/`@domain`.

## Global Constraints

- Node ≥ 20. Projet ESM (`"type": "module"`). Main bundlé **CJS** par Vite.
- **Comportement inchangé** : les handlers sont des ports 1:1 des `ipcMain.handle` de [hud/main.mjs](../../../hud/main.mjs) ; la fenêtre garde sa config (`frame:false`, 400×760, DevTools). L'UI reste le **placeholder** Phase 1 (React = Phase 3).
- **Validation Zod à la frontière** : pour la commande, elle est assurée par `validateInputs` (Zod) **dans le moteur** (`runSkill`) ; on ne duplique pas au handler (ports thin, behavior-preserving). Ne JAMAIS brancher sur le *texte* des erreurs (carry-over 2.1).
- **SDK dynamique** : aucun `import`/`require` statique du SDK ; il est externalisé du bundle (`vite.main.config.ts`) et chargé en `import()`.
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée.
- **Ne pas modifier** `lib/*.mjs` ni `hud/*` (suppression = Phase 4). `npm run hud` (legacy ESM) reste cassé.
- **`repoDir` packagé différé en Phase 5** : 2.2b s'appuie sur `process.cwd()` (dev) ; seam `BREVES_REPO_DIR` en place.
- **Lancer `npm run typecheck` ET `npm run lint` ET `npm test` à chaque tâche.**
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md](../specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md).

**Patron de test des handlers** (headless, sans Electron) :
```js
function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
function fakeEvent() { const sent = []; return { sent, sender: { send: (ch, p) => sent.push({ ch, p }), isDestroyed: () => false } }; }
```
On enregistre via `fakeIpc`, on invoque `ipc.h['<canal>'](fakeEvent(), payload)` et on vérifie routage + `sender.send` (streaming). Les `deps` sont mockées comme dans `engine.test`.

---

### Task 1 : `shared/types/ipc.ts` + `shared/types/api.ts`

**Files:**
- Create: `src/shared/types/ipc.ts`, `src/shared/types/api.ts`

**Interfaces:**
- Produces (`ipc.ts`) : const `IPC` (map nom→canal littéral), types `IpcInvokeEvent`, `IpcHandler`, `IpcLike`.
- Produces (`api.ts`) : interface `Api` (forme de `window.api`).

> Modules de types (+ une const) : validés par `npm run typecheck` (pas de test runtime dédié ; consommés par les tâches suivantes).

- [ ] **Step 1 : Écrire `src/shared/types/ipc.ts`**

```ts
export const IPC = {
  sendCommand: 'send-command',
  commandEvent: 'command-event',
  getDashboard: 'get-dashboard',
  readEdition: 'read-edition',
  archiveIngest: 'archive-ingest',
  getSoulStructured: 'get-soul-structured',
  saveSoulSections: 'save-soul-sections',
  saveSoulEchantillons: 'save-soul-echantillons',
  getAgents: 'get-agents',
  saveAgent: 'save-agent',
  copy: 'copy',
  openExternal: 'open-external',
  hideWindow: 'hide-window',
} as const;

export interface IpcInvokeEvent {
  sender: {
    send(channel: string, payload: unknown): void;
    isDestroyed(): boolean;
  };
}

export type IpcHandler = (event: IpcInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;

export interface IpcLike {
  handle(channel: string, listener: IpcHandler): void;
}
```

- [ ] **Step 2 : Écrire `src/shared/types/api.ts`**

```ts
// Forme exacte exposée par le preload sous window.api (et l'alias window.breves).
export interface Api {
  sendCommand(skill: string, inputs: unknown): Promise<unknown>;
  onCommandEvent(cb: (ev: unknown) => void): void;
  getDashboard(): Promise<unknown>;
  readEdition(file: string): Promise<unknown>;
  archive(inputs: unknown): Promise<unknown>;
  getSoulStructured(): Promise<unknown>;
  saveSoulSections(edits: unknown): Promise<unknown>;
  saveSoulEchantillons(entries: unknown): Promise<unknown>;
  getAgents(): Promise<unknown>;
  saveAgent(name: string, edits: unknown): Promise<unknown>;
  copy(text: string): Promise<unknown>;
  openExternal(url: string): Promise<unknown>;
  hideWindow(): Promise<unknown>;
}
```

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` → exit 0. Run : `npm run lint` → exit 0. Run : `npm test` → 19 fichiers verts (inchangé).

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2b): shared/types/ipc.ts (canaux + IpcLike) + api.ts (window.api)"
```

---

### Task 2 : `main/ipc/command.handlers.ts`

**Files:**
- Create: `src/main/ipc/command.handlers.ts`
- Test: `tests/main/command.handlers.test.mjs`

**Interfaces:**
- Consumes : `dispatch`, `archiveAndIngest`, type `EngineDeps` (`@main/engine`) ; `IPC`, `IpcLike`, `IpcInvokeEvent` (`@shared/types/ipc`).
- Produces : `registerCommandHandlers(ipc: IpcLike, deps: EngineDeps): void` (enregistre `send-command` et `archive-ingest`).

- [ ] **Step 1 : Écrire le test**

`tests/main/command.handlers.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerCommandHandlers } from '@main/ipc/command.handlers';

function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
function fakeEvent() { const sent = []; return { sent, sender: { send: (ch, p) => sent.push({ ch, p }), isDestroyed: () => false } }; }

test('send-command : route vers le moteur, stream les events, renvoie la valeur', async () => {
  const ipc = fakeIpc();
  // deps mockées : runSkill émet un event puis renvoie ok
  const deps = {
    repoDir: '/repo', bbDir: '/bb', readdir: () => [],
    runSkill: async (a) => { a.onEvent({ type: 'topic-detected', key: 'k', sujet: 's' }); return { ok: true, value: { topics: [] } }; },
  };
  registerCommandHandlers(ipc, deps);
  const e = fakeEvent();
  const r = await ipc.h['send-command'](e, { skill: 'breves-verify', inputs: { sujets: 'x' } });
  assert.equal(r.ok, true);
  assert.deepEqual(e.sent, [{ ch: 'command-event', p: { type: 'topic-detected', key: 'k', sujet: 's' } }]);
});

test('send-command : capture une exception du moteur en { ok:false }', async () => {
  const ipc = fakeIpc();
  const deps = { repoDir: '/r', bbDir: '/b', readdir: () => [], runSkill: async () => { throw new Error('boom'); } };
  registerCommandHandlers(ipc, deps);
  const r = await ipc.h['send-command'](fakeEvent(), { skill: 'breves-verify', inputs: { sujets: 'x' } });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'boom');
});

test('archive-ingest : route vers archiveAndIngest', async () => {
  const ipc = fakeIpc();
  let seen = null;
  const deps = {
    repoDir: '/r', bbDir: '/b', readdir: () => [],
    runSkill: async (a) => { seen = a.skill; return { ok: true, value: {} }; },
    runRaw: async () => ({ ok: true, text: 'ok' }),
  };
  registerCommandHandlers(ipc, deps);
  const r = await ipc.h['archive-ingest'](fakeEvent(), { teamsText: 't', topics: [], sources: [] });
  assert.equal(r.ok, true);
  assert.equal(seen, 'breves-archive');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/command.handlers.test.mjs` → FAIL (import non résolu).

- [ ] **Step 3 : Écrire `src/main/ipc/command.handlers.ts`**

```ts
import { dispatch, archiveAndIngest, type EngineDeps } from '@main/engine';
import { IPC, type IpcLike, type IpcInvokeEvent } from '@shared/types/ipc';

export function registerCommandHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.sendCommand, async (e: IpcInvokeEvent, payload: unknown) => {
    const { skill, inputs } = (payload ?? {}) as { skill: string; inputs: Record<string, unknown> };
    const onEvent = (ev: unknown): void => {
      if (!e.sender.isDestroyed()) e.sender.send(IPC.commandEvent, ev);
    };
    try {
      return await dispatch({ skill, inputs, onEvent }, deps);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipc.handle(IPC.archiveIngest, async (e: IpcInvokeEvent, payload: unknown) => {
    const inputs = (payload ?? {}) as {
      teamsText: string;
      topics: unknown[];
      sources: unknown[];
      leconSOUL?: string;
    };
    const onEvent = (ev: unknown): void => {
      if (!e.sender.isDestroyed()) e.sender.send(IPC.commandEvent, ev);
    };
    try {
      return await archiveAndIngest({ ...inputs, onEvent }, deps);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/command.handlers.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 20 fichiers verts (nouveau test).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2b): main/ipc/command.handlers.ts (send-command, archive-ingest) + test headless"
```

---

### Task 3 : `dashboard` + `soul` + `agents` handlers

**Files:**
- Create: `src/main/ipc/dashboard.handlers.ts`, `src/main/ipc/soul.handlers.ts`, `src/main/ipc/agents.handlers.ts`
- Test: `tests/main/readonly.handlers.test.mjs`

**Interfaces:**
- Consumes : `getDashboard`, `readEdition`, `getSoul`, `saveSoulSections`, `saveSoulEchantillons`, `getAgents`, `saveAgent`, type `EngineDeps` (`@main/engine`) ; `IPC`, `IpcLike`, `IpcInvokeEvent` (`@shared/types/ipc`).
- Produces : `registerDashboardHandlers(ipc, deps)`, `registerSoulHandlers(ipc, deps)`, `registerAgentsHandlers(ipc, deps)`.

- [ ] **Step 1 : Écrire le test**

`tests/main/readonly.handlers.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerDashboardHandlers } from '@main/ipc/dashboard.handlers';
import { registerSoulHandlers } from '@main/ipc/soul.handlers';
import { registerAgentsHandlers } from '@main/ipc/agents.handlers';

function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
const e = { sender: { send: () => {}, isDestroyed: () => false } };

test('get-dashboard + read-edition routent vers le moteur', async () => {
  const ipc = fakeIpc();
  const deps = { repoDir: '/r', bbDir: '/b', readSoul: () => ({ version: 'v8', rules: [], examples: [], lessons: [] }), listEditions: () => [], readFile: () => '# x' };
  registerDashboardHandlers(ipc, deps);
  const d = await ipc.h['get-dashboard'](e);
  assert.equal(d.soul.version, 'v8');
  const txt = await ipc.h['read-edition'](e, '2026-06-17-breves-ia-merim.md');
  assert.equal(txt, '# x');
});

test('soul handlers routent get/save', async () => {
  const ipc = fakeIpc();
  let wrote = false;
  const SOUL = '## 1. Qui parle\nA\n\n## 2. Audience\nB\n\n## 3. Voix\nC\n\n## 4. Lignes rouges\nD\n\n## 5. Échantillons vivants\n\n## 6. Journal\n';
  const deps = { repoDir: '/r', readFile: () => SOUL, writeFile: () => { wrote = true; } };
  registerSoulHandlers(ipc, deps);
  const s = await ipc.h['get-soul-structured'](e);
  assert.equal(s.quiParle, 'A');
  const r = await ipc.h['save-soul-sections'](e, { quiParle: 'X', audience: 'Y', voix: 'Z', lignesRouges: 'W' });
  assert.equal(r.ok, true);
  assert.equal(wrote, true);
});

test('agents handlers routent get/save', async () => {
  const ipc = fakeIpc();
  const AGENT = '---\nname: sceptique\n---\nprompt';
  const deps = { repoDir: '/r', readdir: () => ['sceptique.md'], readFile: () => AGENT, writeFile: () => {} };
  registerAgentsHandlers(ipc, deps);
  const list = await ipc.h['get-agents'](e);
  assert.equal(list[0].name, 'sceptique');
  const r = await ipc.h['save-agent'](e, { name: 'sceptique', edits: { systemPrompt: 'nouveau' } });
  assert.equal(r.ok, true);
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/readonly.handlers.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire les trois modules**

`src/main/ipc/dashboard.handlers.ts` :
```ts
import { getDashboard, readEdition, type EngineDeps } from '@main/engine';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerDashboardHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getDashboard, () => getDashboard(deps));
  ipc.handle(IPC.readEdition, (_e, file: unknown) => readEdition(deps, String(file)));
}
```

`src/main/ipc/soul.handlers.ts` :
```ts
import { getSoul, saveSoulSections, saveSoulEchantillons, type EngineDeps } from '@main/engine';
import type { Echantillon, SoulSectionEdits } from '@domain/soul';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerSoulHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getSoulStructured, () => getSoul(deps));
  ipc.handle(IPC.saveSoulSections, (_e, edits: unknown) => saveSoulSections(deps, edits as SoulSectionEdits));
  ipc.handle(IPC.saveSoulEchantillons, (_e, entries: unknown) => saveSoulEchantillons(deps, entries as Echantillon[]));
}
```

`src/main/ipc/agents.handlers.ts` :
```ts
import { getAgents, saveAgent, type EngineDeps, type AgentEdits } from '@main/engine';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerAgentsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getAgents, () => getAgents(deps));
  ipc.handle(IPC.saveAgent, (_e, payload: unknown) => {
    const { name, edits } = (payload ?? {}) as { name: string; edits: AgentEdits };
    return saveAgent(deps, name, edits);
  });
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/readonly.handlers.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 21 fichiers verts.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2b): dashboard/soul/agents handlers + test headless"
```

---

### Task 4 : `main/ipc/system.handlers.ts` + `main/ipc/index.ts`

**Files:**
- Create: `src/main/ipc/system.handlers.ts`, `src/main/ipc/index.ts`
- Test: `tests/main/system.handlers.test.mjs`

**Interfaces:**
- Consumes : `IPC`, `IpcLike` (`@shared/types/ipc`) ; `EngineDeps` (`@main/engine`) ; les 4 register* précédents.
- Produces : interface `SystemBridge { writeClipboard(text: string): void; openExternal(url: string): void; hideWindow(): void }` ; `registerSystemHandlers(ipc: IpcLike, sys: SystemBridge): void` ; `registerAllHandlers(ipc: IpcLike, deps: EngineDeps, sys: SystemBridge): void`.

> Les APIs Electron (clipboard/shell/fenêtre) sont **injectées** via `SystemBridge` → testable headless. `main/index.ts` fournira l'implémentation réelle.

- [ ] **Step 1 : Écrire le test**

`tests/main/system.handlers.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerSystemHandlers } from '@main/ipc/system.handlers';

function fakeIpc() { const h = {}; return { handle: (ch, fn) => { h[ch] = fn; }, h }; }
const e = { sender: { send: () => {}, isDestroyed: () => false } };

test('copy / open-external (https only) / hide-window', async () => {
  const ipc = fakeIpc();
  const calls = { copied: null, opened: null, hidden: 0 };
  const sys = {
    writeClipboard: (t) => { calls.copied = t; },
    openExternal: (u) => { calls.opened = u; },
    hideWindow: () => { calls.hidden++; },
  };
  registerSystemHandlers(ipc, sys);
  assert.equal(await ipc.h['copy'](e, 'salut'), true);
  assert.equal(calls.copied, 'salut');
  await ipc.h['open-external'](e, 'https://ok.com');
  assert.equal(calls.opened, 'https://ok.com');
  await ipc.h['open-external'](e, 'javascript:alert(1)'); // non-http : ignoré
  assert.equal(calls.opened, 'https://ok.com');            // inchangé
  await ipc.h['hide-window'](e);
  assert.equal(calls.hidden, 1);
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/main/system.handlers.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire les deux modules**

`src/main/ipc/system.handlers.ts` :
```ts
import { IPC, type IpcLike } from '@shared/types/ipc';

export interface SystemBridge {
  writeClipboard(text: string): void;
  openExternal(url: string): void;
  hideWindow(): void;
}

export function registerSystemHandlers(ipc: IpcLike, sys: SystemBridge): void {
  ipc.handle(IPC.copy, (_e, text: unknown) => {
    sys.writeClipboard(String(text));
    return true;
  });
  ipc.handle(IPC.openExternal, (_e, url: unknown) => {
    if (/^https?:\/\//.test(String(url))) sys.openExternal(String(url));
  });
  ipc.handle(IPC.hideWindow, () => {
    sys.hideWindow();
  });
}
```

`src/main/ipc/index.ts` :
```ts
import type { EngineDeps } from '@main/engine';
import type { IpcLike } from '@shared/types/ipc';
import { registerCommandHandlers } from '@main/ipc/command.handlers';
import { registerDashboardHandlers } from '@main/ipc/dashboard.handlers';
import { registerSoulHandlers } from '@main/ipc/soul.handlers';
import { registerAgentsHandlers } from '@main/ipc/agents.handlers';
import { registerSystemHandlers, type SystemBridge } from '@main/ipc/system.handlers';

export function registerAllHandlers(ipc: IpcLike, deps: EngineDeps, sys: SystemBridge): void {
  registerCommandHandlers(ipc, deps);
  registerDashboardHandlers(ipc, deps);
  registerSoulHandlers(ipc, deps);
  registerAgentsHandlers(ipc, deps);
  registerSystemHandlers(ipc, sys);
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/main/system.handlers.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 22 fichiers verts.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2b): system.handlers (bridge injecté) + ipc/index registerAllHandlers + test"
```

---

### Task 5 : `preload/index.ts` (window.api + alias) + externalisation SDK

**Files:**
- Modify: `src/preload/index.ts` (remplace le stub Phase 1)
- Modify: `vite.main.config.ts` (ajoute `rollupOptions.external` pour le SDK)

**Interfaces:**
- Consumes : `IPC` (`@shared/types/ipc`), type `Api` (`@shared/types/api`).
- Produces : `window.api` (et alias `window.breves`) exposés via `contextBridge`.

> Pas de test unitaire (le preload nécessite le contexte renderer Electron) : validé par `typecheck` + `lint` + le smoke (Task 6).

- [ ] **Step 1 : Écrire `src/preload/index.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/types/ipc';
import type { Api } from '@shared/types/api';

const api: Api = {
  sendCommand: (skill, inputs) => ipcRenderer.invoke(IPC.sendCommand, { skill, inputs }),
  onCommandEvent: (cb) => {
    ipcRenderer.on(IPC.commandEvent, (_e, ev) => cb(ev));
  },
  getDashboard: () => ipcRenderer.invoke(IPC.getDashboard),
  readEdition: (file) => ipcRenderer.invoke(IPC.readEdition, file),
  archive: (inputs) => ipcRenderer.invoke(IPC.archiveIngest, inputs),
  getSoulStructured: () => ipcRenderer.invoke(IPC.getSoulStructured),
  saveSoulSections: (edits) => ipcRenderer.invoke(IPC.saveSoulSections, edits),
  saveSoulEchantillons: (entries) => ipcRenderer.invoke(IPC.saveSoulEchantillons, entries),
  getAgents: () => ipcRenderer.invoke(IPC.getAgents),
  saveAgent: (name, edits) => ipcRenderer.invoke(IPC.saveAgent, { name, edits }),
  copy: (text) => ipcRenderer.invoke(IPC.copy, text),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  hideWindow: () => ipcRenderer.invoke(IPC.hideWindow),
};

contextBridge.exposeInMainWorld('api', api);
// Alias rétro-compatible le temps que le renderer reste vanilla/migre (retiré en Phase 4).
contextBridge.exposeInMainWorld('breves', api);
```

- [ ] **Step 2 : Externaliser le SDK dans `vite.main.config.ts`**

Dans `vite.main.config.ts`, ajouter `rollupOptions.external` au bloc `build` (à côté de `lib`) :
```ts
  build: {
    lib: {
      entry: 'src/main/index.ts',
      fileName: () => 'main.cjs',
      formats: ['cjs'],
    },
    rollupOptions: { external: ['@anthropic-ai/claude-agent-sdk'] },
  },
```
(Garder le bloc `resolve.alias` intact.)

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` → exit 0 (le preload compile contre `Api`). Run : `npm run lint` → exit 0. Run : `npm test` → 22 fichiers verts (inchangé).

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2b): preload expose window.api (+ alias window.breves) + externalise le SDK (vite.main)"
```

---

### Task 6 : `main/index.ts` réel + smoke de boot

**Files:**
- Modify: `src/main/index.ts` (remplace le placeholder : fenêtre + env + handlers + hook smoke)
- Create: `scripts/smoke-boot.mjs`
- Modify: `package.json` (script `smoke`)

**Interfaces:**
- Consumes : `registerAllHandlers`, `SystemBridge` (`@main/ipc/*`) ; `defaultDeps` (`@main/engine`) ; `loadEnvFile` (`@main/io/env`) ; `APP_NAME`/`WINDOW_WIDTH`/`WINDOW_HEIGHT` (`@config/constants`) ; `IpcLike` (`@shared/types/ipc`).
- Produces : l'app Forge qui boote, enregistre les handlers, rend le placeholder ; sous `BREVES_SMOKE=1`, charge le SDK puis quitte.

> Pas de test unitaire (entrée Electron) : validé par `npm run typecheck`, `npm run lint`, et `npm run smoke`.

- [ ] **Step 1 : Écrire `src/main/index.ts`**

```ts
import { app, BrowserWindow, Menu, ipcMain, clipboard, shell } from 'electron';
import path from 'node:path';
import { APP_NAME, WINDOW_WIDTH, WINDOW_HEIGHT } from '@config/constants';
import { defaultDeps } from '@main/engine';
import { loadEnvFile } from '@main/io/env';
import { registerAllHandlers } from '@main/ipc';
import type { SystemBridge } from '@main/ipc/system.handlers';
import type { IpcLike } from '@shared/types/ipc';

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    title: APP_NAME,
    backgroundColor: '#e7e1d4',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  win.once('ready-to-show', () => win?.show());

  // DevTools : Cmd/Ctrl+Alt+I ou F12 (port de hud/main.mjs)
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    const key = (input.key || '').toLowerCase();
    if (key === 'f12' || ((input.meta || input.control) && input.alt && key === 'i')) {
      win?.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(() => {
  // Hook smoke : prouve le chargement du SDK dans le main Forge réel, puis quitte.
  if (process.env.BREVES_SMOKE === '1') {
    import('@anthropic-ai/claude-agent-sdk')
      .then((m) => {
        console.log('SMOKE_SDK_OK exports=' + Object.keys(m).length);
        app.quit();
      })
      .catch((e: unknown) => {
        console.log('SMOKE_SDK_FAIL ' + (e as Error).message);
        app.exit(1);
      });
    return;
  }

  Menu.setApplicationMenu(null);
  loadEnvFile();
  const deps = defaultDeps();
  const sys: SystemBridge = {
    writeClipboard: (text) => clipboard.writeText(text),
    openExternal: (url) => {
      void shell.openExternal(url);
    },
    hideWindow: () => win?.hide(),
  };
  registerAllHandlers(ipcMain as unknown as IpcLike, deps, sys);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 2 : Écrire `scripts/smoke-boot.mjs`**

```js
// Smoke de boot : lance le main Forge avec BREVES_SMOKE=1, attend SMOKE_SDK_OK (ou échec), puis tue.
import { spawn } from 'node:child_process';

const child = spawn('npm', ['start'], {
  env: { ...process.env, BREVES_SMOKE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let out = '';
let done = false;
function finish(code, msg) {
  if (done) return;
  done = true;
  console.log(msg);
  try { child.kill('SIGTERM'); } catch { /* ignore */ }
  // laisse Forge/electron se fermer
  setTimeout(() => process.exit(code), 1500);
}

const onData = (buf) => {
  out += buf.toString();
  if (/SMOKE_SDK_OK/.test(out)) finish(0, '✅ SMOKE: le SDK se charge dans le main Forge.');
  else if (/SMOKE_SDK_FAIL|require is not defined|Cannot find module|Unable to find/.test(out)) {
    finish(1, '🔴 SMOKE: échec de boot/chargement SDK.\n' + out.slice(-800));
  }
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);

setTimeout(() => finish(1, '🔴 SMOKE: timeout (60s) sans SMOKE_SDK_OK.\n' + out.slice(-800)), 60000);
```

- [ ] **Step 3 : Ajouter le script `smoke`**

Dans `package.json` `scripts`, ajouter :
```json
"smoke": "node scripts/smoke-boot.mjs"
```

- [ ] **Step 4 : Vérifier qualité + suite**

Run : `npm run typecheck` → exit 0. Run : `npm run lint` → exit 0. Run : `npm test` → 22 fichiers verts.

- [ ] **Step 5 : Lancer le smoke (nécessite un display local)**

Run : `npm run smoke`
Expected : `✅ SMOKE: le SDK se charge dans le main Forge.` (exit 0). En CI/headless sans display, ce smoke est lancé manuellement ; il n'est PAS dans `npm test`.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.2b): main/index.ts réel (fenêtre + env + handlers + hook smoke) + npm run smoke"
```

---

## Critères de réussite Phase 2.2b (revue finale)

- [ ] `shared/types/{ipc,api}.ts` ; `main/ipc/{command,dashboard,soul,agents,system}.handlers.ts` + `index.ts` ; `preload/index.ts` (window.api + alias) ; `main/index.ts` réel ; `vite.main.config.ts` externalise le SDK ; `scripts/smoke-boot.mjs` + `npm run smoke`.
- [ ] Handlers testés **headless** (ipc injecté, deps mockées) ; `npm test` ≈ 22 fichiers verts ; `npm run typecheck` + `npm run lint` exit 0.
- [ ] `npm run smoke` → `SMOKE_SDK_OK` (boot SDK réel prouvé).
- [ ] `npm start` boote, enregistre les handlers, rend le placeholder (pas de crash). UI réelle = Phase 3.
- [ ] `lib/*.mjs` et `hud/*` **inchangés**. Comportement des handlers identique à `hud/main.mjs`.
- [ ] La preload typée `window.api` est **prête pour le renderer React (Phase 3)**.
