# Migration Phase 3b-1 — Flux de vérification (compose/checking/detail) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter en React l'entrée du flux — registry de vues, hooks de streaming (`useCommandStream`), statut live, et les vues **compose → checking (streaming) → detail (drawer)** — en préservant comportement et look.

**Architecture:** `App` route via un **registry** `Record<string, ComponentType>`. Le streaming passe par `useCommandStream` (abonne `window.api.onCommandEvent`, route vers des **actions de store** qui réutilisent `domain/checking.applyEvent` + `domain/agents.activityFromMessage`). La logique testable vit dans le **store** (actions + reducers) ; les hooks/pages portent les effets (IPC, intervalle d'horloge). Look préservé via les classes CSS existantes.

**Tech Stack:** React 19, Zustand, TypeScript strict, Vitest, Storybook 10. Node 22 (`.nvmrc`). Alias `@renderer`/`@domain`/`@shared`/`@main`.

## Global Constraints

- **Lancer sous Node 22** (`nvm use` ; `.nvmrc`=22). `npm run typecheck`/`lint`/`test` verts à chaque tâche.
- Comportement et look **identiques** au vanilla ([hud/renderer.mjs](../../../hud/renderer.mjs), [hud/companion.html](../../../hud/companion.html)).
- `window.api` = seule frontière ; **aucun `import 'electron'`** dans `src/renderer`.
- Réutiliser `domain/` ; **aucune logique métier nouvelle** dans les composants/pages.
- TS strict (pas de `any`/`ts-ignore`/inutilisé). `lib/*.mjs`/`hud/*` **inchangés**.
- **Pas de fuite** : abonnements et `setInterval` nettoyés (cleanup `useEffect`). En test, le SDK n'est jamais appelé ; `onCommandEvent` est injecté.
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../specs/2026-06-26-migration-phase3b-vues-flux-design.md).

---

### Task 1 : `App` — registry de vues

**Files:**
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Produces : `App` route `store.view` via un `Record<string, ComponentType>` ; vues non encore portées → `Placeholder`.

- [ ] **Step 1 : Réécrire `src/renderer/App.tsx`**

```tsx
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { Shell } from '@renderer/layouts/Shell';
import { Dashboard } from '@renderer/pages/Dashboard';

// Registry des vues. Les vues non encore portées tombent sur Placeholder (Phases 3b-2/3/4).
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
};

function Placeholder() {
  const view = useAppStore((s) => s.view);
  return (
    <div className="pad">
      <p className="muted">Vue « {view} » — à venir.</p>
    </div>
  );
}

export function App() {
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const Page = VIEWS[view] ?? Placeholder;
  return (
    <Shell>
      <Page />
    </Shell>
  );
}
```

- [ ] **Step 2 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (23 fichiers verts ; comportement inchangé : seul Dashboard est enregistré, le reste = Placeholder, comme avant).

- [ ] **Step 3 : Commit + push**

```bash
git add -A && git commit -m "refactor(phase3b1): App registry de vues (remplace le ternaire)"
git push origin refonte-ts-react-electron
```

---

### Task 2 : Store — valeurs typées + `runStatus` + actions de flux

**Files:**
- Modify: `src/renderer/store/app.store.ts`
- Test: `tests/renderer/app.store.flow.test.mjs`

**Interfaces:**
- Consumes : `applyEvent`, `applyResult`, type `Card` (`@domain/checking`) ; type `TopicEvent` (`@domain/events`) ; types `VerifyOutput`,`DraftOutput`,`ArchiveOutput` (`@shared/schemas/outputs`).
- Produces : `verifyValue: VerifyOutput | null` (et `draftValue: DraftOutput | null`, `archiveValue: ArchiveOutput | null`) ; `runStatus: RunStatus` ; actions `resetCards()`, `applyCardEvent(ev)`, `applyResultCards(value)`, `beginRun(title?)`, `endRun()`, `setRunActivity(label)`, `tickClock(nowMs)` ; export `fmtClock(ms): string`.

- [ ] **Step 1 : Écrire le test**

`tests/renderer/app.store.flow.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore, fmtClock } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('fmtClock formate m:ss', () => {
  assert.equal(fmtClock(0), '0:00');
  assert.equal(fmtClock(65000), '1:05');
  assert.equal(fmtClock(-100), '0:00');
});
test('applyCardEvent ajoute/avance une carte via domain/checking', () => {
  get().resetCards();
  get().applyCardEvent({ type: 'topic-detected', key: 'k', sujet: 'Sujet K' });
  assert.equal(get().cards.length, 1);
  assert.equal(get().cards[0].title, 'Sujet K');
  get().applyCardEvent({ type: 'topic-done', key: 'k' });
  assert.equal(get().cards[0].done, true);
});
test('applyResultCards termine les cartes', () => {
  get().resetCards();
  get().applyResultCards({ topics: [{ key: 'k', sujet: 'S' }] });
  assert.equal(get().cards[0].done, true);
});
test('beginRun/setRunActivity/endRun pilotent runStatus', () => {
  get().beginRun('Vérification en cours');
  assert.equal(get().runStatus.active, true);
  assert.equal(get().runStatus.title, 'Vérification en cours');
  get().setRunActivity('Recherche web…');
  assert.equal(get().runStatus.activity, 'Recherche web…');
  get().endRun();
  assert.equal(get().runStatus.active, false);
});
test('tickClock met à jour l\'horloge', () => {
  get().beginRun();
  const t0 = get().runStatus.t0;
  get().tickClock(t0 + 65000);
  assert.equal(get().runStatus.clock, '1:05');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/app.store.flow.test.mjs` → FAIL (`fmtClock`/actions absents).

- [ ] **Step 3 : Étendre `src/renderer/store/app.store.ts`**

Ajouter les imports en tête :
```ts
import { applyEvent, applyResult } from '@domain/checking';
import type { TopicEvent } from '@domain/events';
import type { VerifyOutput, DraftOutput, ArchiveOutput } from '@shared/schemas/outputs';
```
Ajouter le type + l'export du helper (après les types existants) :
```ts
export interface RunStatus {
  active: boolean;
  title: string;
  t0: number;
  clock: string;
  activity: string;
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const RUN_IDLE: RunStatus = { active: false, title: '', t0: 0, clock: '0:00', activity: '' };
```
Dans l'interface `AppState`, **remplacer** les trois champs `verifyValue`/`draftValue`/`archiveValue: unknown` par :
```ts
  verifyValue: VerifyOutput | null;
  draftValue: DraftOutput | null;
  archiveValue: ArchiveOutput | null;
  runStatus: RunStatus;
```
et **remplacer** les setters `setVerifyValue`/`setDraftValue`/`setArchiveValue: (v: unknown) => void` par les versions typées, puis **ajouter** les actions de flux :
```ts
  setVerifyValue: (v: VerifyOutput | null) => void;
  setDraftValue: (v: DraftOutput | null) => void;
  setArchiveValue: (v: ArchiveOutput | null) => void;
  resetCards: () => void;
  applyCardEvent: (ev: TopicEvent) => void;
  applyResultCards: (value: VerifyOutput) => void;
  beginRun: (title?: string) => void;
  endRun: () => void;
  setRunActivity: (label: string) => void;
  tickClock: (nowMs: number) => void;
```
Dans le `create<AppState>((set, get) => ({ … }))`, mettre l'état initial `verifyValue: null`/`draftValue: null`/`archiveValue: null` (inchangé) + ajouter `runStatus: RUN_IDLE,`, et ajouter les implémentations :
```ts
  resetCards: () => set({ cards: [] }),
  applyCardEvent: (ev) => set({ cards: applyEvent(get().cards, ev) }),
  applyResultCards: (value) => set({ cards: applyResult(get().cards, value) }),
  beginRun: (title) =>
    set({
      runStatus: { active: true, title: title ?? 'Vérification en cours', t0: Date.now(), clock: '0:00', activity: 'Démarrage…' },
    }),
  endRun: () => set((s) => ({ runStatus: { ...s.runStatus, active: false } })),
  setRunActivity: (activity) => set((s) => ({ runStatus: { ...s.runStatus, activity } })),
  tickClock: (nowMs) => set((s) => ({ runStatus: { ...s.runStatus, clock: fmtClock(nowMs - s.runStatus.t0) } })),
```
(Garder `setVerifyValue`/`setDraftValue`/`setArchiveValue` comme simples setters, maintenant typés.)

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/app.store.flow.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 24 fichiers verts.

- [ ] **Step 5 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b1): store — valeurs typées + runStatus + actions de flux (reducers domain/checking) + test"
git push origin refonte-ts-react-electron
```

---

### Task 3 : `useCommandStream` (streaming → store)

**Files:**
- Create: `src/renderer/hooks/useCommandStream.ts`
- Test: `tests/renderer/useCommandStream.test.mjs`

**Interfaces:**
- Consumes : `useAppStore` actions `applyCardEvent`/`setRunActivity` ; `activityFromMessage` n'est PAS appelé ici (les events `activity` arrivent déjà formés depuis le main via `parseSentinels`/activity — le hook route par `ev.type`). `window.api.onCommandEvent` renvoie un désabonnement.
- Produces : `useCommandStream(): void` — à monter une fois (dans `App`) ; abonne le flux, route `activity` → `setRunActivity`, `topic-*` → `applyCardEvent`, et se désabonne au démontage.

> Le main émet déjà des events `{ type:'activity', label }` et `{ type:'topic-…' }` (via `llm.service` → `parseSentinels`/`activityFromMessage`). Le hook n'a qu'à **router par type**.

- [ ] **Step 1 : Écrire le test** (faux `window.api`, events injectés)

`tests/renderer/useCommandStream.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { handleStreamEvent } from '@renderer/hooks/useCommandStream';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('handleStreamEvent route activity → runStatus.activity', () => {
  get().beginRun();
  handleStreamEvent({ type: 'activity', label: 'Lecture : z.ai' });
  assert.equal(get().runStatus.activity, 'Lecture : z.ai');
});
test('handleStreamEvent route topic-* → cards', () => {
  get().resetCards();
  handleStreamEvent({ type: 'topic-detected', key: 'k', sujet: 'S' });
  assert.equal(get().cards.length, 1);
  handleStreamEvent({ type: 'topic-done', key: 'k' });
  assert.equal(get().cards[0].done, true);
});
test('handleStreamEvent ignore un type inconnu', () => {
  get().resetCards();
  handleStreamEvent({ type: 'autre' });
  assert.equal(get().cards.length, 0);
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/useCommandStream.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/renderer/hooks/useCommandStream.ts`**

```ts
import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { TopicEvent } from '@domain/events';

const TOPIC_TYPES = ['topic-detected', 'topic-progress', 'topic-done', 'topic-error'];

// Routage pur d'un évènement de flux vers le store (testable sans React).
export function handleStreamEvent(ev: unknown): void {
  const e = ev as { type?: string; label?: string };
  const store = useAppStore.getState();
  if (e?.type === 'activity') {
    if (e.label) store.setRunActivity(e.label);
    return;
  }
  if (e?.type && TOPIC_TYPES.includes(e.type)) {
    store.applyCardEvent(ev as TopicEvent);
  }
}

// Abonne le flux de commande (à monter une fois, dans App). Cleanup au démontage.
export function useCommandStream(): void {
  useEffect(() => {
    const dispose = window.api.onCommandEvent(handleStreamEvent);
    return dispose;
  }, []);
}
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/useCommandStream.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` → 25 fichiers verts.

- [ ] **Step 5 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b1): useCommandStream (onCommandEvent → store, cleanup) + test"
git push origin refonte-ts-react-electron
```

---

### Task 4 : Composants `RunStatus`, `EnqCard`, `Drawer`

**Files:**
- Create: `src/renderer/components/RunStatus.tsx`, `src/renderer/components/EnqCard.tsx`, `src/renderer/components/Drawer.tsx`
- Create: `src/renderer/components/EnqCard.stories.tsx`

**Interfaces:**
- Consumes : type `Card` (`@domain/checking`) ; `escapeHtml`/`inlineMd` (`@domain/format`) — non, on n'injecte pas d'HTML : on rend en JSX. Type `RunStatus` (`@renderer/store/app.store`).
- Produces : `RunStatus({ status })`, `EnqCard({ card, onOpen })`, `Drawer({ topic })` (présentationnels, props in).

- [ ] **Step 1 : Écrire `RunStatus.tsx`**

```tsx
import type { RunStatus as RunStatusModel } from '@renderer/store/app.store';

interface RunStatusProps {
  status: RunStatusModel;
}

export function RunStatus({ status }: RunStatusProps) {
  if (!status.active) return null;
  return (
    <div
      className="card"
      style={{
        margin: '0 0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        background: 'var(--accentSoft)',
        borderColor: 'var(--accent)',
      }}
    >
      <span className="spinner" aria-hidden="true" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ font: '600 12.5px var(--display)' }}>
          {status.title} · {status.clock}
        </div>
        <div
          style={{
            font: '400 11.5px var(--body)',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status.activity}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Écrire `EnqCard.tsx`** (port de `renderCard` de renderer.mjs)

```tsx
import type { Card } from '@domain/checking';

const niveauColor = (n: string): string =>
  n === 'corrigé' ? 'var(--warn)' : n === 'nuance' ? 'var(--nuance)' : 'var(--accent)';
const niveauSoft = (n: string): string =>
  n === 'corrigé' ? 'var(--warnSoft)' : n === 'nuance' ? 'var(--nuanceSoft)' : 'var(--accentSoft)';
const niveauLabel = (n: string): string =>
  n === 'corrigé' ? 'Fait corrigé' : n === 'nuance' ? 'Nuance' : 'Date';

interface EnqCardProps {
  card: Card;
  onOpen?: (key: string) => void;
}

export function EnqCard({ card, onOpen }: EnqCardProps) {
  const statusColor = card.error ? 'var(--warn)' : card.done ? 'var(--good)' : 'var(--accent)';
  return (
    <div className="enq" onClick={onOpen ? () => onOpen(card.key) : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            animation: card.done ? undefined : 'pulse 1.1s ease-in-out infinite',
          }}
        />
        <span className="eyebrow">Enquêteur</span>
        <span style={{ marginLeft: 'auto', font: '500 10.5px var(--mono)', color: statusColor }}>
          {card.status}
        </span>
      </div>
      <div style={{ font: '600 13.5px/1.3 var(--display)', marginBottom: 12 }}>{card.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {card.steps.map((s) => (
          <div key={s.name} className="enq-step">
            <span className={s.state === 'done' ? 'dot done' : s.state === 'active' ? 'dot active' : 'dot todo'}>
              {s.state === 'done' ? '✓' : ''}
            </span>
            <span style={{ color: s.state === 'todo' ? 'var(--faint)' : 'var(--text)' }}>
              {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
            </span>
          </div>
        ))}
      </div>
      {card.done && !card.error && (
        <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge-good">Source</span>
            <span style={{ font: '500 11px var(--mono)', color: 'var(--muted)' }}>{card.source ?? ''}</span>
          </div>
          {card.alerte && (
            <div className="alert" style={{ background: niveauSoft(card.alerte.niveau) }}>
              <span
                style={{
                  font: '600 10px var(--body)',
                  color: niveauColor(card.alerte.niveau),
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                }}
              >
                {niveauLabel(card.alerte.niveau)}
              </span>
              <span style={{ font: '400 11.5px/1.4 var(--body)', color: 'var(--text)' }}>{card.alerte.texte}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Écrire `Drawer.tsx`** (port de `openDrawer`)

```tsx
import { dateLong } from '@domain/format';
import type { VerifyOutput } from '@shared/schemas/outputs';

const niveauColor = (n: string): string =>
  n === 'corrigé' ? 'var(--warn)' : n === 'nuance' ? 'var(--nuance)' : 'var(--accent)';
const niveauSoft = (n: string): string =>
  n === 'corrigé' ? 'var(--warnSoft)' : n === 'nuance' ? 'var(--nuanceSoft)' : 'var(--accentSoft)';
const niveauLabel = (n: string): string =>
  n === 'corrigé' ? 'Fait corrigé' : n === 'nuance' ? 'Nuance' : 'Date';

type Topic = VerifyOutput['topics'][number];

interface DrawerProps {
  topic: Topic;
}

export function Drawer({ topic }: DrawerProps) {
  const t = topic as Topic & {
    sujet?: string;
    raw?: string;
    date_reelle?: string;
    alerte?: { niveau: string; texte: string } | null;
    faits?: string[];
    url_citee?: string;
    clipping_contenu?: string;
  };
  return (
    <div className="pad">
      <h2 style={{ font: '600 18px/1.3 var(--display)', margin: '0 0 7px' }}>{t.sujet || t.key}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="pill" style={{ color: 'var(--accent)', background: 'var(--accentSoft)' }}>
          {dateLong(t.date_reelle ?? '')}
        </span>
        {t.raw && <span className="faint" style={{ font: '400 11.5px var(--body)' }}>saisi : « {t.raw} »</span>}
      </div>
      {t.alerte && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            background: niveauSoft(t.alerte.niveau),
            border: `1px solid ${niveauColor(t.alerte.niveau)}`,
            borderRadius: 'var(--radiusSm)',
            padding: '12px 13px',
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 15, flex: 'none' }}>⚠</span>
          <div>
            <div
              style={{
                font: '600 11px var(--body)',
                color: niveauColor(t.alerte.niveau),
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}
            >
              {niveauLabel(t.alerte.niveau)}
            </div>
            <div style={{ font: '400 12.5px/1.5 var(--body)', color: 'var(--text)', marginTop: 2 }}>{t.alerte.texte}</div>
          </div>
        </div>
      )}
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Faits vérifiés
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {(t.faits ?? []).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span className="dot done">✓</span>
            <span style={{ font: '400 13px/1.5 var(--body)' }}>{f}</span>
          </div>
        ))}
      </div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Source retenue
      </div>
      <div className="card" style={{ borderRadius: 'var(--radiusSm)', marginBottom: 18 }}>
        <div style={{ font: '600 13px var(--body)' }}>{t.source ?? ''}</div>
        <div
          style={{ font: '400 11px var(--mono)', color: 'var(--accent)', wordBreak: 'break-all', marginTop: 5 }}
        >
          {t.url_citee ?? ''}
        </div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Extrait (clipping)
      </div>
      <div
        style={{
          background: 'var(--panel2)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: '0 var(--radiusSm) var(--radiusSm) 0',
          padding: '12px 14px',
          font: '400 12.5px/1.6 var(--body)',
          color: 'var(--muted)',
          fontStyle: 'italic',
        }}
      >
        {t.clipping_contenu ? t.clipping_contenu.slice(0, 600) : '(pas de clipping)'}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Story `EnqCard.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EnqCard } from './EnqCard';

const meta: Meta<typeof EnqCard> = { component: EnqCard, title: 'EnqCard' };
export default meta;

const base = {
  key: 'glm',
  title: 'GLM-5.2',
  status: 'Terminé',
  done: true,
  error: null,
  source: 'z.ai',
  alerte: { niveau: 'corrigé', texte: '753B, pas 1.5T' },
  steps: ['recherche', 'faits', 'date', 'source', 'article'].map((name) => ({ name, state: 'done' as const })),
};

export const Termine: StoryObj<typeof EnqCard> = { args: { card: base } };
export const EnCours: StoryObj<typeof EnqCard> = {
  args: { card: { ...base, done: false, status: 'en cours', alerte: null, steps: base.steps.map((s, i) => ({ ...s, state: i < 2 ? 'done' : i === 2 ? 'active' : 'todo' })) } },
};
```

- [ ] **Step 5 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (25 fichiers verts). Run : `npm run build-storybook` → OK (les stories compilent).

- [ ] **Step 6 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b1): composants RunStatus/EnqCard/Drawer + story EnqCard"
git push origin refonte-ts-react-electron
```

---

### Task 5 : Page `Compose` (sujets + chips + lancement)

**Files:**
- Create: `src/renderer/pages/Compose.tsx`
- Modify: `src/renderer/App.tsx` (registry : `compose`)

**Interfaces:**
- Consumes : `useAppStore` (`go`,`showToast`,`resetCards`,`setVerifyValue`,`applyResultCards`,`beginRun`,`endRun`,`setView`) ; `window.api.sendCommand`.
- Produces : page `Compose` (textarea contrôlé + chips détectés + bouton « Lancer l'enquête » qui navigue vers checking et lance la vérification).

- [ ] **Step 1 : Écrire `src/renderer/pages/Compose.tsx`** (port de la vue compose + `launch`/`runVerify`)

```tsx
import { useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { VerifyOutput } from '@shared/schemas/outputs';

export function Compose() {
  const [raw, setRaw] = useState('');
  const store = useAppStore();

  const chips = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((l) => (l.length > 22 ? l.slice(0, 20) + '…' : l));

  async function launch(): Promise<void> {
    const sujets = raw.trim();
    if (!sujets) {
      store.showToast('Donne au moins un sujet.');
      return;
    }
    store.resetCards();
    store.setVerifyValue(null);
    store.setView('checking');
    store.beginRun('Vérification en cours');
    const r = await window.api.sendCommand('breves-verify', { sujets });
    store.endRun();
    if (!r.ok) {
      store.showToast('Échec de la vérification : ' + r.error);
      return;
    }
    const value = r.value as VerifyOutput;
    store.setVerifyValue(value);
    store.applyResultCards(value);
  }

  return (
    <section>
      <div className="pad">
        <h1 style={{ font: '600 20px/1.15 var(--display)', margin: '0 0 4px' }}>Sujets en vrac</h1>
        <p className="muted" style={{ font: '400 13px/1.5 var(--body)', margin: '0 0 16px' }}>
          Un sujet par ligne. Pas besoin de dates ni de liens : chaque enquêteur les trouve seul.
        </p>
        <textarea
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'GLM 5.2, un modèle chinois open source de 753 milliards de paramètres\nMidjourney lance un scanner corporel'}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '500 11px var(--mono)', color: 'var(--faint)' }}>DÉTECTÉS</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c, i) => (
              <span key={i} className="pill">
                {c}
              </span>
            ))}
          </span>
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: 18, fontSize: 15 }}
          disabled={store.runStatus.active}
          onClick={() => void launch()}
        >
          Lancer l'enquête <span style={{ fontSize: 16 }}>→</span>
        </button>
        <p className="faint" style={{ font: '400 12px var(--body)', textAlign: 'center', margin: '10px 0 0' }}>
          Les enquêteurs partiront en parallèle sur le web.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Enregistrer `compose` dans `App.tsx`**

Ajouter l'import et l'entrée registry :
```tsx
import { Compose } from '@renderer/pages/Compose';
// …
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
  compose: Compose,
};
```

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (25 fichiers verts).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b1): page Compose (sujets/chips/lancement verify) + registry"
git push origin refonte-ts-react-electron
```

---

### Task 6 : Pages `Checking` + `Detail` + montage du stream

**Files:**
- Create: `src/renderer/pages/Checking.tsx`, `src/renderer/pages/Detail.tsx`
- Modify: `src/renderer/App.tsx` (registry `checking`/`detail` + `useCommandStream()` + intervalle d'horloge)

**Interfaces:**
- Consumes : `useAppStore` (`cards`,`verifyValue`,`runStatus`,`go`,`setView`) ; `summary` (`@domain/checking`) ; `EnqCard`,`RunStatus`,`Drawer` ; `useCommandStream`.
- Produces : `Checking` (cartes streaming + statut + résumé + bouton rédiger), `Detail` (drawer du sujet sélectionné). `App` monte `useCommandStream()` + l'horloge.

- [ ] **Step 1 : Écrire `src/renderer/pages/Checking.tsx`** (port de `renderChecking`/`summary`)

```tsx
import { useAppStore } from '@renderer/store/app.store';
import { summary } from '@domain/checking';
import { EnqCard } from '@renderer/components/EnqCard';
import { RunStatus } from '@renderer/components/RunStatus';

export function Checking() {
  const cards = useAppStore((s) => s.cards);
  const verifyValue = useAppStore((s) => s.verifyValue);
  const runStatus = useAppStore((s) => s.runStatus);
  const go = useAppStore((s) => s.go);
  const setView = useAppStore((s) => s.setView);
  const setDrawerKey = useAppStore((s) => s.setDrawerKey);

  const done = !runStatus.active && cards.length > 0 && !!verifyValue;
  const sum = done ? summary(cards) : null;
  const openDrawer = verifyValue
    ? (key: string): void => {
        setDrawerKey(key);
        setView('detail');
      }
    : undefined;

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 16px' }}>
          Chacun vérifie les faits, la date, la source et l'article. <b style={{ color: 'var(--text)' }}>Il n'invente jamais</b> :
          un fait non confirmé est signalé.
        </p>
        <RunStatus status={runStatus} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((c) => (
            <EnqCard key={c.key} card={c} onOpen={openDrawer} />
          ))}
        </div>
        {sum && (
          <div className="card" style={{ marginTop: 16, background: 'var(--accentSoft)', borderColor: 'var(--accent)' }}>
            <div style={{ font: '600 14px var(--display)' }}>
              {sum.verifies} vérifiés · {sum.corriges} corrigés · {sum.nuances} nuancés
            </div>
            <div className="muted" style={{ font: '400 12px var(--body)', margin: '2px 0 12px' }}>
              Tout est sourcé. On passe à la rédaction.
            </div>
            <button className="btn-primary" onClick={() => go('toEditor')}>
              Rédiger les brèves →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Ajouter `drawerKey` au store** (clé du sujet ouvert dans le drawer)

Dans `app.store.ts` : ajouter le champ `drawerKey: string | null;` (initial `null`) et l'action `setDrawerKey: (key: string | null) => void;` → `setDrawerKey: (drawerKey) => set({ drawerKey }),`.

- [ ] **Step 3 : Écrire `src/renderer/pages/Detail.tsx`**

```tsx
import { useAppStore } from '@renderer/store/app.store';
import { Drawer } from '@renderer/components/Drawer';

export function Detail() {
  const verifyValue = useAppStore((s) => s.verifyValue);
  const drawerKey = useAppStore((s) => s.drawerKey);
  const topic = verifyValue?.topics.find((t) => t.key === drawerKey);
  if (!topic) return <div className="pad" />;
  return <Drawer topic={topic} />;
}
```

- [ ] **Step 4 : Monter le stream + l'horloge + enregistrer les vues dans `App.tsx`**

Ajouter les imports `Checking`/`Detail`/`useCommandStream`, les entrées registry `checking`/`detail`, et dans `App` :
```tsx
import { Checking } from '@renderer/pages/Checking';
import { Detail } from '@renderer/pages/Detail';
import { useCommandStream } from '@renderer/hooks/useCommandStream';
// dans App(), après les hooks de store :
  const runActive = useAppStore((s) => s.runStatus.active);
  const tickClock = useAppStore((s) => s.tickClock);
  useCommandStream();
  useEffect(() => {
    if (!runActive) return;
    const id = setInterval(() => tickClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runActive, tickClock]);
// registry :
const VIEWS: Record<string, ComponentType> = {
  dashboard: Dashboard,
  compose: Compose,
  checking: Checking,
  detail: Detail,
};
```

- [ ] **Step 5 : Vérifier qualité + build + parité**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (25 fichiers verts).
Run (sanity build sous Node 22) : `rm -rf .vite && ( npm start > /tmp/3b1.log 2>&1 & ) ; sleep 30 ; grep -iE "Cannot find|Failed to resolve|error|Uncaught" /tmp/3b1.log | head ; ls .vite/build ; pkill -f electron-forge; pkill -f '\.vite/build'` → build sans erreur. **Validation visuelle/fonctionnelle par l'utilisateur** : Dashboard → « Nouvelle édition » → saisir des sujets → « Lancer » → cartes qui se cochent en live → clic carte → drawer.

- [ ] **Step 6 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b1): pages Checking + Detail + montage useCommandStream/horloge (flux vérif streaming)"
git push origin refonte-ts-react-electron
```

---

## Critères de réussite Phase 3b-1 (revue finale)

- [ ] `App` route via registry ; `useCommandStream` + horloge montés ; cleanup OK (pas de fuite).
- [ ] Store : valeurs typées (`VerifyOutput`/`DraftOutput`/`ArchiveOutput`), `runStatus`, actions de flux ; reducers réutilisent `domain/checking`. Testé Vitest.
- [ ] Vues **compose → checking (streaming) → detail** portées, parité look/comportement avec le vanilla ; cartes qui se cochent sur events réels ; résumé ; drawer.
- [ ] `npm run typecheck`/`lint`/`test` verts (Node 22) ; `npm start` build sans erreur ; Storybook compile.
- [ ] `lib/*.mjs`/`hud/*` inchangés ; aucun `import 'electron'` dans `src/renderer`.

## Reste (3b-2/3/4)

editor/archived (rédaction + archivage) ; soul/ech-editions/ech-breves/agents ; history/reader. Plans séparés.
