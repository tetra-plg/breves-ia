# Migration Phase 3a — Fondation React : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser la fondation du renderer React — `Api` typée + désabonnement `onCommandEvent`, store Zustand, styles extraits (look préservé), shell/layout, Storybook — et remplacer le placeholder Forge par une app React affichant un **Dashboard fonctionnel** (vraies données via `window.api`).

**Architecture:** Renderer React servi par Forge. Composants présentationnels (props in) ; la vue active vient du **store Zustand** (machine d'états `domain/navigation`, pas de router). Le CSS est extrait VERBATIM de `companion.html` (pixel-identique). Storybook (builder Vite) sert d'atelier visuel des composants ; la logique (store) est testée en Vitest.

**Tech Stack:** React 19, Zustand, TypeScript strict, Vite/Forge, Storybook (react-vite), Vitest.

## Global Constraints

- Node ≥ 20. Projet ESM. Look et comportement **identiques** à l'app vanilla.
- `window.api` est la **seule** frontière vers le main : aucun `import 'electron'` dans `src/renderer`.
- Réutiliser `domain/` (navigation, format…) ; **aucune logique métier nouvelle** dans les composants.
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée.
- **Ne pas modifier** `lib/*.mjs` ni `hud/*`.
- **Lancer `npm run typecheck` ET `npm run lint` ET `npm test` à chaque tâche.**
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase3-renderer-react-design.md](../specs/2026-06-26-migration-phase3-renderer-react-design.md).

---

### Task 1 : Typer `Api` + désabonnement `onCommandEvent` + `window.d.ts`

**Files:**
- Modify: `src/shared/types/api.ts`
- Modify: `src/preload/index.ts`
- Create: `src/renderer/window.d.ts`

**Interfaces:**
- Consumes : types `Dashboard` (`@main/engine`), `Soul`/`Echantillon`/`SoulSectionEdits` (`@domain/soul`), `Agent`/`AgentEdits`… via **`import type`** (effacés au build — aucun couplage runtime renderer→main).
- Produces : `Api` aux retours typés ; `onCommandEvent(cb): () => void` (désabonnement) ; global `Window.api`/`Window.breves`.

- [ ] **Step 1 : Réécrire `src/shared/types/api.ts`**

```ts
import type { Dashboard, AgentEdits } from '@main/engine';
import type { Soul, Echantillon, SoulSectionEdits } from '@domain/soul';
import type { Agent } from '@domain/agents';

// Résultat générique des commandes/écritures (le flag {ok} est 1:1 ; cf. carry-over 2.1).
export type ApiResult<T = unknown> = { ok: true; value: T } | { ok: false; error: string };
export type SaveResult = { ok: boolean; error?: string };

// Forme exposée par le preload sous window.api (et l'alias window.breves).
export interface Api {
  sendCommand(skill: string, inputs: unknown): Promise<ApiResult>;
  onCommandEvent(cb: (ev: unknown) => void): () => void;
  getDashboard(): Promise<Dashboard>;
  readEdition(file: string): Promise<string | null>;
  archive(inputs: unknown): Promise<ApiResult & { ingest?: { ok: boolean; text: string } }>;
  getSoulStructured(): Promise<Soul | null>;
  saveSoulSections(edits: SoulSectionEdits): Promise<SaveResult>;
  saveSoulEchantillons(entries: Echantillon[]): Promise<SaveResult>;
  getAgents(): Promise<Agent[]>;
  saveAgent(name: string, edits: AgentEdits): Promise<SaveResult>;
  copy(text: string): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  hideWindow(): Promise<void>;
}
```

- [ ] **Step 2 : Mettre à jour `onCommandEvent` dans `src/preload/index.ts`**

Remplacer la méthode `onCommandEvent` par une version renvoyant un désabonnement :
```ts
  onCommandEvent: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, ev: unknown): void => cb(ev);
    ipcRenderer.on(IPC.commandEvent, listener);
    return () => {
      ipcRenderer.removeListener(IPC.commandEvent, listener);
    };
  },
```
(Le reste du fichier — les autres méthodes, `contextBridge.exposeInMainWorld('api'|'breves', api)` — est inchangé.)

- [ ] **Step 3 : Créer `src/renderer/window.d.ts`**

```ts
import type { Api } from '@shared/types/api';

declare global {
  interface Window {
    api: Api;
    breves: Api;
  }
}

export {};
```

- [ ] **Step 4 : Vérifier**

Run : `npm run typecheck` → exit 0 (les `import type` sont effacés ; `Api` compile contre les vrais types). Run : `npm run lint` → exit 0. Run : `npm test` → 22 fichiers verts (inchangé).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase3a): Api aux retours typés + onCommandEvent désabonnable + window.d.ts"
```

---

### Task 2 : Extraire les styles (look préservé)

**Files:**
- Create: `src/renderer/styles/tokens.css`, `src/renderer/styles/app.css`

**Interfaces:**
- Produces : deux feuilles globales reprenant VERBATIM le `<style>` de `hud/companion.html` (lignes ~10 à ~128).

- [ ] **Step 1 : Créer `src/renderer/styles/tokens.css`**

Copier VERBATIM depuis `hud/companion.html` le bloc `:root{ … }` ET le bloc `body.dark{ … }` ET les resets de base (`*{box-sizing}`, `html,body{…}`, `body{…}`, les `@keyframes spin/pulse`, les `::-webkit-scrollbar*`, `::selection`, `[contenteditable]:focus`, `button{…}`, `[hidden]{…}`). C'est le début du `<style>` jusqu'à la ligne précédant `.win{…}`.

- [ ] **Step 2 : Créer `src/renderer/styles/app.css`**

Copier VERBATIM le reste du `<style>` de `hud/companion.html` à partir de `.win{ … }` jusqu'à la fin du bloc `<style>` (toutes les classes de composants : `.head`, `.iconbtn`, `.stepper`, `.step`, `.card`, `.cta`, `.enq`, `.pill`, `.alert`, `.corr-item`, `.overlay`, `.modal`, `.toast`, `.ed-*`, etc.).

- [ ] **Step 3 : Vérifier (les CSS sont du contenu statique)**

Run : `npm run lint` → exit 0 (ESLint ne lint pas le CSS ; vérifie juste qu'aucun fichier TS n'a régressé). Run : `npm test` → 22 fichiers verts.
Vérifier à l'œil que `tokens.css` contient bien les 16 tokens `:root` + `body.dark`, et `app.css` les classes `.win`/`.head`/`.toast`/`.card`.

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "feat(phase3a): styles extraits de companion.html (tokens.css + app.css, look préservé)"
```

---

### Task 3 : Store Zustand `app.store.ts`

**Files:**
- Create: `src/renderer/store/app.store.ts`
- Test: `tests/renderer/app.store.test.mjs`

**Interfaces:**
- Consumes : `nextView` (`@domain/navigation`) ; types `Dashboard` (`@main/engine`, `import type`), `Card` (`@domain/checking`), `Echantillon` (`@domain/soul`).
- Produces : hook `useAppStore` (Zustand) avec l'état + actions. Champs : `view`, `theme`, `dashboard`, `cards`, `verifyValue`, `draftValue`, `archiveValue`, `teamsText`, `readerText`, `echantillons`, `editorMode`, `wantSoulLesson`, `toast`. Actions : `go(action)`, `setView(view)`, `toggleTheme()`, `setDashboard(d)`, `showToast(msg)`, `clearToast()`, `setCards(c)`, `setVerifyValue(v)`, `setDraftValue(v)`, `setArchiveValue(v)`, `setTeamsText(t)`, `setEditorMode(m)`, `setEchantillons(e)`.

- [ ] **Step 1 : Écrire le test**

`tests/renderer/app.store.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('état initial', () => {
  const s = get();
  assert.equal(s.view, 'dashboard');
  assert.equal(s.theme, 'light');
  assert.equal(s.toast, null);
});
test('go() suit la machine d\'états domain/navigation', () => {
  get().setView('dashboard');
  get().go('goCompose');
  assert.equal(get().view, 'compose');
  get().go('launch');
  assert.equal(get().view, 'checking');
  get().go('inconnu'); // action inconnue → vue inchangée
  assert.equal(get().view, 'checking');
});
test('toggleTheme bascule light/dark', () => {
  get().setView('dashboard');
  const t0 = get().theme;
  get().toggleTheme();
  assert.notEqual(get().theme, t0);
  get().toggleTheme();
  assert.equal(get().theme, t0);
});
test('showToast / clearToast', () => {
  get().showToast('coucou');
  assert.equal(get().toast, 'coucou');
  get().clearToast();
  assert.equal(get().toast, null);
});
test('setDashboard stocke les données', () => {
  get().setDashboard({ soul: null, editions: [] });
  assert.deepEqual(get().dashboard, { soul: null, editions: [] });
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/app.store.test.mjs` → FAIL (`@renderer/store/app.store` non résolu).

- [ ] **Step 3 : Écrire `src/renderer/store/app.store.ts`**

```ts
import { create } from 'zustand';
import { nextView } from '@domain/navigation';
import type { Dashboard } from '@main/engine';
import type { Card } from '@domain/checking';
import type { Echantillon } from '@domain/soul';

export type Theme = 'light' | 'dark';
export type EditorMode = 'preview' | 'edit';

export interface AppState {
  view: string;
  theme: Theme;
  dashboard: Dashboard | null;
  cards: Card[];
  verifyValue: unknown;
  draftValue: unknown;
  archiveValue: unknown;
  teamsText: string;
  readerText: string;
  echantillons: Echantillon[];
  editorMode: EditorMode;
  wantSoulLesson: boolean;
  toast: string | null;

  go: (action: string) => void;
  setView: (view: string) => void;
  toggleTheme: () => void;
  setDashboard: (d: Dashboard | null) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  setCards: (cards: Card[]) => void;
  setVerifyValue: (v: unknown) => void;
  setDraftValue: (v: unknown) => void;
  setArchiveValue: (v: unknown) => void;
  setTeamsText: (t: string) => void;
  setEditorMode: (m: EditorMode) => void;
  setEchantillons: (e: Echantillon[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'dashboard',
  theme: 'light',
  dashboard: null,
  cards: [],
  verifyValue: null,
  draftValue: null,
  archiveValue: null,
  teamsText: '',
  readerText: '',
  echantillons: [],
  editorMode: 'preview',
  wantSoulLesson: true,
  toast: null,

  go: (action) => set({ view: nextView(get().view, action) }),
  setView: (view) => set({ view }),
  toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
  setDashboard: (dashboard) => set({ dashboard }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  setCards: (cards) => set({ cards }),
  setVerifyValue: (verifyValue) => set({ verifyValue }),
  setDraftValue: (draftValue) => set({ draftValue }),
  setArchiveValue: (archiveValue) => set({ archiveValue }),
  setTeamsText: (teamsText) => set({ teamsText }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setEchantillons: (echantillons) => set({ echantillons }),
}));
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/app.store.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 23 fichiers verts.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase3a): store Zustand app.store.ts (navigation/thème/toast/flux) + test"
```

---

### Task 4 : Composants présentationnels (`Toast`, `EditionRow`) + Shell

**Files:**
- Create: `src/renderer/components/Toast.tsx`, `src/renderer/components/EditionRow.tsx`, `src/renderer/layouts/Shell.tsx`

**Interfaces:**
- Consumes : `viewTitle`, `stepper` (`@domain/navigation`) ; `dateLong` (`@domain/format`) ; type `EditionSummary` (`@main/engine`, `import type`) ; `useAppStore`.
- Produces : `Toast`, `EditionRow` (composants présentationnels props-in) ; `Shell` (en-tête + stepper + slot contenu + overlay toast).

- [ ] **Step 1 : Écrire `src/renderer/components/Toast.tsx`**

```tsx
interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
```

- [ ] **Step 2 : Écrire `src/renderer/components/EditionRow.tsx`**

```tsx
import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

interface EditionRowProps {
  edition: EditionSummary;
  onOpen: (edition: EditionSummary) => void;
}

export function EditionRow({ edition, onOpen }: EditionRowProps) {
  return (
    <button className="edition" onClick={() => onOpen(edition)}>
      <span className="r">{dateLong(edition.date)}</span>
      <span className="m">
        {edition.count} brèves · {edition.corr} corr.
      </span>
    </button>
  );
}
```

- [ ] **Step 3 : Écrire `src/renderer/layouts/Shell.tsx`**

```tsx
import type { ReactNode } from 'react';
import { viewTitle, stepper } from '@domain/navigation';
import { useAppStore } from '@renderer/store/app.store';
import { Toast } from '@renderer/components/Toast';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const view = useAppStore((s) => s.view);
  const toast = useAppStore((s) => s.toast);
  const go = useAppStore((s) => s.go);
  const setView = useAppStore((s) => s.setView);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const isDash = view === 'dashboard';
  const st = stepper(view);

  return (
    <div className="win">
      <div className="head">
        {!isDash && (
          <button className="iconbtn" title="Retour" onClick={() => setView('dashboard')}>
            ←
          </button>
        )}
        {isDash && <span className="diamond" />}
        <div className="h-titles">
          <div className="h-title">{viewTitle(view)}</div>
          {isDash && <div className="h-sub">rédacteur en chef · /breves-ia</div>}
        </div>
        <button className="iconbtn" title="SOUL — le style" onClick={() => go('goSoul')}>
          ✦
        </button>
        <button className="iconbtn" title="Historique" onClick={() => go('goHist')}>
          ⏱
        </button>
        <button className="iconbtn" title="Agents" onClick={() => go('goAgents')}>
          ⚙
        </button>
        <button className="iconbtn" title="Thème" onClick={() => toggleTheme()}>
          ◑
        </button>
      </div>

      {st.steps.length > 0 && (
        <div className="stepper">
          <div className="steps">
            {st.steps.map((s, i) => (
              <span key={i} className={`step ${s.state}`}>
                {s.state === 'done' ? '✓' : s.n}
              </span>
            ))}
          </div>
          <span className="step-line">{st.line}</span>
        </div>
      )}

      <div className="content">{children}</div>

      <Toast message={toast} />
    </div>
  );
}
```

- [ ] **Step 4 : Vérifier**

Run : `npm run typecheck` → exit 0. Run : `npm run lint` → exit 0. Run : `npm test` → 23 fichiers verts.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase3a): composants Toast/EditionRow + layout Shell (en-tête + stepper)"
```

---

### Task 5 : `Dashboard` page + `App` + `main.tsx` + thème (swap placeholder→React)

**Files:**
- Create: `src/renderer/pages/Dashboard.tsx`, `src/renderer/App.tsx`
- Modify: `src/renderer/main.tsx` (remplace le placeholder)
- Delete: `src/renderer/styles/placeholder.css` (remplacé)

**Interfaces:**
- Consumes : `useAppStore`, `Shell`, `EditionRow`, `dateLong`/`soulVersionLabel` (`@domain/format`), `window.api`.
- Produces : l'app React rendant le Dashboard (vraies données via `getDashboard`).

- [ ] **Step 1 : Écrire `src/renderer/pages/Dashboard.tsx`**

```tsx
import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { EditionRow } from '@renderer/components/EditionRow';
import { dateLong, soulVersionLabel } from '@domain/format';
import type { EditionSummary } from '@main/engine';

export function Dashboard() {
  const dashboard = useAppStore((s) => s.dashboard);
  const setDashboard = useAppStore((s) => s.setDashboard);

  useEffect(() => {
    void window.api.getDashboard().then(setDashboard);
  }, [setDashboard]);

  const editions = dashboard?.editions ?? [];
  const last = editions[0];
  const today = dateLong(new Date().toISOString().slice(0, 10));
  const onOpen = (_e: EditionSummary): void => {
    /* lecteur d'édition : Phase 3b */
  };

  return (
    <section>
      <div className="pad">
        <div className="eyebrow">{today}</div>
        <h1 className="hello">Bonjour Pierre.</h1>
        <p className="muted" style={{ margin: '0 0 18px' }}>
          Prêt à compiler les prochaines brèves IA ?
        </p>

        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>
              Dernière édition
            </div>
            <span style={{ marginLeft: 'auto', font: '500 11px var(--mono)', color: 'var(--text)' }}>
              {last ? dateLong(last.date) : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, font: '400 12.5px var(--body)', color: 'var(--muted)' }}>
            <span>
              <b style={{ color: 'var(--text)' }}>{last ? last.count : 0}</b> brèves
            </span>
            <span>
              <b style={{ color: 'var(--warn)' }}>{last ? last.corr : 0}</b> corrigé
            </span>
            <span>
              <b style={{ color: 'var(--text)' }}>{last ? last.count : 0}</b> sources
            </span>
          </div>
        </div>

        <div className="eyebrow" style={{ margin: '0 0 9px' }}>
          Éditions récentes · SOUL {soulVersionLabel(dashboard?.soul?.version)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {editions.length === 0 && <div className="faint">Aucune édition archivée pour l'instant.</div>}
          {editions.slice(0, 4).map((e) => (
            <EditionRow key={e.file} edition={e} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Écrire `src/renderer/App.tsx`**

```tsx
import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { Shell } from '@renderer/layouts/Shell';
import { Dashboard } from '@renderer/pages/Dashboard';

export function App() {
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);

  // Applique le thème sur <body> (parité avec body.dark du CSS).
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <Shell>{view === 'dashboard' ? <Dashboard /> : <Placeholder view={view} />}</Shell>;
}

// Les autres vues arrivent en Phase 3b.
function Placeholder({ view }: { view: string }) {
  return (
    <div className="pad">
      <p className="muted">Vue « {view} » — à venir en Phase 3b.</p>
    </div>
  );
}
```

- [ ] **Step 3 : Réécrire `src/renderer/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@renderer/App';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```
Puis supprimer l'ancien placeholder : `git rm src/renderer/styles/placeholder.css` et retirer toute référence à `placeholder.css` dans `src/renderer/index.html` (le `<link>`), en gardant `<div id="root">` + `<script type="module" src="./main.tsx">`.

- [ ] **Step 4 : Vérifier qualité + build + lancement**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 23 fichiers verts.
Run (build + boot, background, env avec display) :
```bash
rm -rf .vite && ( npm start > /tmp/ph3a.log 2>&1 & ) ; sleep 30
grep -iE "Cannot find|error|Failed to resolve" /tmp/ph3a.log | head ; pkill -f electron-forge; pkill -f '\.vite/build'
```
Expected : pas d'erreur de résolution/build ; le renderer charge `App`. **Vérification visuelle finale par l'utilisateur** (`npm start` : shell React + Dashboard avec données réelles).

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "feat(phase3a): Dashboard branché + App + main.tsx (swap placeholder→React)"
```

---

### Task 6 : Storybook (atelier composants)

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.ts`
- Create: `src/renderer/components/Toast.stories.tsx`, `src/renderer/components/EditionRow.stories.tsx`
- Modify: `package.json` (deps Storybook + scripts `storybook`/`build-storybook`)

**Interfaces:**
- Consumes : `Toast`, `EditionRow` ; les styles globaux.
- Produces : Storybook lançable (`npm run storybook`) chargeant les tokens, avec ≥2 stories.

- [ ] **Step 1 : Installer Storybook (builder Vite) + résolution des alias**

```bash
npm install -D storybook @storybook/react-vite vite-tsconfig-paths
```
(`vite-tsconfig-paths` fait résoudre les alias `@domain`/`@main`/… du `tsconfig` dans la Vite de Storybook — sinon `EditionRow` (qui importe `@domain/format`) ne compile pas sous Storybook.)

- [ ] **Step 2 : Créer `.storybook/main.ts`** (avec résolution des alias tsconfig)

```ts
import type { StorybookConfig } from '@storybook/react-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config: StorybookConfig = {
  stories: ['../src/renderer/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (cfg) => {
    cfg.plugins = [...(cfg.plugins ?? []), tsconfigPaths()];
    return cfg;
  },
};

export default config;
```

- [ ] **Step 3 : Créer `.storybook/preview.ts`** (charge les styles globaux)

```ts
import type { Preview } from '@storybook/react-vite';
import '../src/renderer/styles/tokens.css';
import '../src/renderer/styles/app.css';

const preview: Preview = {
  parameters: { backgrounds: { default: 'win' } },
};

export default preview;
```

- [ ] **Step 4 : Créer les stories**

`src/renderer/components/Toast.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = { component: Toast, title: 'Toast' };
export default meta;

export const Visible: StoryObj<typeof Toast> = { args: { message: 'Brèves copiées' } };
export const Vide: StoryObj<typeof Toast> = { args: { message: null } };
```

`src/renderer/components/EditionRow.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditionRow } from './EditionRow';

const meta: Meta<typeof EditionRow> = { component: EditionRow, title: 'EditionRow' };
export default meta;

export const Exemple: StoryObj<typeof EditionRow> = {
  args: {
    edition: { file: 'f.md', date: '2026-06-17', range: '2026-06-17', count: 5, corr: 2, title: '' },
    onOpen: () => {},
  },
};
```

- [ ] **Step 5 : Ajouter les scripts Storybook**

Dans `package.json` `scripts` :
```json
"storybook": "storybook dev -p 6006 --no-open",
"build-storybook": "storybook build"
```
Ajouter `storybook-static` et `.storybook/.cache` à `.gitignore` si besoin.

- [ ] **Step 6 : Vérifier**

Run : `npm run typecheck` → exit 0. Run : `npm run lint` → exit 0 (ajouter `storybook-static` aux ignores ESLint si la build de Storybook est lancée). Run : `npm test` → 23 fichiers verts.
Run (build headless de Storybook, prouve que ça compile sans display) : `npm run build-storybook` → termine sans erreur, produit `storybook-static/`. (Le mode interactif `npm run storybook` est lancé par l'utilisateur.)

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "feat(phase3a): Storybook (react-vite) + stories Toast/EditionRow"
```

---

## Critères de réussite Phase 3a (revue finale)

- [ ] `Api` aux retours typés ; `onCommandEvent` renvoie un désabonnement ; `window.d.ts` en place.
- [ ] Styles extraits VERBATIM (`tokens.css` + `app.css`) — look préservé.
- [ ] Store Zustand testé (Vitest) ; `Shell` + `Dashboard` + `App` + `main.tsx` ; placeholder supprimé.
- [ ] `npm start` ouvre le shell React + **Dashboard fonctionnel** (vraies données IPC) — validé visuellement par l'utilisateur.
- [ ] Storybook compile (`npm run build-storybook`) avec ≥2 stories chargeant les tokens.
- [ ] `npm run typecheck`/`lint`/`test` verts ; aucun `import 'electron'` dans `src/renderer` ; `lib/*.mjs`/`hud/*` inchangés.

## Reste (Phase 3b, plan séparé)

Les 11 vues restantes + le flux complet (compose → checking *streaming* via `useCommandStream` → editor → archived), éditeur SOUL (§1-4 + §5 + sélecteur), agents, history/reader, drawer detail ; une story par nouveau composant ; parité écran par écran avec le vanilla.
