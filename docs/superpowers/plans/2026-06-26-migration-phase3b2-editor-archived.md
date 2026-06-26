# Migration Phase 3b-2 — Éditeur + Archivage (editor/archived) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter en React les vues **editor** (rédaction `breves-draft`, aperçu/édition, corrections + sources, modale de correction) et **archived** (archivage+ingestion, étapes, newsletter finale, copie Teams), en préservant comportement et look 1:1 avec le renderer vanilla.

**Architecture:** Chaque page câble `window.api` + le store ; les composants sont présentationnels (props in). La rédaction et l'archivage se déclenchent **au montage** de leur page respective (port de `go('toEditor'); runDraft()` et de `runArchive()`), avec garde anti-double-exécution. Le `RunStatus` partagé (3b-1) affiche le statut live (titre/horloge/activité animés par `useCommandStream` + l'horloge de `App`). Le rendu d'édition réutilise `domain/edition.renderEditionHtml`. Les carry-overs 3b-1 (helpers `niveau*` partagés, sélecteurs Zustand, resserrage de types) sont traités en premier.

**Tech Stack:** React 19, Zustand, TypeScript strict, Vitest, Storybook 10. Node 22 (`.nvmrc`). Alias `@renderer`/`@domain`/`@shared`/`@main`.

## Global Constraints

- **Lancer sous Node 22** (`nvm use` ; `.nvmrc`=22) **avant toute commande npm**. `npm run typecheck` (0) / `npm run lint` (0) / `npm test` (verts) à chaque tâche.
- Comportement et look **identiques** au vanilla ([hud/renderer.mjs](../../../hud/renderer.mjs) sections EDITOR/CORRECT MODAL/ARCHIVE, [hud/companion.html](../../../hud/companion.html) ~234-293 + `#correct-modal` ~381). Réutiliser les **classes CSS existantes** (`.corr-item`, `.corr-dot`, `.dot done`, `.overlay`, `.modal`, `.btn-ghost`, `.btn-primary`, `.pill`, `.card`, `.row`, `.eyebrow`, `ed-*`) et les styles inline du legacy. **Pas de redesign.**
- `window.api` = **seule** frontière ; **aucun `import 'electron'`** dans `src/renderer`.
- Réutiliser `domain/` ; **aucune logique métier nouvelle** dans les composants/pages.
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée. (Les `// eslint-disable-next-line` ponctuels sont tolérés, à l'image de `src/shared/schemas/inputs.ts`.)
- **Pas de fuite** : abonnements / `setInterval` nettoyés dans les `useEffect`. En test, le SDK n'est jamais appelé.
- `lib/*.mjs`/`hud/*` **inchangés**. Ne **jamais** stager `.claude/breves-ia/SOUL.md`.
- **`git push origin refonte-ts-react-electron` APRÈS CHAQUE COMMIT** (demande utilisateur).
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../specs/2026-06-26-migration-phase3b-vues-flux-design.md). Handoff : [docs/superpowers/handoff-phase3b2.md](../handoff-phase3b2.md).

## File Structure

- `src/renderer/components/niveau.ts` — **créé** : helpers `niveauColor`/`niveauSoft`/`niveauLabel` partagés (extraits de EnqCard/Drawer ; réutilisés par CorrectionRow).
- `src/renderer/components/CorrectionRow.tsx` / `SourceRow.tsx` / `CorrectModal.tsx` / `ArchiveStep.tsx` — **créés** : présentationnels (+ stories).
- `src/renderer/pages/Editor.tsx` / `Archived.tsx` — **créés** : câblent store + `window.api`.
- `src/renderer/store/app.store.ts` — **modifié** : action `setWantSoulLesson`.
- `src/renderer/App.tsx` — **modifié** : registry `editor` + `archived`.
- `src/renderer/components/EnqCard.tsx` / `Drawer.tsx` — **modifiés** : importent `niveau.ts` (carry-over) ; Drawer resserre le cast + `faits: string[]`.
- `src/renderer/pages/Compose.tsx` — **modifié** : sélecteurs Zustand + reset draft/archive (carry-over).
- `src/renderer/hooks/useCommandStream.ts` — **modifié** : `TOPIC_TYPES` couplé au union `TopicEvent` (carry-over).
- `src/shared/schemas/outputs.ts` — **modifié** : `topicSchema.faits` → `z.array(z.string())` (carry-over).

---

### Task 1 : Carry-overs 3b-1 — helpers `niveau` partagés + resserrages

**Files:**
- Create: `src/renderer/components/niveau.ts`
- Create: `tests/renderer/niveau.test.mjs`
- Modify: `src/renderer/components/EnqCard.tsx` (lignes 3-8), `src/renderer/components/Drawer.tsx` (lignes 1-26, 68-72)
- Modify: `src/renderer/pages/Compose.tsx`
- Modify: `src/renderer/hooks/useCommandStream.ts`
- Modify: `src/shared/schemas/outputs.ts` (ligne 25)

**Interfaces:**
- Produces : `niveauColor(n: string): string`, `niveauSoft(n: string): string`, `niveauLabel(n: string): string` depuis `@renderer/components/niveau` (consommés par EnqCard, Drawer, CorrectionRow de la Task 3).
- Produces : `topicSchema.faits` typé `string[]` (consommé par Drawer).

- [ ] **Step 1 : Écrire le test** `tests/renderer/niveau.test.mjs`

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { niveauColor, niveauSoft, niveauLabel } from '@renderer/components/niveau';

test('niveauColor mappe les niveaux', () => {
  assert.equal(niveauColor('corrigé'), 'var(--warn)');
  assert.equal(niveauColor('nuance'), 'var(--nuance)');
  assert.equal(niveauColor('date'), 'var(--accent)');
});
test('niveauSoft mappe les niveaux', () => {
  assert.equal(niveauSoft('corrigé'), 'var(--warnSoft)');
  assert.equal(niveauSoft('nuance'), 'var(--nuanceSoft)');
  assert.equal(niveauSoft('date'), 'var(--accentSoft)');
});
test('niveauLabel mappe les niveaux', () => {
  assert.equal(niveauLabel('corrigé'), 'Fait corrigé');
  assert.equal(niveauLabel('nuance'), 'Nuance');
  assert.equal(niveauLabel('date'), 'Date');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/niveau.test.mjs` → FAIL (module absent).

- [ ] **Step 3 : Créer `src/renderer/components/niveau.ts`**

```ts
// Couleurs/libellés par niveau d'alerte — partagés (EnqCard, Drawer, CorrectionRow).
// Identiques aux helpers du renderer vanilla (parité look).
export const niveauColor = (n: string): string =>
  n === 'corrigé' ? 'var(--warn)' : n === 'nuance' ? 'var(--nuance)' : 'var(--accent)';
export const niveauSoft = (n: string): string =>
  n === 'corrigé' ? 'var(--warnSoft)' : n === 'nuance' ? 'var(--nuanceSoft)' : 'var(--accentSoft)';
export const niveauLabel = (n: string): string =>
  n === 'corrigé' ? 'Fait corrigé' : n === 'nuance' ? 'Nuance' : 'Date';
```

- [ ] **Step 4 : Brancher `EnqCard.tsx` sur le module partagé**

Dans `src/renderer/components/EnqCard.tsx`, **supprimer** les trois `const niveau* = …` locaux (lignes 3-8) et **ajouter** l'import après `import type { Card } …` :
```ts
import { niveauColor, niveauSoft, niveauLabel } from '@renderer/components/niveau';
```

- [ ] **Step 5 : Brancher `Drawer.tsx` + resserrer le cast et `faits`**

Dans `src/renderer/components/Drawer.tsx` : **remplacer** les lignes 1-26 par :
```tsx
import { dateLong } from '@domain/format';
import { niveauColor, niveauSoft, niveauLabel } from '@renderer/components/niveau';
import type { VerifyOutput } from '@shared/schemas/outputs';

type Topic = VerifyOutput['topics'][number];

interface DrawerProps {
  topic: Topic;
}

export function Drawer({ topic }: DrawerProps) {
  const t = topic as Topic & { raw?: string };
```
(Les champs `sujet`/`date_reelle`/`alerte`/`faits`/`url_citee`/`clipping_contenu` font déjà partie de `Topic` via `topicSchema` ; seul `raw` est hors-contrat — d'où le cast resserré `{ raw?: string }`.)
Puis **remplacer** le rendu des faits (lignes 68-72) par (faits désormais `string[]`, plus de `String(f)`) :
```tsx
        {(t.faits ?? []).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span className="dot done">✓</span>
            <span style={{ font: '400 13px/1.5 var(--body)' }}>{f}</span>
          </div>
        ))}
```

- [ ] **Step 6 : Resserrer `topicSchema.faits` en `string[]`**

Dans `src/shared/schemas/outputs.ts`, ligne 25, **remplacer** `faits: z.array(z.unknown()),` par :
```ts
    faits: z.array(z.string()),
```

- [ ] **Step 7 : Convertir `Compose.tsx` en sélecteurs + reset draft/archive**

Dans `src/renderer/pages/Compose.tsx`, **remplacer** `const store = useAppStore();` (ligne 7) par des sélecteurs, et **réécrire** `launch` pour réinitialiser aussi draft/archive (clean d'une nouvelle édition) :
```tsx
  const showToast = useAppStore((s) => s.showToast);
  const resetCards = useAppStore((s) => s.resetCards);
  const setVerifyValue = useAppStore((s) => s.setVerifyValue);
  const setDraftValue = useAppStore((s) => s.setDraftValue);
  const setArchiveValue = useAppStore((s) => s.setArchiveValue);
  const setView = useAppStore((s) => s.setView);
  const beginRun = useAppStore((s) => s.beginRun);
  const endRun = useAppStore((s) => s.endRun);
  const applyResultCards = useAppStore((s) => s.applyResultCards);
  const runActive = useAppStore((s) => s.runStatus.active);

  async function launch(): Promise<void> {
    const sujets = raw.trim();
    if (!sujets) {
      showToast('Donne au moins un sujet.');
      return;
    }
    resetCards();
    setVerifyValue(null);
    setDraftValue(null);
    setArchiveValue(null);
    setView('checking');
    beginRun('Vérification en cours');
    const r = await window.api.sendCommand('breves-verify', { sujets });
    endRun();
    if (!r.ok) {
      showToast('Échec de la vérification : ' + r.error);
      return;
    }
    const value = r.value as VerifyOutput;
    setVerifyValue(value);
    applyResultCards(value);
  }
```
Et **remplacer** `disabled={store.runStatus.active}` (ligne 63) par `disabled={runActive}`.

- [ ] **Step 8 : Coupler `TOPIC_TYPES` au union `TopicEvent`**

Dans `src/renderer/hooks/useCommandStream.ts`, **remplacer** la déclaration `const TOPIC_TYPES = [...]` par (typage qui casse à la compilation si le union évolue) :
```ts
const TOPIC_TYPES: ReadonlyArray<TopicEvent['type']> = [
  'topic-detected',
  'topic-progress',
  'topic-done',
  'topic-error',
];
```

- [ ] **Step 9 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/niveau.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts, dont le nouveau `niveau.test.mjs` et `outputs.test.mjs` inchangé vert).

- [ ] **Step 10 : Commit + push**

```bash
git add -A && git commit -m "refactor(phase3b2): helpers niveau partagés + carry-overs 3b-1 (Drawer cast/faits, Compose sélecteurs, TOPIC_TYPES, faits:string[])"
git push origin refonte-ts-react-electron
```

---

### Task 2 : Store — action `setWantSoulLesson`

**Files:**
- Modify: `src/renderer/store/app.store.ts`
- Test: `tests/renderer/app.store.editor.test.mjs`

**Interfaces:**
- Consumes : champ existant `wantSoulLesson: boolean` (état + valeur initiale `true`).
- Produces : action `setWantSoulLesson(v: boolean): void` (consommée par `Editor` à la validation de la modale de correction).

- [ ] **Step 1 : Écrire le test** `tests/renderer/app.store.editor.test.mjs`

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('setWantSoulLesson met à jour le drapeau SOUL', () => {
  get().setWantSoulLesson(false);
  assert.equal(get().wantSoulLesson, false);
  get().setWantSoulLesson(true);
  assert.equal(get().wantSoulLesson, true);
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/app.store.editor.test.mjs` → FAIL (`setWantSoulLesson` absent).

- [ ] **Step 3 : Ajouter l'action au store**

Dans `src/renderer/store/app.store.ts`, dans l'interface `AppState`, après `setEditorMode: (m: EditorMode) => void;` (ligne 65) **ajouter** :
```ts
  setWantSoulLesson: (v: boolean) => void;
```
Et dans le `create(...)`, après `setEditorMode: (editorMode) => set({ editorMode }),` (ligne 109) **ajouter** :
```ts
  setWantSoulLesson: (wantSoulLesson) => set({ wantSoulLesson }),
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/app.store.editor.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 5 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b2): store — action setWantSoulLesson + test"
git push origin refonte-ts-react-electron
```

---

### Task 3 : Composants présentationnels `CorrectionRow`, `SourceRow`, `CorrectModal`, `ArchiveStep` (+ stories)

**Files:**
- Create: `src/renderer/components/CorrectionRow.tsx` (+ `.stories.tsx`)
- Create: `src/renderer/components/SourceRow.tsx` (+ `.stories.tsx`)
- Create: `src/renderer/components/CorrectModal.tsx` (+ `.stories.tsx`)
- Create: `src/renderer/components/ArchiveStep.tsx` (+ `.stories.tsx`)

**Interfaces:**
- Consumes : `niveauColor` (`@renderer/components/niveau`) ; types `DraftOutput`/`ArchiveOutput` (`@shared/schemas/outputs`).
- Produces :
  - `CorrectionRow({ correction: DraftOutput['corrections'][number] })`
  - `SourceRow({ source: DraftOutput['sources'][number] })`
  - `CorrectModal({ initialWantSoulLesson: boolean; onCancel: () => void; onSend: (feedback: string, wantSoulLesson: boolean) => void })`
  - `ArchiveStep({ step: ArchiveOutput['archiveSteps'][number] })`
  (Tous présentationnels — consommés par `Editor`/`Archived`.)

- [ ] **Step 1 : Écrire `CorrectionRow.tsx`** (port de la puce de correction de `renderEditor`)

```tsx
import { niveauColor } from '@renderer/components/niveau';
import type { DraftOutput } from '@shared/schemas/outputs';

type Correction = DraftOutput['corrections'][number];

interface CorrectionRowProps {
  correction: Correction;
}

export function CorrectionRow({ correction }: CorrectionRowProps) {
  return (
    <div className="corr-item">
      <span className="corr-dot" style={{ background: niveauColor(correction.niveau) }} />
      <div>
        <div style={{ font: '600 12.5px var(--body)' }}>{correction.titre}</div>
        <div style={{ font: '400 11.5px/1.45 var(--body)', color: 'var(--muted)', marginTop: 1 }}>
          {correction.detail}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Écrire `SourceRow.tsx`** (port de la ligne de source de `renderEditor`)

```tsx
import type { DraftOutput } from '@shared/schemas/outputs';

type Source = DraftOutput['sources'][number];

interface SourceRowProps {
  source: Source;
}

export function SourceRow({ source }: SourceRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <span className="dot done">✓</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: '600 12.5px var(--body)' }}>
          {source.name}
          {source.repli && <span style={{ color: 'var(--nuance)' }}> (repli)</span>}
        </div>
        <div
          style={{
            font: '400 10.5px var(--mono)',
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {source.url_citee}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Écrire `CorrectModal.tsx`** (port de `#correct-modal` + `openCorrect`/`submitCorrect`)

```tsx
import { useState } from 'react';

interface CorrectModalProps {
  initialWantSoulLesson: boolean;
  onCancel: () => void;
  onSend: (feedback: string, wantSoulLesson: boolean) => void;
}

export function CorrectModal({ initialWantSoulLesson, onCancel, onSend }: CorrectModalProps) {
  const [text, setText] = useState('');
  const [want, setWant] = useState(initialWantSoulLesson);
  return (
    <div className="overlay" style={{ zIndex: 50, padding: 16 }}>
      <div className="modal">
        <h2 style={{ font: '600 17px var(--display)', margin: '0 0 4px' }}>Demander une correction</h2>
        <p className="muted" style={{ font: '400 12.5px var(--body)', margin: '0 0 14px' }}>
          Dis ce qui ne va pas : la commande ajuste les brèves.
        </p>
        <textarea
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: 90, font: '400 13px/1.55 var(--body)', background: 'var(--panel)', borderRadius: 'var(--radiusSm)' }}
          placeholder="Ex. : raccourcis la brève GLM, la parenthèse fait doublon…"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 18px', cursor: 'pointer' }}>
          <input type="checkbox" checked={want} onChange={(e) => setWant(e.target.checked)} />
          <span style={{ font: '500 13px var(--body)' }}>Enrichir la SOUL avec cette leçon</span>
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => onSend(text.trim(), want)}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Écrire `ArchiveStep.tsx`** (port d'une ligne de `renderArchived`)

```tsx
import type { ArchiveOutput } from '@shared/schemas/outputs';

type Step = ArchiveOutput['archiveSteps'][number];

interface ArchiveStepProps {
  step: Step;
}

export function ArchiveStep({ step }: ArchiveStepProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
      <span className="dot done">✓</span>
      <span style={{ font: '500 13px var(--body)' }}>{step.t}</span>
      <span style={{ marginLeft: 'auto', font: '400 10.5px var(--mono)', color: 'var(--faint)' }}>{step.d}</span>
    </div>
  );
}
```

- [ ] **Step 5 : Écrire les stories** (une par composant)

`src/renderer/components/CorrectionRow.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CorrectionRow } from './CorrectionRow';

const meta: Meta<typeof CorrectionRow> = { component: CorrectionRow, title: 'CorrectionRow' };
export default meta;

export const Corrige: StoryObj<typeof CorrectionRow> = {
  args: { correction: { niveau: 'corrigé', titre: 'Paramètres GLM-5.2', detail: '753 milliards et non 1,5 billion.' } },
};
export const Nuance: StoryObj<typeof CorrectionRow> = {
  args: { correction: { niveau: 'nuance', titre: 'Disponibilité', detail: 'Annoncé, pas encore déployé partout.' } },
};
```

`src/renderer/components/SourceRow.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SourceRow } from './SourceRow';

const meta: Meta<typeof SourceRow> = { component: SourceRow, title: 'SourceRow' };
export default meta;

export const Directe: StoryObj<typeof SourceRow> = {
  args: { source: { name: 'Z.ai Blog', url_citee: 'https://z.ai/blog/glm-5.2', url_clippee: 'https://z.ai/blog/glm-5.2', repli: false } },
};
export const Repli: StoryObj<typeof SourceRow> = {
  args: { source: { name: 'TechCrunch', url_citee: 'https://techcrunch.com/glm', url_clippee: 'https://techcrunch.com/glm', repli: true } },
};
```

`src/renderer/components/CorrectModal.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CorrectModal } from './CorrectModal';

const meta: Meta<typeof CorrectModal> = { component: CorrectModal, title: 'CorrectModal' };
export default meta;

export const Ouverte: StoryObj<typeof CorrectModal> = {
  args: { initialWantSoulLesson: true, onCancel: () => {}, onSend: () => {} },
};
```

`src/renderer/components/ArchiveStep.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArchiveStep } from './ArchiveStep';

const meta: Meta<typeof ArchiveStep> = { component: ArchiveStep, title: 'ArchiveStep' };
export default meta;

export const Exemple: StoryObj<typeof ArchiveStep> = {
  args: { step: { t: 'Édition écrite dans le repo', d: 'editions/2026-06-26.md' } },
};
```

- [ ] **Step 6 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts). Run : `npm run build-storybook` → OK (les nouvelles stories compilent).

- [ ] **Step 7 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b2): composants CorrectionRow/SourceRow/CorrectModal/ArchiveStep + stories"
git push origin refonte-ts-react-electron
```

---

### Task 4 : Page `Editor` (rédaction, aperçu/édition, corrections+sources, modale) + registry

**Files:**
- Create: `src/renderer/pages/Editor.tsx`
- Modify: `src/renderer/App.tsx` (import + registry `editor`)

**Interfaces:**
- Consumes : `useAppStore` (`verifyValue`,`draftValue`,`teamsText`,`editorMode`,`wantSoulLesson`,`runStatus`, `setDraftValue`,`setTeamsText`,`setEditorMode`,`setWantSoulLesson`,`setView`,`showToast`,`beginRun`,`endRun`) ; `window.api.sendCommand` ; `renderEditionHtml` (`@domain/edition`) ; `RunStatus`,`CorrectionRow`,`SourceRow`,`CorrectModal` ; type `DraftOutput`.
- Produces : page `Editor` (rédige au montage via `breves-draft`, bascule aperçu/édition, liste corrections+sources, ouvre la modale de correction → re-rédige, « Valider » → vue `archived`).

- [ ] **Step 1 : Écrire `src/renderer/pages/Editor.tsx`** (port de EDITOR + CORRECT MODAL de renderer.mjs)

```tsx
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { renderEditionHtml } from '@domain/edition';
import { RunStatus } from '@renderer/components/RunStatus';
import { CorrectionRow } from '@renderer/components/CorrectionRow';
import { SourceRow } from '@renderer/components/SourceRow';
import { CorrectModal } from '@renderer/components/CorrectModal';
import type { DraftOutput } from '@shared/schemas/outputs';

export function Editor() {
  const draftValue = useAppStore((s) => s.draftValue);
  const teamsText = useAppStore((s) => s.teamsText);
  const editorMode = useAppStore((s) => s.editorMode);
  const wantSoulLesson = useAppStore((s) => s.wantSoulLesson);
  const runStatus = useAppStore((s) => s.runStatus);
  const setDraftValue = useAppStore((s) => s.setDraftValue);
  const setTeamsText = useAppStore((s) => s.setTeamsText);
  const setEditorMode = useAppStore((s) => s.setEditorMode);
  const setWantSoulLesson = useAppStore((s) => s.setWantSoulLesson);
  const setView = useAppStore((s) => s.setView);
  const showToast = useAppStore((s) => s.showToast);
  const beginRun = useAppStore((s) => s.beginRun);
  const endRun = useAppStore((s) => s.endRun);

  const [correctOpen, setCorrectOpen] = useState(false);

  // Rédaction (port de runDraft). Lit verifyValue à chaud (getState) pour éviter les closures périmées.
  async function runDraft(feedback?: string): Promise<void> {
    const verifyValue = useAppStore.getState().verifyValue;
    if (!verifyValue) return;
    const inputs: { topics: unknown[]; feedback?: string } = { topics: verifyValue.topics };
    if (feedback) inputs.feedback = feedback;
    beginRun('Rédaction en cours');
    const r = await window.api.sendCommand('breves-draft', inputs);
    endRun();
    if (!r.ok) {
      showToast('Échec de la rédaction : ' + r.error);
      return;
    }
    const value = r.value as DraftOutput;
    setDraftValue(value);
    setTeamsText(value.teamsText || '');
    setEditorMode('preview');
  }

  // Au montage : rédige si pas encore de brouillon (port de `go('toEditor'); runDraft()`). Une seule fois.
  const drafted = useRef(false);
  useEffect(() => {
    if (drafted.current) return;
    if (useAppStore.getState().draftValue) return;
    drafted.current = true;
    void runDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleEditor(): void {
    setEditorMode(editorMode === 'preview' ? 'edit' : 'preview');
  }

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 14px' }}>
          Version prête à coller dans Teams. Édite le texte directement, puis valide ou corrige.
        </p>
        <RunStatus status={runStatus} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ font: '500 11px var(--mono)', color: 'var(--muted)' }}>prêt-à-coller · Teams</span>
          <button className="pill" style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none' }} onClick={toggleEditor}>
            {editorMode === 'preview' ? 'Éditer' : 'Aperçu'}
          </button>
        </div>
        {editorMode === 'preview' ? (
          <div dangerouslySetInnerHTML={{ __html: renderEditionHtml(teamsText) }} />
        ) : (
          <textarea
            spellCheck={false}
            className="card"
            style={{ width: '100%', minHeight: 300, padding: '14px 15px', font: '400 13px/1.6 var(--mono)', color: 'var(--text)', background: 'var(--panel)', resize: 'vertical' }}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
          />
        )}
        <div className="row" style={{ marginTop: 13 }}>
          <button className="btn-ghost" style={{ flex: 'none' }} onClick={() => setCorrectOpen(true)}>
            Corriger
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => setView('archived')}>
            Valider &amp; archiver →
          </button>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 11 }}>
            Corrections apportées
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {draftValue?.corrections?.length ? (
              draftValue.corrections.map((c, i) => <CorrectionRow key={i} correction={c} />)
            ) : (
              <div className="faint">Aucune correction.</div>
            )}
          </div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 11 }}>
            Sources &amp; clippings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {(draftValue?.sources ?? []).map((s, i) => (
              <SourceRow key={i} source={s} />
            ))}
          </div>
        </div>
      </div>
      {correctOpen && (
        <CorrectModal
          initialWantSoulLesson={wantSoulLesson}
          onCancel={() => setCorrectOpen(false)}
          onSend={(feedback, want) => {
            setWantSoulLesson(want);
            setCorrectOpen(false);
            if (feedback) void runDraft(feedback);
          }}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2 : Enregistrer `editor` dans `App.tsx`**

Ajouter l'import (après `import { Detail } …`) :
```tsx
import { Editor } from '@renderer/pages/Editor';
```
Et l'entrée registry :
```tsx
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
  compose: Compose,
  checking: Checking,
  detail: Detail,
  editor: Editor,
};
```

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b2): page Editor (breves-draft, aperçu/édition, corrections+sources, modale) + registry"
git push origin refonte-ts-react-electron
```

---

### Task 5 : Page `Archived` (archivage+ingestion, étapes, newsletter, copie) + registry + sanity build

**Files:**
- Create: `src/renderer/pages/Archived.tsx`
- Modify: `src/renderer/App.tsx` (import + registry `archived`)

**Interfaces:**
- Consumes : `useAppStore` (`archiveValue`,`runStatus`,`go`,`setView`,`setArchiveValue`,`showToast`,`beginRun`,`endRun`, + lecture à chaud `draftValue`/`verifyValue`/`teamsText`/`wantSoulLesson` via `getState`) ; `window.api.archive`/`window.api.copy` ; `renderEditionHtml` ; `RunStatus`,`ArchiveStep` ; type `ArchiveOutput`.
- Produces : page `Archived` (archive au montage, affiche les étapes + la newsletter, copie Teams, navigation Historique/Nouvelle édition).

- [ ] **Step 1 : Écrire `src/renderer/pages/Archived.tsx`** (port de ARCHIVE + renderArchived de renderer.mjs)

```tsx
import { useEffect, useRef } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { renderEditionHtml } from '@domain/edition';
import { RunStatus } from '@renderer/components/RunStatus';
import { ArchiveStep } from '@renderer/components/ArchiveStep';
import type { ArchiveOutput } from '@shared/schemas/outputs';

export function Archived() {
  const archiveValue = useAppStore((s) => s.archiveValue);
  const runStatus = useAppStore((s) => s.runStatus);
  const go = useAppStore((s) => s.go);

  // Archivage + ingestion (port de runArchive). Lit le contexte à chaud (getState).
  async function runArchive(): Promise<void> {
    const st = useAppStore.getState();
    const { draftValue, verifyValue } = st;
    if (!draftValue || !verifyValue) return;
    const teamsText = (st.teamsText || '').trim() || draftValue.teamsText;
    const leconSOUL = (st.wantSoulLesson && draftValue.soulLessonProposee) || undefined;
    const inputs: { teamsText: string; topics: unknown[]; sources: unknown[]; leconSOUL?: string } = {
      teamsText,
      topics: verifyValue.topics,
      sources: draftValue.sources,
    };
    if (leconSOUL) inputs.leconSOUL = leconSOUL;
    st.beginRun('Archivage + ingestion en cours');
    const r = await window.api.archive(inputs);
    st.endRun();
    if (!r.ok) {
      st.showToast("Échec de l'archivage : " + r.error);
      st.setView('editor');
      return;
    }
    st.setArchiveValue(r.value as ArchiveOutput);
    if (r.ingest && !r.ingest.ok) {
      st.showToast("Déposé dans raw/, mais l'ingestion a échoué : relance /ingest côté wiki");
    }
  }

  // Au montage : archive si pas encore fait (port du `show('archived')` déclenché par runArchive). Une seule fois.
  const archivedOnce = useRef(false);
  useEffect(() => {
    if (archivedOnce.current) return;
    const st = useAppStore.getState();
    if (st.archiveValue) return;
    if (!st.draftValue || !st.verifyValue) return;
    archivedOnce.current = true;
    void runArchive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyNewsletter(): Promise<void> {
    await window.api.copy(archiveValue?.newsletterText || '');
    useAppStore.getState().showToast('Brèves copiées : prêtes à coller dans Teams');
  }

  return (
    <section>
      <div className="pad" style={{ textAlign: 'center' }}>
        <div style={{ textAlign: 'left' }}>
          <RunStatus status={runStatus} />
        </div>
        {archiveValue && !runStatus.active && (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--goodSoft)',
                color: 'var(--good)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                margin: '6px auto 16px',
              }}
            >
              ✓
            </div>
            <h1 style={{ font: '600 21px/1.2 var(--display)', margin: '0 0 5px' }}>Validée et archivée</h1>
            <p className="muted" style={{ font: '400 13px var(--body)', margin: '0 0 20px' }}>
              Tout est rangé et relié dans ton wiki personnel.
            </p>
            <div className="card" style={{ padding: 0, textAlign: 'left', overflow: 'hidden' }}>
              <div>
                {(archiveValue.archiveSteps ?? []).map((s, i) => (
                  <ArchiveStep key={i} step={s} />
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => void copyNewsletter()}>
              Copier les brèves (prêt à coller)
            </button>
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <div style={{ font: '500 11px var(--mono)', color: 'var(--muted)', marginBottom: 9 }}>prêt-à-coller · Teams</div>
              <div
                style={{ maxHeight: 300, overflow: 'auto' }}
                dangerouslySetInnerHTML={{ __html: renderEditionHtml(archiveValue.newsletterText || '') }}
              />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => go('goHist')}>
                Historique
              </button>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => go('goCompose')}>
                Nouvelle édition
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Enregistrer `archived` dans `App.tsx`**

Ajouter l'import (après `import { Editor } …`) :
```tsx
import { Archived } from '@renderer/pages/Archived';
```
Et l'entrée registry :
```tsx
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
  compose: Compose,
  checking: Checking,
  detail: Detail,
  editor: Editor,
  archived: Archived,
};
```

- [ ] **Step 3 : Vérifier qualité + Storybook + sanity build**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).
Run : `npm run build-storybook` → OK.
Run (sanity build, Node 22) :
```bash
rm -rf .vite && ( npm start > /tmp/3b2.log 2>&1 & ) ; sleep 30 ; grep -iE "Cannot find|Failed to resolve|error|Uncaught" /tmp/3b2.log | head ; ls .vite/build ; pkill -f electron-forge; pkill -f '\.vite/build'
```
→ build sans erreur (`.vite/build/main.cjs` présent ; pas d'erreur de résolution).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b2): page Archived (archive+ingestion, étapes, newsletter, copie Teams) + registry"
git push origin refonte-ts-react-electron
```

---

## Critères de réussite Phase 3b-2 (revue finale)

- [ ] Carry-overs 3b-1 traités : helpers `niveau*` extraits dans `niveau.ts` (EnqCard/Drawer/CorrectionRow branchés) ; Drawer cast resserré `{ raw?: string }` + `faits: string[]` ; Compose en sélecteurs + reset draft/archive ; `TOPIC_TYPES` couplé à `TopicEvent`.
- [ ] **editor** : rédige au montage (`breves-draft`), bascule aperçu (`renderEditionHtml`)/édition (textarea contrôlé), liste corrections (puce niveau) + sources (badge repli), modale de correction (feedback + leçon SOUL) → re-rédige, « Valider » → `archived`. Statut live via `RunStatus`.
- [ ] **archived** : archive+ingestion au montage (`window.api.archive`), étapes (`ArchiveStep`), newsletter finale (`renderEditionHtml`), « Copier » (`window.api.copy` + toast), Historique/Nouvelle édition. Cas `ingest && !ingest.ok` → toast dédié ; échec → toast + retour `editor`.
- [ ] Parité look/comportement avec le vanilla (classes CSS + inline repris).
- [ ] `npm run typecheck` (0) / `npm run lint` (0) / `npm test` verts (Node 22) ; Storybook compile (stories CorrectionRow/SourceRow/CorrectModal/ArchiveStep) ; `npm start` build sans erreur ; **validation visuelle utilisateur** (compose → checking → editor → archived).
- [ ] `lib/*.mjs`/`hud/*` inchangés ; aucun `import 'electron'` dans `src/renderer` ; `SOUL.md` non stagé. Push après chaque commit.

## Reste (3b-3/3b-4/4/5)

3b-3 (soul/agents), 3b-4 (history/reader), Phase 4 (suppression `.mjs`/`hud`), Phase 5 (qualité + packaging). Plans séparés.
