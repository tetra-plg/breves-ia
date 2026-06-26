# Migration Phase 1 — Fondation : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser toute la toolchain (Vitest, TypeScript strict, ESLint/Prettier, Electron Forge + Vite) et le squelette de dossiers cible, **sans modifier le comportement fonctionnel** ni convertir le code métier.

**Architecture:** On ajoute la chaîne moderne *à côté* du code `.mjs` existant. Les 16 tests sont portés vers Vitest en important toujours les modules `.mjs` (preuve de parité avant toute conversion). Forge+Vite ouvre une fenêtre placeholder ; l'UI réelle reste lançable via `npm run hud` (conservé jusqu'en Phase 4). Aucune ligne de `lib/` ni de `hud/` n'est convertie ici.

**Tech Stack:** Electron Forge 7 + plugin Vite, TypeScript 5 (strict), React 18 (deps installées, non utilisées avant Phase 3), Zustand, Zod, Vitest, ESLint 9 (flat config) + Prettier.

## Global Constraints

- **Node ≥ 20** (CI/dev actuel : v20.18.0).
- **Aucun changement de comportement fonctionnel** ; `npm run hud` et `npm run breves` doivent continuer de marcher à l'identique tout au long de la Phase 1.
- **Ne pas convertir** le code de `lib/` / `hud/` en TS (c'est la Phase 2). Les `.mjs` restent intacts.
- **Ne jamais déclencher d'archivage réel** (`breves-archive` écrit dans le wiki) pendant les tests.
- **Suite de tests verte à chaque commit** — filet anti-régression principal.
- Projet en ESM (`"type": "module"`) — les configs JS pures sont en `.mjs`, les configs TS en `.ts`.
- Spec de référence : [docs/superpowers/specs/2026-06-26-migration-ts-react-electron-design.md](../specs/2026-06-26-migration-ts-react-electron-design.md).

---

### Task 1 : Vitest + port des 16 tests

**Files:**
- Create: `vitest.config.mjs`
- Move: `test/*.test.mjs` → `tests/*.test.mjs` (16 fichiers) **et** `test/fixtures/` → `tests/fixtures/`
- Modify: chaque `tests/*.test.mjs` — ligne d'import `node:test` → `vitest` (1 ligne/fichier)
- Modify: `package.json` (dépendance `vitest` + script `test`)

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: `npm test` exécute Vitest sur `tests/**/*.test.mjs` ; les modules `lib/*.mjs` sont importés via `../lib/...` (chemins inchangés) et les fixtures via `./fixtures/...`.

- [ ] **Step 1 : Installer Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2 : Déplacer les tests et fixtures (git mv, conserve l'historique)**

```bash
mkdir -p tests
git mv test/fixtures tests/fixtures
for f in test/*.test.mjs; do git mv "$f" "tests/$(basename "$f")"; done
rmdir test 2>/dev/null || true
ls tests
```
Expected : les 16 `*.test.mjs` + `fixtures/` listés sous `tests/`. Les imports `../lib/*.mjs` restent valides (même profondeur), les fixtures `./fixtures/*` aussi (relatifs au fichier).

- [ ] **Step 3 : Adapter l'import de `test` (node:test → vitest) dans les 16 fichiers**

```bash
cd tests && sed -i '' "s/import { test } from 'node:test';/import { test } from 'vitest';/" *.test.mjs && cd ..
grep -l "from 'node:test'" tests/*.test.mjs && echo "RESTE DU node:test — A CORRIGER" || echo "OK: plus aucun node:test"
```
Expected : `OK: plus aucun node:test`. Les `import assert from 'node:assert/strict'` restent inchangés (Vitest exécute `node:assert`, qui lève sur échec).

- [ ] **Step 4 : Créer la config Vitest**

`vitest.config.mjs` :
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
  },
});
```

- [ ] **Step 5 : Brancher le script `test` sur Vitest**

Dans `package.json`, remplacer `"test": "node --test"` par :
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6 : Lancer la suite et vérifier la parité (16 fichiers verts)**

Run : `npm test`
Expected : Vitest passe — `Test Files  16 passed (16)`, tous les tests au vert (parité avec l'ancien `node --test`).

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "test(phase1): port des 16 tests node:test → Vitest (lib .mjs inchangée)"
```

---

### Task 2 : TypeScript strict + ESLint + Prettier

**Files:**
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json` (devDeps TS/lint/format + scripts `typecheck`, `lint`, `format`)

**Interfaces:**
- Consumes: projet ESM avec Vitest opérationnel (Task 1).
- Produces: `npm run typecheck` (`tsc --noEmit`) en mode strict ; `npm run lint` (ESLint flat config) ; `npm run format`. Le `tsconfig` cible `src/**` (encore vide) — il ne type PAS `lib/`/`hud/` `.mjs`.

- [ ] **Step 1 : Installer TypeScript, ESLint, Prettier et types**

```bash
npm install -D typescript @types/node @types/react @types/react-dom \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh \
  globals prettier eslint-config-prettier
```

- [ ] **Step 2 : Créer `tsconfig.json` (strict, cible src/)**

`tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "*.config.ts"]
}
```
Note : `include` ne contient PAS `lib`/`hud` — leurs `.mjs` ne sont pas typés en Phase 1. `src/` est encore vide ; `tsc` doit passer sans erreur (zéro fichier à typer).

- [ ] **Step 3 : Créer `eslint.config.mjs` (flat config, TS + React-hooks)**

`eslint.config.mjs` :
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['node_modules', '.vite', 'out', 'dist', 'lib', 'hud', 'scripts', 'tests'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettier,
);
```
Note : `lib`, `hud`, `scripts`, `tests` (encore en `.mjs`/JS) sont ignorés — ESLint ne couvre que le futur `src/**` TS.

- [ ] **Step 4 : Créer la config Prettier**

`.prettierrc.json` :
```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

`.prettierignore` :
```text
node_modules
.vite
out
dist
package-lock.json
```

- [ ] **Step 5 : Ajouter les scripts**

Dans `package.json`, ajouter aux `scripts` :
```json
"typecheck": "tsc --noEmit",
"lint": "eslint .",
"format": "prettier --write ."
```

- [ ] **Step 6 : Vérifier typecheck + lint (src/ vide ⇒ doivent passer)**

Run : `npm run typecheck`
Expected : aucune erreur (aucun fichier dans `src/`, sortie vide, exit 0).

Run : `npm run lint`
Expected : aucune erreur ESLint (rien à linter sous `src/`), exit 0.

- [ ] **Step 7 : Vérifier que les tests sont toujours verts**

Run : `npm test`
Expected : `Test Files  16 passed (16)` (rien n'a changé côté tests).

- [ ] **Step 8 : Commit**

```bash
git add -A
git commit -m "chore(phase1): toolchain TypeScript strict + ESLint flat + Prettier"
```

---

### Task 3 : Squelette `src/` + alias de chemins

**Files:**
- Create: `src/config/constants.ts`
- Create: `.gitkeep` dans `src/{main,preload,renderer,domain,shared,assets}` (+ sous-dossiers clés)
- Create: `tests/alias.test.mjs`
- Modify: `tsconfig.json` (`baseUrl` + `paths`)
- Modify: `vitest.config.mjs` (`resolve.alias`)

**Interfaces:**
- Consumes: tsconfig strict (Task 2), Vitest (Task 1).
- Produces: alias `@config` (et `@main @renderer @shared @domain @assets`) résolus identiquement par TypeScript et Vitest. `src/config/constants.ts` exporte `APP_NAME: string`, `WINDOW_WIDTH: number`, `WINDOW_HEIGHT: number`.

- [ ] **Step 1 : Créer le constant module (premier vrai fichier TS)**

`src/config/constants.ts` :
```ts
export const APP_NAME = 'Brèves IA';
export const WINDOW_WIDTH = 400;
export const WINDOW_HEIGHT = 760;
```

- [ ] **Step 2 : Figer le squelette de dossiers**

```bash
mkdir -p src/main/ipc src/main/services src/main/io \
         src/preload src/renderer/pages src/renderer/components \
         src/renderer/hooks src/renderer/store src/renderer/styles \
         src/domain src/shared/types src/shared/schemas src/assets
find src -type d -empty -exec touch {}/.gitkeep \;
ls -R src | head -40
```
Expected : l'arborescence cible de la spec apparaît (dossiers vides marqués par `.gitkeep`).

- [ ] **Step 3 : Écrire le test d'alias (échec attendu d'abord)**

`tests/alias.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { APP_NAME, WINDOW_WIDTH, WINDOW_HEIGHT } from '@config/constants';

test('alias @config résout vers src/config et le module TS se charge', () => {
  assert.equal(APP_NAME, 'Brèves IA');
  assert.equal(WINDOW_WIDTH, 400);
  assert.equal(WINDOW_HEIGHT, 760);
});
```

- [ ] **Step 4 : Lancer le test pour le voir échouer (alias non câblé)**

Run : `npx vitest run tests/alias.test.mjs`
Expected : FAIL — Vitest ne résout pas `@config/constants` (« Failed to resolve import »).

- [ ] **Step 5 : Câbler les alias dans tsconfig**

Dans `tsconfig.json`, ajouter sous `compilerOptions` :
```json
"baseUrl": ".",
"paths": {
  "@main/*": ["src/main/*"],
  "@preload/*": ["src/preload/*"],
  "@renderer/*": ["src/renderer/*"],
  "@domain/*": ["src/domain/*"],
  "@shared/*": ["src/shared/*"],
  "@config/*": ["src/config/*"],
  "@assets/*": ["src/assets/*"]
}
```

- [ ] **Step 6 : Câbler les mêmes alias dans Vitest**

`vitest.config.mjs` (remplacer le contenu) :
```js
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@main': r('./src/main'),
      '@preload': r('./src/preload'),
      '@renderer': r('./src/renderer'),
      '@domain': r('./src/domain'),
      '@shared': r('./src/shared'),
      '@config': r('./src/config'),
      '@assets': r('./src/assets'),
    },
  },
});
```

- [ ] **Step 7 : Relancer le test d'alias (succès attendu) + typecheck**

Run : `npx vitest run tests/alias.test.mjs`
Expected : PASS (alias résolu, module TS chargé par Vitest).

Run : `npm run typecheck`
Expected : aucune erreur (TS résout `@config/constants`).

- [ ] **Step 8 : Suite complète toujours verte**

Run : `npm test`
Expected : `Test Files  17 passed (17)` (16 portés + `alias.test.mjs`).

- [ ] **Step 9 : Commit**

```bash
git add -A
git commit -m "feat(phase1): squelette src/ + alias @main/@renderer/@shared/@domain/@config/@assets"
```

---

### Task 4 : Electron Forge + Vite (fenêtre placeholder, `npm run hud` conservé)

**Files:**
- Create: `forge.config.ts`
- Create: `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`
- Create: `src/main/index.ts` (entry main provisoire), `src/preload/index.ts` (preload provisoire), `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/styles/placeholder.css`
- Create: `src/shared/types/vite-env.d.ts` (déclarations des constantes injectées par le plugin Vite de Forge)
- Modify: `package.json` (deps Forge/Electron/React, champ `main`, scripts `start`/`package`/`make`)

**Interfaces:**
- Consumes: alias (Task 3), `APP_NAME`/`WINDOW_WIDTH`/`WINDOW_HEIGHT` de `@config/constants`.
- Produces: `npm start` ouvre une fenêtre placeholder rendue par Vite/React. `npm run hud` (legacy) reste fonctionnel et inchangé. **Aucun** branchement de l'engine/IPC réel ici (Phase 2).

> **Note d'implémentation (anti-hallucination) :** les fichiers de config Forge+Vite sont sensibles à la version. On part des fichiers canoniques du template officiel `vite-typescript` (Forge 7), copiés depuis un scaffold jetable, puis adaptés aux chemins de ce repo. Ne pas écrire la config Forge « de mémoire ».

- [ ] **Step 1 : Installer Forge + plugin Vite + React + Electron**

```bash
npm install -D @electron-forge/cli @electron-forge/plugin-vite @electron-forge/plugin-fuses \
  @electron-forge/maker-squirrel @electron-forge/maker-zip @electron-forge/maker-deb @electron-forge/maker-rpm \
  @electron/fuses vite
npm install react react-dom zustand zod
```
Note : `electron` est déjà en devDependencies. `zustand`/`zod`/`react` sont installés maintenant mais non utilisés avant les phases 2/3.

- [ ] **Step 2 : Générer un scaffold de référence jetable**

```bash
SCRATCH="/private/tmp/claude-501/-Users-pleguern-Workspace-breves-ia/2cc688c7-4c89-4541-a0e9-16d2aff2a076/scratchpad"
npm create electron-app@latest "$SCRATCH/forge-ref" -- --template=vite-typescript
ls "$SCRATCH/forge-ref"
echo "--- forge.config.ts ---"; cat "$SCRATCH/forge-ref/forge.config.ts"
echo "--- vite.main.config.ts ---"; cat "$SCRATCH/forge-ref/vite.main.config.ts"
echo "--- vite.preload.config.ts ---"; cat "$SCRATCH/forge-ref/vite.preload.config.ts"
echo "--- vite.renderer.config.ts ---"; cat "$SCRATCH/forge-ref/vite.renderer.config.ts"
```
Expected : le dossier de référence contient `forge.config.ts` + les 3 `vite.*.config.ts` + `index.html` + `src/`. On lit ces fichiers pour copier la forme canonique.

- [ ] **Step 3 : Copier les 4 configs de référence à la racine du repo, puis adapter les entrées**

Copier `forge.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts` du scaffold vers la racine du repo. Puis, dans `forge.config.ts`, régler le bloc `VitePlugin` pour pointer vers nos chemins :
```ts
new VitePlugin({
  build: [
    { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
    { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts', target: 'preload' },
  ],
  renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
}),
```
Conserver le reste du `forge.config.ts` de référence (makers, FusesPlugin, `packagerConfig.asar`). Conserver les 3 `vite.*.config.ts` tels quels (forme canonique Forge).

- [ ] **Step 4 : Ajouter les déclarations des constantes injectées par Forge**

`src/shared/types/vite-env.d.ts` :
```ts
/// <reference types="vite/client" />

// Constantes injectées par @electron-forge/plugin-vite au build.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
```

- [ ] **Step 5 : Écrire le main provisoire**

`src/main/index.ts` :
```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { APP_NAME, WINDOW_WIDTH, WINDOW_HEIGHT } from '@config/constants';

// La sortie du main est en CommonJS (build Forge/Vite) : __dirname est disponible nativement.
function createWindow(): void {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    title: APP_NAME,
    backgroundColor: '#e7e1d4',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
```
Note : `preload`/`renderer` paths suivent la convention de sortie Forge (`.vite/build/...`). Aucun handler IPC ici (Phase 2).

- [ ] **Step 6 : Écrire le preload provisoire**

`src/preload/index.ts` :
```ts
// Preload provisoire (Phase 1) : aucune API exposée tant que l'engine n'est pas migré (Phase 2).
// La surface window.api typée arrive en Phase 2.
export {};
```

- [ ] **Step 7 : Écrire le renderer placeholder React**

`src/renderer/index.html` :
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brèves IA</title>
    <link rel="stylesheet" href="./styles/placeholder.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/renderer/main.tsx` :
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_NAME } from '@config/constants';

function App() {
  return (
    <main className="placeholder">
      <h1>{APP_NAME}</h1>
      <p>Migration TypeScript + React en cours — Phase 1 (fondation).</p>
      <p className="hint">UI legacy disponible via <code>npm run hud</code>.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/renderer/styles/placeholder.css` :
```css
body {
  margin: 0;
  background: #e7e1d4;
  color: #2b2620;
  font: 400 14px/1.6 system-ui, sans-serif;
}
.placeholder {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 0 24px;
}
.placeholder h1 {
  font-size: 22px;
  margin: 0;
}
.hint {
  font-size: 12px;
  opacity: 0.7;
}
```

- [ ] **Step 8 : Régler `package.json` (champ `main` + scripts Forge), sans casser `hud`/`breves`**

Dans `package.json` :
- Régler `"main": ".vite/build/main.js"` (point d'entrée Forge).
- Ajouter aux `scripts` :
```json
"start": "electron-forge start",
"package": "electron-forge package",
"make": "electron-forge make"
```
- **Conserver** `"hud": "electron hud/main.mjs"` et `"breves": "node scripts/breves-cli.mjs"` inchangés.

Note : passer `"main"` à `.vite/build/main.js` ne casse pas `npm run hud` (qui lance explicitement `electron hud/main.mjs`).

- [ ] **Step 9 : Lancer l'app Forge et vérifier la fenêtre placeholder**

Run : `npm start`
Expected : Electron démarre via Forge, une fenêtre 400×760 sans cadre s'ouvre affichant « Brèves IA » + le message de migration. Fermer la fenêtre termine le process.

- [ ] **Step 10 : Vérifier que l'app legacy marche toujours**

Run : `npm run hud`
Expected : l'UI legacy (companion.html + renderer.mjs) s'ouvre comme avant, comportement inchangé. Fermer.

- [ ] **Step 11 : typecheck + lint + tests**

Run : `npm run typecheck`
Expected : aucune erreur (les constantes `MAIN_WINDOW_VITE_*` sont déclarées, alias résolus).

Run : `npm run lint`
Expected : aucune erreur sous `src/**`.

Run : `npm test`
Expected : `Test Files  17 passed (17)`.

- [ ] **Step 12 : Nettoyer le scaffold de référence + commit**

```bash
rm -rf "/private/tmp/claude-501/-Users-pleguern-Workspace-breves-ia/2cc688c7-4c89-4541-a0e9-16d2aff2a076/scratchpad/forge-ref"
git add -A
git commit -m "feat(phase1): scaffold Electron Forge + Vite (fenêtre placeholder React, hud legacy conservé)"
```

---

## Critère de réussite Phase 1 (revue finale)

- [ ] `npm test` : 17 fichiers verts (16 portés + alias), parité avec l'ancien `node --test`.
- [ ] `npm start` (Forge) ouvre une fenêtre placeholder React.
- [ ] `npm run hud` et `npm run breves` marchent toujours (comportement legacy inchangé).
- [ ] `npm run typecheck` (strict) et `npm run lint` passent.
- [ ] Squelette `src/{main,preload,renderer,domain,shared,config,assets}` en place avec alias câblés (tsconfig + Vitest).
- [ ] Aucune conversion de `lib/`/`hud/` `.mjs` (réservée Phase 2).
