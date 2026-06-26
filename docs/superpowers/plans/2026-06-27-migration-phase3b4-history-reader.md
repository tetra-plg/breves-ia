# Migration Phase 3b-4 — Historique + Lecteur (history/reader) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter en React les vues **history** (liste des éditions archivées) et **reader** (lecture d'une édition via `window.api.readEdition` + `domain/edition.renderEditionHtml`, bouton Copier), et brancher l'ouverture du lecteur depuis l'historique **et** le dashboard, 1:1 avec le renderer vanilla.

**Architecture:** Les pages câblent store + `window.api` ; composants présentationnels (props in). L'ouverture du lecteur passe par une action de store `openReader(edition, from)` qui mémorise l'édition + le `returnTo` (vue d'origine) puis navigue ; le `Reader` charge le texte au montage (garde `alive`, pas de fuite) et le rend via `renderEditionHtml`. Le bouton retour du `Shell` ramène déjà `reader`→`returnTo` (3b-1).

**Tech Stack:** React 19, Zustand, TypeScript strict, Vitest, Storybook 10. Node 22 (`.nvmrc`). Alias `@renderer`/`@domain`/`@shared`/`@main`.

## Global Constraints

- **Lancer sous Node 22** (`nvm use` ; `.nvmrc`=22) **avant toute commande npm**. `npm run typecheck` (0) / `npm run lint` (0) / `npm test` (verts) à chaque tâche.
- Comportement et look **identiques** au vanilla ([hud/renderer.mjs](../../../hud/renderer.mjs) `renderHistory` ~435-446 / `openReader` ~447-457 ; [hud/companion.html](../../../hud/companion.html) history ~338-343, reader ~366-375). Réutiliser les **classes CSS existantes** (`.card`, `.btn-ghost`, `.faint`, `.pad`, `.muted`) et les styles inline du legacy. **Pas de redesign.**
- `window.api` = **seule** frontière ; **aucun `import 'electron'`** dans `src/renderer`.
- Réutiliser `domain/` (`@domain/edition.renderEditionHtml`, `@domain/format.dateLong`) ; **aucune logique métier nouvelle** dans les composants/pages.
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée. (`// eslint-disable-next-line` ponctuel toléré.)
- **Pas de fuite** : chargement async gardé (`alive`) + cleanup `useEffect`. En test, `window.api` n'est jamais appelé.
- `lib/*.mjs`/`hud/*` **inchangés**. Ne **jamais** stager `.claude/breves-ia/SOUL.md`.
- **`git push origin refonte-ts-react-electron` APRÈS CHAQUE COMMIT** (demande utilisateur).
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../specs/2026-06-26-migration-phase3b-vues-flux-design.md) (sous-plan 3b-4).

## File Structure

- `src/renderer/store/app.store.ts` — **modifié** : `readerEdition: EditionSummary | null` + actions `setReaderText`, `openReader(edition, from)`.
- `src/renderer/components/HistoryRow.tsx` — **créé** (+ story) : ligne d'historique (date + titre + « Lire › » + stats brèves/corrections).
- `src/renderer/pages/History.tsx` / `Reader.tsx` — **créés**.
- `src/renderer/pages/Dashboard.tsx` — **modifié** : `onOpen` câblé sur `openReader(edition, 'dashboard')`.
- `src/renderer/App.tsx` — **modifié** : registry `history`, `reader`.

---

### Task 1 : Store — état & actions du lecteur

**Files:**
- Modify: `src/renderer/store/app.store.ts`
- Test: `tests/renderer/app.store.reader.test.mjs`

**Interfaces:**
- Consumes : type `EditionSummary` (`@main/engine`) — déjà importé.
- Produces : état `readerEdition: EditionSummary | null` (init `null`) ; actions `setReaderText(t: string): void` ; `openReader(edition: EditionSummary, from: string): void` (mémorise `readerEdition`, met `returnTo = from`, vide `readerText`, navigue `view = 'reader'`). (`readerText`/`returnTo`/`setReturnTo` existent déjà.)

- [ ] **Step 1 : Écrire le test** `tests/renderer/app.store.reader.test.mjs`

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();
const ed = { file: '2026-06-13-glm.md', date: '2026-06-13', range: '2026-06-13', count: 3, corr: 1, title: 'GLM' };

test('openReader mémorise l\'édition, returnTo, vide readerText et navigue', () => {
  get().setView('history');
  get().setReaderText('ancien texte');
  get().openReader(ed, 'history');
  assert.equal(get().readerEdition?.file, '2026-06-13-glm.md');
  assert.equal(get().returnTo, 'history');
  assert.equal(get().readerText, '');
  assert.equal(get().view, 'reader');
});
test('setReaderText met à jour le texte brut', () => {
  get().setReaderText('# Édition\n— 13 juin —');
  assert.equal(get().readerText, '# Édition\n— 13 juin —');
});
test('openReader depuis le dashboard fixe returnTo=dashboard', () => {
  get().openReader(ed, 'dashboard');
  assert.equal(get().returnTo, 'dashboard');
  assert.equal(get().view, 'reader');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/app.store.reader.test.mjs` → FAIL (`openReader`/`setReaderText`/`readerEdition` absents).

- [ ] **Step 3 : Étendre `src/renderer/store/app.store.ts`**

Dans l'interface `AppState`, après `readerText: string;` (vers la ligne 47) **ajouter** :
```ts
  readerEdition: EditionSummary | null;
```
et dans la liste des actions, après le setter existant lié au reader (ou à côté de `setReturnTo`) **ajouter** :
```ts
  setReaderText: (t: string) => void;
  openReader: (edition: EditionSummary, from: string) => void;
```
Dans le `create(...)`, après `readerText: '',` (état initial) **ajouter** :
```ts
  readerEdition: null,
```
et dans les implémentations (à côté de `setReturnTo`) **ajouter** :
```ts
  setReaderText: (readerText) => set({ readerText }),
  openReader: (edition, from) => set({ readerEdition: edition, returnTo: from, readerText: '', view: 'reader' }),
```
(`EditionSummary` est déjà importé depuis `@main/engine` — sinon l'ajouter à l'import existant.)

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/app.store.reader.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 5 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b4): store — état & actions du lecteur (readerEdition, setReaderText, openReader) + test"
git push origin refonte-ts-react-electron
```

---

### Task 2 : Composant `HistoryRow` (+ story)

**Files:**
- Create: `src/renderer/components/HistoryRow.tsx` (+ `.stories.tsx`)

**Interfaces:**
- Consumes : `dateLong` (`@domain/format`) ; type `EditionSummary` (`@main/engine`).
- Produces : `HistoryRow({ edition: EditionSummary; onOpen: (edition: EditionSummary) => void })` (bouton `.card` : date + titre éventuel + « Lire › » + `count` brèves / `corr` corrections).

- [ ] **Step 1 : Écrire `src/renderer/components/HistoryRow.tsx`** (port de la ligne `renderHistory`)

```tsx
import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

interface HistoryRowProps {
  edition: EditionSummary;
  onOpen: (edition: EditionSummary) => void;
}

export function HistoryRow({ edition, onOpen }: HistoryRowProps) {
  return (
    <button className="card" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => onOpen(edition)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
        <span style={{ font: '600 14px var(--display)' }}>{dateLong(edition.date)}</span>
        {edition.title && (
          <span style={{ font: '500 11px var(--body)', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {edition.title}
          </span>
        )}
        <span style={{ marginLeft: 'auto', font: '500 10px var(--body)', color: 'var(--accent)' }}>Lire ›</span>
      </div>
      <div style={{ display: 'flex', gap: 16, font: '400 12px var(--body)', color: 'var(--muted)' }}>
        <span>
          <b style={{ color: 'var(--text)' }}>{edition.count}</b> brèves
        </span>
        <span>
          <b style={{ color: 'var(--warn)' }}>{edition.corr}</b> corrections
        </span>
      </div>
    </button>
  );
}
```

- [ ] **Step 2 : Écrire la story** `src/renderer/components/HistoryRow.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { HistoryRow } from './HistoryRow';

const meta: Meta<typeof HistoryRow> = { component: HistoryRow, title: 'HistoryRow' };
export default meta;

const edition = { file: '2026-06-13-glm.md', date: '2026-06-13', range: '2026-06-13', count: 4, corr: 2, title: 'Spécial modèles ouverts' };

export const AvecTitre: StoryObj<typeof HistoryRow> = { args: { edition, onOpen: () => {} } };
export const SansTitre: StoryObj<typeof HistoryRow> = { args: { edition: { ...edition, title: '' }, onOpen: () => {} } };
```

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts). Run : `npm run build-storybook` → OK (la story compile).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b4): composant HistoryRow + story"
git push origin refonte-ts-react-electron
```

---

### Task 3 : Page `History` + registry

**Files:**
- Create: `src/renderer/pages/History.tsx`
- Modify: `src/renderer/App.tsx` (import + registry `history`)

**Interfaces:**
- Consumes : `useAppStore` (`dashboard`,`openReader`) ; `HistoryRow`.
- Produces : page `History` (liste des éditions du dashboard → `openReader(edition, 'history')`).

- [ ] **Step 1 : Écrire `src/renderer/pages/History.tsx`** (port de `renderHistory`)

```tsx
import { useAppStore } from '@renderer/store/app.store';
import { HistoryRow } from '@renderer/components/HistoryRow';

export function History() {
  const editions = useAppStore((s) => s.dashboard?.editions ?? []);
  const openReader = useAppStore((s) => s.openReader);

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 16px' }}>
          Chaque édition validée est archivée et intégrée au wiki personnel (llm-wiki).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {editions.length === 0 ? (
            <div className="faint">Aucune édition archivée.</div>
          ) : (
            editions.map((e) => <HistoryRow key={e.file} edition={e} onOpen={(ed) => openReader(ed, 'history')} />)
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Enregistrer `history` dans `App.tsx`**

Ajouter l'import et l'entrée registry :
```tsx
import { History } from '@renderer/pages/History';
// …dans VIEWS :
  history: History,
```

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b4): page History (liste des éditions → lecteur) + registry"
git push origin refonte-ts-react-electron
```

---

### Task 4 : Page `Reader` + câblage Dashboard + registry + sanity build

**Files:**
- Create: `src/renderer/pages/Reader.tsx`
- Modify: `src/renderer/pages/Dashboard.tsx` (`onOpen` → `openReader(edition, 'dashboard')`)
- Modify: `src/renderer/App.tsx` (import + registry `reader`)

**Interfaces:**
- Consumes : `useAppStore` (`readerEdition`,`readerText`,`setReaderText`,`setView`,`showToast`, + `openReader` pour Dashboard) ; `renderEditionHtml` (`@domain/edition`) ; `dateLong` (`@domain/format`) ; `window.api` (`readEdition`,`copy`).
- Produces : page `Reader` (charge le texte de l'édition au montage, garde `alive` ; rend `renderEditionHtml(readerText)` ; sous-ligne date·titre·count ; bouton Copier → `window.api.copy` + toast). Dashboard : clic édition → lecteur (retour dashboard).

- [ ] **Step 1 : Écrire `src/renderer/pages/Reader.tsx`** (port de `openReader`/markup reader)

```tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { renderEditionHtml } from '@domain/edition';
import { dateLong } from '@domain/format';

export function Reader() {
  const readerEdition = useAppStore((s) => s.readerEdition);
  const readerText = useAppStore((s) => s.readerText);
  const showToast = useAppStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);

  // Chargement du texte au montage (garde `alive`, port de openReader). Recharge si l'édition change.
  useEffect(() => {
    const ed = useAppStore.getState().readerEdition;
    if (!ed) {
      useAppStore.getState().setView('history');
      return;
    }
    let alive = true;
    setLoading(true);
    void window.api.readEdition(ed.file).then((t) => {
      if (!alive) return;
      useAppStore.getState().setReaderText(t ?? '');
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [readerEdition]);

  if (!readerEdition) return <div className="pad" />;

  const sub = `${dateLong(readerEdition.date)}${readerEdition.title ? ' · ' + readerEdition.title : ''} · ${readerEdition.count} brèves · archivée`;

  async function copy(): Promise<void> {
    await window.api.copy(useAppStore.getState().readerText);
    showToast('Brèves copiées');
  }

  return (
    <section>
      <div className="pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span className="faint" style={{ font: '500 10px var(--mono)' }}>{sub}</span>
          <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '7px 13px' }} onClick={() => void copy()}>
            Copier
          </button>
        </div>
        {loading ? (
          <div className="faint">Chargement…</div>
        ) : readerText ? (
          <div dangerouslySetInnerHTML={{ __html: renderEditionHtml(readerText) }} />
        ) : (
          <div className="faint">Texte introuvable dans le wiki (raw/notes/{readerEdition.file}).</div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Câbler l'ouverture du lecteur depuis `Dashboard.tsx`**

Dans `src/renderer/pages/Dashboard.tsx`, ajouter le sélecteur d'action et **remplacer** le `onOpen` stub :
```tsx
  const openReader = useAppStore((s) => s.openReader);
  // …
  const onOpen: (edition: EditionSummary) => void = (edition) => openReader(edition, 'dashboard');
```
(supprimer le corps stub `/* lecteur d'édition : Phase 3b */`.)

- [ ] **Step 3 : Enregistrer `reader` dans `App.tsx`**

Ajouter l'import et l'entrée registry :
```tsx
import { Reader } from '@renderer/pages/Reader';
// …dans VIEWS :
  reader: Reader,
```

- [ ] **Step 4 : Vérifier qualité + Storybook + sanity build**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).
Run : `npm run build-storybook` → OK.
Run (sanity build, Node 22) :
```bash
rm -rf .vite && ( npm start > /tmp/3b4.log 2>&1 & ) ; sleep 30 ; grep -iE "Cannot find|Failed to resolve|error|Uncaught" /tmp/3b4.log | head ; ls .vite/build ; pkill -f electron-forge; pkill -f '\.vite/build'
```
→ build sans erreur (`.vite/build/main.cjs` présent ; pas d'erreur de résolution).

- [ ] **Step 5 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b4): page Reader (lecture édition + copie) + câblage Dashboard + registry"
git push origin refonte-ts-react-electron
```

---

## Critères de réussite Phase 3b-4 (revue finale)

- [ ] **history** : liste des éditions archivées (date + titre + « Lire › » + stats), vide → message ; clic → lecteur (retour `history`).
- [ ] **reader** : ouverture depuis history **et** dashboard ; charge `readEdition(file)` (garde `alive`), rend `renderEditionHtml` ; sous-ligne date·titre·count·archivée ; « Copier » → `window.api.copy(readerText)` + toast « Brèves copiées » ; texte introuvable → message dédié ; retour Shell `reader`→`returnTo`.
- [ ] Parité look/comportement avec le vanilla (classes CSS + inline repris) ; aucune logique métier nouvelle (réutilise `@domain/edition`,`@domain/format`).
- [ ] `npm run typecheck` (0) / `npm run lint` (0) / `npm test` verts (Node 22) ; Storybook compile (HistoryRow) ; `npm start` build sans erreur ; **validation visuelle utilisateur**.
- [ ] `lib/*.mjs`/`hud/*` inchangés ; aucun `import 'electron'` dans `src/renderer` ; `SOUL.md` non stagé. Push après chaque commit. Pas de fuite (chargement gardé par `alive`).

## Reste (Phase 4/5)

Phase 4 (suppression `.mjs`/`hud` ; le renderer React devient l'unique frontal), Phase 5 (qualité + packaging). Plans séparés. Après 3b-4, **les 11 vues de la Phase 3b sont portées** — le renderer vanilla est remplaçable.
