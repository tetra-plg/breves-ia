# Migration Phase 2.1 — Domaine pur + schémas Zod : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir les modules **purs** de `lib/` en TypeScript strict sous `src/domain/` (regroupés par thème) et `src/shared/` (schémas Zod = source de vérité), sans toucher au code Electron ni au comportement.

**Architecture:** Couche **additive** : on crée `domain/*.ts` et `shared/*` à côté des `lib/*.mjs` (qui restent en place, consommés par le legacy jusqu'aux Phases 2.2/4). Les tests des modules convertis sont **portés** (déplacés) vers les nouveaux modules typés (changement de chemin d'import). Zod est interne ; les fonctions de frontière (`validateInputs`, `validateVerifyOutput`/`Draft`/`Archive`) conservent le contrat `{ ok, errors|value }` pour que 2.2 et les tests ne cassent pas.

**Tech Stack:** TypeScript strict, Zod, Vitest. Alias `@domain` → `src/domain`, `@shared` → `src/shared` (déjà câblés tsconfig + vitest).

## Global Constraints

- Node ≥ 20. Projet ESM (`"type": "module"`).
- **Zéro dépendance Electron/React/fs dans `domain/` et `shared/`** (modules purs).
- **Ne pas modifier** `lib/*.mjs` ni `hud/*` (rewiring = Phase 2.2 ; suppression = Phase 4).
- **Comportement inchangé** : les ports sont 1:1 en logique. Les schémas Zod doivent être **équivalents** aux validateurs manuels (mêmes valides/invalides), et **préserver les champs non validés** (`.passthrough()`) car le runner/UI consomment des champs hors-contrat (ex. `topic.raw`).
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée (`noUnusedLocals`/`Parameters` actifs).
- Suite de tests **verte à chaque commit** (référence de départ : 17 fichiers / 121 tests).
- Les fonctions de frontière conservent leur signature exacte :
  - `validateInputs(skill: string, inputs: unknown): { ok: true } | { ok: false, errors: string[] }`
  - `validateVerifyOutput|validateDraftOutput|validateArchiveOutput(obj: unknown): { ok: true, value: T } | { ok: false, errors: string[] }`
  - `buildPrompt(skill: string, inputs: unknown): string`
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md](../specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md).

**Convention de port de test** (toutes les tâches) : le test existant `tests/<x>.test.mjs` est **déplacé** vers `tests/domain/<y>.test.mjs` ou `tests/shared/<y>.test.mjs` (`git mv`), et **seule sa ligne d'import** change (`../lib/<x>.mjs` → `@domain/<y>` ou `@shared/<y>`). Les assertions restent identiques (le contrat `{ ok }` est préservé). On garde l'extension `.test.mjs` (Vitest importe le `.ts` via alias sans souci) et `import { test } from 'vitest'` + `node:assert/strict`.

---

### Task 1 : `domain/format.ts` (← ui-format)

**Files:**
- Create: `src/domain/format.ts`
- Move: `tests/ui-format.test.mjs` → `tests/domain/format.test.mjs`

**Interfaces:**
- Produces: `escapeHtml(s: unknown): string`, `inlineMd(s: string): string`, `dateLong(iso: string): string`, `soulVersionLabel(version: string | null | undefined): string`.

- [ ] **Step 1 : Porter le test**

```bash
mkdir -p tests/domain
git mv tests/ui-format.test.mjs tests/domain/format.test.mjs
```
Puis dans `tests/domain/format.test.mjs`, remplacer la ligne d'import :
`import { escapeHtml, inlineMd, dateLong, soulVersionLabel } from '../lib/ui-format.mjs';`
→ `import { escapeHtml, inlineMd, dateLong, soulVersionLabel } from '@domain/format';`

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run : `npx vitest run tests/domain/format.test.mjs`
Expected : FAIL — `Failed to resolve import '@domain/format'`.

- [ ] **Step 3 : Écrire `src/domain/format.ts`**

```ts
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>]/g, (c) => ENTITIES[c]);
}

export function inlineMd(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const FR = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function dateLong(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso;
  return FR.format(new Date(`${iso}T00:00:00Z`));
}

export function soulVersionLabel(version: string | null | undefined): string {
  return version || 'v1';
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run : `npx vitest run tests/domain/format.test.mjs`
Expected : PASS.

- [ ] **Step 5 : typecheck + suite complète**

Run : `npm run typecheck` → exit 0.
Run : `npm test` → 17 fichiers verts (compte de tests inchangé, le fichier a juste été déplacé).

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): domain/format.ts (← ui-format) + test porté"
```

---

### Task 2 : `domain/navigation.ts` (← ui-state)

**Files:**
- Create: `src/domain/navigation.ts`
- Move: `tests/ui-state.test.mjs` → `tests/domain/navigation.test.mjs`

**Interfaces:**
- Produces: `VIEWS`, `FLOW` (tuples `readonly`), `nextView(current: string, action: string): string`, `stepper(view: string): Stepper`, `viewTitle(view: string): string`. Types `StepperStep`, `Stepper`.

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/ui-state.test.mjs tests/domain/navigation.test.mjs
```
Remplacer l'import `../lib/ui-state.mjs` → `@domain/navigation` (garder les symboles importés à l'identique).

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/domain/navigation.test.mjs`
Expected : FAIL — import non résolu.

- [ ] **Step 3 : Écrire `src/domain/navigation.ts`**

```ts
export const VIEWS = [
  'dashboard', 'compose', 'checking', 'editor', 'archived',
  'soul', 'history', 'agents', 'ech-editions', 'ech-breves',
] as const;

export const FLOW = ['compose', 'checking', 'editor', 'archived'] as const;

const LABELS = ['Sujets', 'Vérification', 'Rédaction', 'Archivé'];

const ACTIONS: Record<string, string> = {
  goDash: 'dashboard', goCompose: 'compose', goSoul: 'soul', goHist: 'history', goAgents: 'agents',
  launch: 'checking', toEditor: 'editor', validate: 'archived',
};

export function nextView(current: string, action: string): string {
  return ACTIONS[action] || current;
}

export type StepperStepState = 'todo' | 'active' | 'done';
export interface StepperStep {
  n: string;
  label: string;
  state: StepperStepState;
}
export interface Stepper {
  steps: StepperStep[];
  line: string;
}

export function stepper(view: string): Stepper {
  const i = (FLOW as readonly string[]).indexOf(view);
  if (i === -1) return { steps: [], line: '' };
  const steps: StepperStep[] = LABELS.map((label, k) => ({
    n: String(k + 1),
    label,
    state: k < i ? 'done' : k === i ? 'active' : 'todo',
  }));
  return { steps, line: `${i + 1} / 4 · ${LABELS[i]}` };
}

export function viewTitle(view: string): string {
  if ((FLOW as readonly string[]).includes(view)) return 'Nouvelle édition';
  if (view === 'soul') return 'SOUL — le style';
  if (view === 'history') return 'Historique';
  if (view === 'agents') return 'Agents';
  if (view === 'ech-editions') return 'Choisir une édition';
  if (view === 'ech-breves') return 'Choisir une brève';
  return 'Brèves IA';
}
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/domain/navigation.test.mjs` → PASS.

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 17 fichiers verts.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): domain/navigation.ts (← ui-state) + test porté"
```

---

### Task 3 : `domain/events.ts` + `domain/checking.ts` (← checking-model)

**Files:**
- Create: `src/domain/events.ts` (types partagés des évènements de flux)
- Create: `src/domain/checking.ts`
- Move: `tests/checking-model.test.mjs` → `tests/domain/checking.test.mjs`

**Interfaces:**
- Produces (`events.ts`) : type `AlertLevel = 'corrigé'|'nuance'|'date'`, interface `Alerte { niveau: AlertLevel; texte: string }`, union `TopicEvent`, interface `ActivityEvent { type: 'activity'; label: string }`.
- Produces (`checking.ts`) : `STEPS`, interfaces `CheckStep`, `Card`, `CheckSummary` ; `initCard(key: string, title: string): Card`, `applyEvent(cards: Card[], ev: TopicEvent): Card[]`, `applyResult(cards: Card[], value: { topics?: VerifyTopicLike[] } | null | undefined): Card[]`, `summary(cards: Card[]): CheckSummary`.

> **Note d'archi** : `events.ts` est un petit module de types partagés (raffinement du design : `TopicEvent`/`ActivityEvent` sont consommés par `checking` et produits par `edition`/`agents`). Il n'a pas de test propre (types purs) — il est couvert par `npm run typecheck` et les tests de `checking`.

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/checking-model.test.mjs tests/domain/checking.test.mjs
```
Remplacer l'import `../lib/checking-model.mjs` → `@domain/checking`.

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/domain/checking.test.mjs` → FAIL (import non résolu).

- [ ] **Step 3a : Écrire `src/domain/events.ts`**

```ts
export type AlertLevel = 'corrigé' | 'nuance' | 'date';

export interface Alerte {
  niveau: AlertLevel;
  texte: string;
}

export type TopicEvent =
  | { type: 'topic-detected'; key: string; sujet: string }
  | { type: 'topic-progress'; key: string; step: string }
  | { type: 'topic-done'; key: string }
  | { type: 'topic-error'; key: string; error: string };

export interface ActivityEvent {
  type: 'activity';
  label: string;
}
```

- [ ] **Step 3b : Écrire `src/domain/checking.ts`**

```ts
import type { Alerte, TopicEvent } from '@domain/events';

export const STEPS = ['recherche', 'faits', 'date', 'source', 'article'] as const;

export type StepState = 'todo' | 'active' | 'done';

export interface CheckStep {
  name: string;
  state: StepState;
}

export interface Card {
  key: string;
  title: string;
  status: string;
  done: boolean;
  error: string | null;
  source: string | null;
  alerte: Alerte | null;
  steps: CheckStep[];
}

export interface VerifyTopicLike {
  key: string;
  sujet?: string;
  source?: string | null;
  alerte?: Alerte | null;
}

export interface CheckSummary {
  verifies: number;
  corriges: number;
  nuances: number;
}

export function initCard(key: string, title: string): Card {
  return {
    key,
    title,
    status: 'en cours',
    done: false,
    error: null,
    source: null,
    alerte: null,
    steps: STEPS.map((name, i) => ({ name, state: i === 0 ? 'active' : 'todo' })),
  };
}

function mapCard(cards: Card[], key: string, fn: (c: Card) => Card): Card[] {
  return cards.map((c) =>
    c.key === key ? fn({ ...c, steps: c.steps.map((s) => ({ ...s })) }) : c,
  );
}

function allDone(card: Card): Card {
  card.steps.forEach((s) => {
    s.state = 'done';
  });
  card.done = true;
  return card;
}

export function applyEvent(cards: Card[], ev: TopicEvent): Card[] {
  if (ev.type === 'topic-detected') {
    if (cards.some((c) => c.key === ev.key)) return cards;
    return [...cards, initCard(ev.key, ev.sujet)];
  }
  if (ev.type === 'topic-progress') {
    return mapCard(cards, ev.key, (c) => {
      const i = (STEPS as readonly string[]).indexOf(ev.step);
      if (i >= 0) {
        c.steps[i].state = 'done';
        if (i + 1 < c.steps.length && c.steps[i + 1].state === 'todo') c.steps[i + 1].state = 'active';
      }
      return c;
    });
  }
  if (ev.type === 'topic-done') {
    return mapCard(cards, ev.key, (c) => {
      allDone(c);
      c.status = 'Terminé';
      return c;
    });
  }
  if (ev.type === 'topic-error') {
    return mapCard(cards, ev.key, (c) => {
      c.done = true;
      c.status = 'Erreur';
      c.error = ev.error;
      return c;
    });
  }
  return cards;
}

export function applyResult(
  cards: Card[],
  value: { topics?: VerifyTopicLike[] } | null | undefined,
): Card[] {
  let out = cards;
  for (const t of value?.topics ?? []) {
    if (!out.some((c) => c.key === t.key)) out = [...out, initCard(t.key, t.sujet || t.key)];
    out = mapCard(out, t.key, (c) => {
      if (!c.error) allDone(c);
      c.status = c.error ? c.status : 'Terminé';
      c.source = t.source ?? c.source;
      c.alerte = t.alerte ?? c.alerte;
      return c;
    });
  }
  return out;
}

export function summary(cards: Card[]): CheckSummary {
  let verifies = 0;
  let corriges = 0;
  let nuances = 0;
  for (const c of cards) {
    if (c.done && !c.error) verifies++;
    if (c.alerte?.niveau === 'corrigé') corriges++;
    if (c.alerte?.niveau === 'nuance') nuances++;
  }
  return { verifies, corriges, nuances };
}
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/domain/checking.test.mjs` → PASS.

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 17 fichiers verts.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): domain/events.ts + domain/checking.ts (← checking-model) + test porté"
```

---

### Task 4 : `domain/edition.ts` (← edition-render + edition-breves + parse-result)

**Files:**
- Create: `src/domain/edition.ts`
- Move: `tests/edition-render.test.mjs` → `tests/domain/edition-render.test.mjs`
- Move: `tests/edition-breves.test.mjs` → `tests/domain/edition-breves.test.mjs`
- Move: `tests/parse-result.test.mjs` → `tests/domain/parse-result.test.mjs`

**Interfaces:**
- Consumes : `escapeHtml`, `inlineMd` de `@domain/format` ; type `TopicEvent` de `@domain/events`.
- Produces : `renderEditionHtml(markdown: string): string`, `extractBreves(noteText: string): Breve[]` (interface `Breve`), `extractJsonBlock(text: string): unknown`, `parseSentinels(text: string): TopicEvent[]`.

- [ ] **Step 1 : Porter les trois tests**

```bash
git mv tests/edition-render.test.mjs tests/domain/edition-render.test.mjs
git mv tests/edition-breves.test.mjs tests/domain/edition-breves.test.mjs
git mv tests/parse-result.test.mjs tests/domain/parse-result.test.mjs
```
Dans chacun, remplacer l'import :
- `../lib/edition-render.mjs` → `@domain/edition`
- `../lib/edition-breves.mjs` → `@domain/edition`
- `../lib/parse-result.mjs` → `@domain/edition`
(garder les symboles importés tels quels).

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/domain/edition-render.test.mjs tests/domain/edition-breves.test.mjs tests/domain/parse-result.test.mjs`
Expected : FAIL (import non résolu).

- [ ] **Step 3 : Écrire `src/domain/edition.ts`**

```ts
import { escapeHtml, inlineMd } from '@domain/format';
import type { TopicEvent } from '@domain/events';

// ---------- rendu d'une édition archivée (← edition-render) ----------

const DATE_RE = /^—\s*(.+?)\s*—$/;
const URL_RE = /^(?:source\s*:\s*)?(https?:\/\/\S+)$/i;
const H_RE = /^#{2,3}\s+(.+)$/;
const HR_RE = /^-{3,}$/;
const BARE_URL_RE = /^(https?:\/\/\S+)$/;
const isTableSep = (l: string): boolean => /\|/.test(l) && /^[\s|:-]+$/.test(l);
const cells = (row: string): string[] =>
  row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

function srcLink(url: string): string {
  let domaine = url;
  try {
    domaine = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* garde l'url */
  }
  return `<a class="ed-src" data-url="${escapeHtml(url)}">${escapeHtml(domaine)} →</a>`;
}

export function renderEditionHtml(markdown: string): string {
  if (typeof markdown !== 'string') return '';
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let titleDone = false;
  let firstDateSeen = false;
  let cardOpen = false;
  let breveStarted = false;
  const closeCard = (): void => {
    if (cardOpen) {
      html += '</div>';
      cardOpen = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (HR_RE.test(line)) {
      closeCard();
      html += '<hr class="ed-hr">';
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1].trim())) {
      closeCard();
      i += 2;
      let rows = '';
      for (; i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== ''; i++) {
        const cs = cells(lines[i].trim());
        const inner = cs
          .map((cell, k) => {
            const um = cell.match(BARE_URL_RE);
            if (um) return srcLink(um[1]);
            return `<span class="${k === 0 ? 'ed-srcsubj' : 'ed-srcnote'}">${inlineMd(cell)}</span>`;
          })
          .join(' ');
        rows += `<div class="ed-srcrow">${inner}</div>`;
      }
      i--;
      html += `<div class="ed-srclist">${rows}</div>`;
      continue;
    }

    const hm = line.match(H_RE);
    if (hm) {
      closeCard();
      html += `<div class="ed-h2">${inlineMd(hm[1])}</div>`;
      continue;
    }

    const dm = line.match(DATE_RE);
    if (dm) {
      closeCard();
      firstDateSeen = true;
      cardOpen = true;
      breveStarted = false;
      html += `<div class="card ed-breve"><div class="ed-date">${inlineMd(dm[1])}</div>`;
      continue;
    }

    const um = line.match(URL_RE);
    if (um) {
      html += srcLink(um[1]);
      continue;
    }

    if (!titleDone && !firstDateSeen) {
      titleDone = true;
      html += `<div class="ed-title">${inlineMd(line.replace(/^#+\s*/, ''))}</div>`;
      continue;
    }
    if (!firstDateSeen) {
      html += `<p class="ed-intro">${inlineMd(line)}</p>`;
      continue;
    }
    if (/^\*\*/.test(line)) {
      if (breveStarted) html += '<div class="ed-bsep"></div>';
      breveStarted = true;
    }
    html += `<p class="ed-body">${inlineMd(line)}</p>`;
  }
  closeCard();
  return html;
}

// ---------- extraction de brèves (← edition-breves) ----------

export interface Breve {
  date: string;
  source: string;
  accroche: string;
  texte: string;
}

const B_DATE_RE = /^—\s*(.+?)\s*—$/;
const B_URL_RE = /^(?:source\s*:\s*)?(https?:\/\/\S+)$/i;
const B_H_RE = /^#{1,6}\s/;
const B_HR_RE = /^-{3,}$/;

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
function accrocheOf(texte: string): string {
  const m = texte.match(/\*\*(.+?)\*\*/);
  return m ? m[1].trim() : texte.split('\n')[0].trim();
}

interface BreveAcc {
  date: string;
  lines: string[];
  url: string;
}

export function extractBreves(noteText: string): Breve[] {
  if (typeof noteText !== 'string') return [];
  const lines = noteText.split(/\r?\n/);
  const breves: Breve[] = [];
  let curDate = '';
  let firstDateSeen = false;
  let cur: BreveAcc | null = null;
  const flush = (): void => {
    if (cur && cur.lines.length) {
      const texte = cur.lines.join('\n').trim();
      breves.push({ date: cur.date, source: domainOf(cur.url), accroche: accrocheOf(texte), texte });
    }
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dm = line.match(B_DATE_RE);
    if (dm) {
      flush();
      curDate = dm[1].trim();
      firstDateSeen = true;
      continue;
    }
    if (!firstDateSeen) continue;
    if (B_H_RE.test(line) || B_HR_RE.test(line) || line.includes('|')) {
      flush();
      continue;
    }
    const um = line.match(B_URL_RE);
    if (um) {
      if (cur) {
        cur.url = cur.url || um[1];
        cur.lines.push(um[1]);
      }
      continue;
    }
    if (/^\*\*/.test(line)) {
      flush();
      cur = { date: curDate, lines: [line], url: '' };
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  flush();
  return breves;
}

// ---------- parsing du flux SDK (← parse-result) ----------

const SENTINEL_STEPS = ['recherche', 'faits', 'date', 'source', 'article'];

export function extractJsonBlock(text: string): unknown {
  const s = String(text);
  const open = s.lastIndexOf('```json');
  if (open !== -1) {
    const after = s.slice(open + '```json'.length);
    const close = after.lastIndexOf('```');
    if (close !== -1) {
      try {
        return JSON.parse(after.slice(0, close).trim());
      } catch {
        /* tombe au fallback */
      }
    }
  }
  try {
    return JSON.parse(s.trim());
  } catch {
    /* rien */
  }
  throw new Error('aucun bloc JSON');
}

export function parseSentinels(text: string): TopicEvent[] {
  const out: TopicEvent[] = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('«BREVES»')) continue;
    const rest = line.slice('«BREVES»'.length).trim();
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^topic\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-detected', key: m[1], sujet: m[2].trim() });
    } else if ((m = rest.match(/^step\s+(\S+)\s+(\S+)$/))) {
      if (SENTINEL_STEPS.includes(m[2])) out.push({ type: 'topic-progress', key: m[1], step: m[2] });
    } else if ((m = rest.match(/^done\s+(\S+)$/))) {
      out.push({ type: 'topic-done', key: m[1] });
    } else if ((m = rest.match(/^error\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-error', key: m[1], error: m[2].trim() });
    }
  }
  return out;
}
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/domain/edition-render.test.mjs tests/domain/edition-breves.test.mjs tests/domain/parse-result.test.mjs`
Expected : PASS (les trois).

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 17 fichiers verts.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): domain/edition.ts (← edition-render + edition-breves + parse-result) + tests portés"
```

---

### Task 5 : `domain/soul.ts` (← soul-model)

**Files:**
- Create: `src/domain/soul.ts`
- Move: `tests/soul-model.test.mjs` → `tests/domain/soul.test.mjs`

**Interfaces:**
- Produces : interfaces `Echantillon`, `JournalEntry`, `Soul`, `SoulSectionEdits` ; `parseSoul(raw: string): Soul`, `serializeEchantillons(entries: Echantillon[]): string`, `replaceSoulEchantillons(raw: string, entries: Echantillon[]): string`, `replaceSoulSections(raw: string, edits: SoulSectionEdits): string`.

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/soul-model.test.mjs tests/domain/soul.test.mjs
```
Remplacer l'import `../lib/soul-model.mjs` → `@domain/soul`.

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/domain/soul.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/domain/soul.ts`**

```ts
export interface Echantillon {
  date: string;
  source: string;
  texte: string;
}

export interface JournalEntry {
  date: string;
  texte: string;
}

export interface Soul {
  version: string;
  quiParle: string;
  audience: string;
  voix: string;
  lignesRouges: string;
  echantillons: Echantillon[];
  journal: JournalEntry[];
}

export interface SoulSectionEdits {
  quiParle: string;
  audience: string;
  voix: string;
  lignesRouges: string;
}

function sectionBody(raw: string, n: number): string {
  for (const part of String(raw).split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) {
      const nl = part.indexOf('\n');
      return nl === -1 ? '' : part.slice(nl + 1).trim();
    }
  }
  return '';
}

function parseEchantillons(body5: string): Echantillon[] {
  return body5
    .split(/^###\s+/m)
    .slice(1)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      const head = nl === -1 ? chunk : chunk.slice(0, nl);
      const dm = head.match(/^\[(\d{4}-\d{2}-\d{2})\]/);
      const sm = head.match(/·\s*(.+?)\s*$/);
      return {
        date: dm ? dm[1] : '',
        source: sm ? sm[1].trim() : '',
        texte: nl === -1 ? '' : chunk.slice(nl + 1).trim(),
      };
    });
}

function parseJournal(body6: string): JournalEntry[] {
  return [...body6.matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)].map((m) => ({
    date: m[1],
    texte: m[2].trim(),
  }));
}

export function parseSoul(raw: string): Soul {
  const s = String(raw);
  const journal = parseJournal(sectionBody(s, 6));
  return {
    version: `v${journal.length + 1}`,
    quiParle: sectionBody(s, 1),
    audience: sectionBody(s, 2),
    voix: sectionBody(s, 3),
    lignesRouges: sectionBody(s, 4),
    echantillons: parseEchantillons(sectionBody(s, 5)),
    journal,
  };
}

const ECH_PREAMBULE =
  '> Jusqu\'à 3 brèves validées, choisies à la main, verbatim. Elles donnent le ton de la plume : densité, rythme, structure. Curées depuis l\'éditeur SOUL.';

export function serializeEchantillons(entries: Echantillon[]): string {
  const items = (entries || []).slice(0, 3).map((e) => {
    const head = e.source ? `### [${e.date}] · ${e.source}` : `### [${e.date}]`;
    return `${head}\n${String(e.texte || '').trim()}`;
  });
  return [ECH_PREAMBULE, ...items].join('\n\n') + '\n';
}

export function replaceSoulEchantillons(raw: string, entries: Echantillon[]): string {
  const body = serializeEchantillons(entries);
  const parts = String(raw).split(/(^##\s+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] || '';
    if (/^5\./.test(block)) {
      const nl = block.indexOf('\n');
      const titleLine = nl === -1 ? block : block.slice(0, nl);
      parts[i + 1] = `${titleLine}\n${body}\n`;
    }
  }
  return parts.join('');
}

export function replaceSoulSections(raw: string, edits: SoulSectionEdits): string {
  const fields: Record<string, string> = {
    1: edits.quiParle,
    2: edits.audience,
    3: edits.voix,
    4: edits.lignesRouges,
  };
  const parts = String(raw).split(/(^##\s+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] || '';
    const m = block.match(/^(\d)\./);
    if (m && fields[m[1]] != null) {
      const nl = block.indexOf('\n');
      const titleLine = nl === -1 ? block : block.slice(0, nl);
      parts[i + 1] = `${titleLine}\n${fields[m[1]]}\n\n`;
    }
  }
  return parts.join('');
}
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/domain/soul.test.mjs` → PASS.

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 17 fichiers verts.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): domain/soul.ts (← soul-model) + test porté"
```

---

### Task 6 : `domain/agents.ts` (← agent-file + activity)

**Files:**
- Create: `src/domain/agents.ts`
- Move: `tests/agent-file.test.mjs` → `tests/domain/agents-file.test.mjs`
- Move: `tests/activity.test.mjs` → `tests/domain/activity.test.mjs`

**Interfaces:**
- Consumes : type `ActivityEvent` de `@domain/events`.
- Produces : interfaces `Agent`, `AgentDefinition` ; `parseAgent(raw: string): Agent`, `toAgentDefinition(a: Agent): AgentDefinition`, `serializeAgent(a: Agent): string`, `labelForTool(name: string, input?: Record<string, unknown>): string | null`, `activityFromMessage(m: unknown): ActivityEvent[]`.

- [ ] **Step 1 : Porter les deux tests**

```bash
git mv tests/agent-file.test.mjs tests/domain/agents-file.test.mjs
git mv tests/activity.test.mjs tests/domain/activity.test.mjs
```
Remplacer les imports `../lib/agent-file.mjs` → `@domain/agents` et `../lib/activity.mjs` → `@domain/agents`.

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/domain/agents-file.test.mjs tests/domain/activity.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/domain/agents.ts`**

```ts
import type { ActivityEvent } from '@domain/events';

// ---------- fichiers agents (← agent-file) ----------

export interface Agent {
  name: string;
  description: string;
  tools: string[];
  model: string;
  enabled: boolean;
  mode: string;
  systemPrompt: string;
}

export interface AgentDefinition {
  description: string;
  prompt: string;
  tools: string[];
  model?: string;
}

function splitFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const m = String(raw).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: String(raw).trim() };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: m[2].trim() };
}

export function parseAgent(raw: string): Agent {
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

export function toAgentDefinition(a: Agent): AgentDefinition {
  const def: AgentDefinition = { description: a.description, prompt: a.systemPrompt, tools: a.tools || [] };
  if (a.model) def.model = a.model;
  return def;
}

export function serializeAgent(a: Agent): string {
  const fm = ['---', `name: ${a.name || ''}`];
  if (a.description) fm.push(`description: ${a.description}`);
  fm.push(`tools: ${(a.tools || []).join(', ')}`);
  if (a.model) fm.push(`model: ${a.model}`);
  fm.push(`breves_enabled: ${a.enabled === false ? 'false' : 'true'}`);
  if (a.mode) fm.push(`breves_mode: ${a.mode}`);
  fm.push('---');
  return `${fm.join('\n')}\n${(a.systemPrompt || '').trim()}\n`;
}

// ---------- libellés d'activité (← activity) ----------

function trim(s: unknown, n: number): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function hostOf(url: unknown): string {
  const m = String(url || '').match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, '') : trim(url, 40);
}

function baseOf(p: unknown): string {
  const s = String(p || '');
  return trim(s.split('/').pop() || s, 40);
}

export function labelForTool(name: string, input: Record<string, unknown> = {}): string | null {
  if (name === 'Task' || name === 'Agent') {
    const sub = input.subagent_type;
    const who =
      sub === 'sceptique' ? 'Sceptique'
      : sub === 'enqueteur' ? 'Enquêteur'
      : sub === 'redacteur' ? 'Rédacteur'
      : (typeof sub === 'string' && sub) || 'Sous-agent';
    const what = trim(input.description || input.prompt || '', 60);
    return what ? `${who} : ${what}` : who;
  }
  if (name === 'WebSearch') return input.query ? `Recherche web : ${trim(input.query, 60)}` : 'Recherche web…';
  if (name === 'WebFetch') return `Lecture : ${hostOf(input.url)}`;
  if (name === 'Read') return `Lecture : ${baseOf(input.file_path)}`;
  if (name === 'Edit' || name === 'MultiEdit') return `Édition : ${baseOf(input.file_path)}`;
  if (name === 'Write') return `Écriture : ${baseOf(input.file_path)}`;
  if (name === 'Bash') return input.description ? `Shell : ${trim(input.description, 50)}` : 'Commande shell…';
  if (name === 'TodoWrite') return null;
  if (typeof name === 'string' && name.includes('drop_to_raw')) {
    const f = input.filename || input.subfolder;
    return f ? `Dépôt wiki : ${trim(f, 50)}` : 'Dépôt dans le wiki…';
  }
  if (typeof name === 'string' && name.startsWith('mcp__')) return `Wiki : ${name.split('__').pop()}`;
  if (name) return `${name}…`;
  return null;
}

interface ToolUseBlock {
  type?: string;
  name?: string;
  input?: Record<string, unknown>;
}
interface AssistantMessage {
  type?: string;
  message?: { content?: unknown };
}

export function activityFromMessage(m: unknown): ActivityEvent[] {
  const msg = m as AssistantMessage | null | undefined;
  if (msg?.type !== 'assistant') return [];
  const blocks = msg.message?.content;
  if (!Array.isArray(blocks)) return [];
  const out: ActivityEvent[] = [];
  for (const b of blocks as ToolUseBlock[]) {
    if (b?.type !== 'tool_use') continue;
    const label = labelForTool(b.name ?? '', b.input || {});
    if (label) out.push({ type: 'activity', label });
  }
  return out;
}
```

> Note : `labelForTool` reçoit désormais `name: string` (au lieu de potentiellement vide). Le cas `name` falsy (`return null`) est conservé via le `b.name ?? ''` dans `activityFromMessage` et le `if (name)` final. Vérifier que les tests `activity` couvrant un nom inconnu/vide passent ; sinon élargir le type de `name` à `string`.

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/domain/agents-file.test.mjs tests/domain/activity.test.mjs` → PASS.

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 17 fichiers verts.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): domain/agents.ts (← agent-file + activity) + tests portés"
```

---

### Task 7 : `shared/skills.ts` (← skills + buildPrompt)

**Files:**
- Create: `src/shared/skills.ts`

**Interfaces:**
- Produces : `ALLOWED_SKILLS` (tuple `readonly`), type `Skill`, `buildPrompt(skill: string, inputs: unknown): string`.

> `buildPrompt` était testé dans `command-inputs.test.mjs` ; ce test est porté en Task 9 et importera `buildPrompt` depuis `@shared/skills`. Cette tâche-ci ne déplace pas de test (elle est couverte par typecheck + le test de Task 9). Pour respecter le rythme TDD, on ajoute un test ciblé minimal de `buildPrompt`.

- [ ] **Step 1 : Écrire un test ciblé**

`tests/shared/skills.test.mjs` :
```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ALLOWED_SKILLS, buildPrompt } from '@shared/skills';

test('ALLOWED_SKILLS contient les 3 skills', () => {
  assert.deepEqual([...ALLOWED_SKILLS], ['breves-verify', 'breves-draft', 'breves-archive']);
});
test('buildPrompt produit /skill + bloc INPUTS et lève hors allow-list', () => {
  const p = buildPrompt('breves-verify', { sujets: 'GLM 5.2' });
  assert.match(p, /^\/breves-verify/);
  assert.match(p, /INPUTS/);
  assert.match(p, /ne pose aucune question/);
  assert.throws(() => buildPrompt('rm-rf', {}));
});
test('buildPrompt sans inputs ne met pas de bloc INPUTS', () => {
  assert.equal(buildPrompt('breves-draft', {}), '/breves-draft');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/shared/skills.test.mjs` → FAIL (import non résolu).

- [ ] **Step 3 : Écrire `src/shared/skills.ts`**

```ts
export const ALLOWED_SKILLS = ['breves-verify', 'breves-draft', 'breves-archive'] as const;

export type Skill = (typeof ALLOWED_SKILLS)[number];

export function buildPrompt(skill: string, inputs: unknown): string {
  if (!(ALLOWED_SKILLS as readonly string[]).includes(skill)) {
    throw new Error(`skill non autorisé: ${skill}`);
  }
  let prompt = `/${skill}`;
  if (inputs && typeof inputs === 'object' && Object.keys(inputs).length > 0) {
    prompt += `\n\nINPUTS (utilise-les, ne pose aucune question) :\n${JSON.stringify(inputs)}`;
  }
  return prompt;
}
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/shared/skills.test.mjs` → PASS.

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 18 fichiers verts (nouveau fichier de test).

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): shared/skills.ts (← skills + buildPrompt) + test"
```

---

### Task 8 : `shared/schemas/outputs.ts` (← contracts, Zod)

**Files:**
- Create: `src/shared/schemas/outputs.ts`
- Move: `tests/contracts.test.mjs` → `tests/shared/outputs.test.mjs`

**Interfaces:**
- Produces : schémas Zod `verifyOutputSchema`, `draftOutputSchema`, `archiveOutputSchema` ; types `VerifyOutput`, `DraftOutput`, `ArchiveOutput` (`z.infer`) ; fonctions de frontière `validateVerifyOutput`, `validateDraftOutput`, `validateArchiveOutput`, chacune `(obj: unknown) => { ok: true; value: T } | { ok: false; errors: string[] }`.

- [ ] **Step 1 : Porter le test**

```bash
mkdir -p tests/shared
git mv tests/contracts.test.mjs tests/shared/outputs.test.mjs
```
Remplacer l'import `../lib/contracts.mjs` → `@shared/schemas/outputs` (mêmes symboles : `validateVerifyOutput, validateDraftOutput, validateArchiveOutput`). Les assertions (`.ok` true/false) restent identiques.

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/shared/outputs.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/shared/schemas/outputs.ts`**

```ts
import { z } from 'zod';

const niveau = z.enum(['corrigé', 'nuance', 'date']);
const fiabilite = z.enum(['confirme', 'partiel', 'non_verifie']);

export const alerteSchema = z.object({
  niveau,
  texte: z.string().min(1),
});

// .passthrough() : on conserve les champs hors-contrat consommés par l'UI/le runner
// (ex. topic.raw, date_reelle déjà listée…), à l'image des validateurs manuels qui
// renvoyaient l'objet inchangé.
export const topicSchema = z
  .object({
    key: z.string().min(1),
    sujet: z.string().min(1),
    date_reelle: z.string().min(1),
    fiabilite,
    source: z.string().min(1),
    url_citee: z.string().min(1),
    url_clippee: z.string().min(1),
    slug: z.string().min(1),
    clipping_contenu: z.string().min(1),
    faits: z.array(z.unknown()),
    alerte: alerteSchema.nullish(),
  })
  .passthrough();

export const verifyOutputSchema = z.object({ topics: z.array(topicSchema) }).passthrough();
export type VerifyOutput = z.infer<typeof verifyOutputSchema>;

export const draftOutputSchema = z
  .object({
    teamsText: z.string().min(1),
    corrections: z.array(
      z.object({ niveau, titre: z.string().min(1), detail: z.string().min(1) }),
    ),
    sources: z.array(
      z.object({
        name: z.string().min(1),
        url_citee: z.string().min(1),
        url_clippee: z.string().min(1),
        repli: z.boolean(),
      }),
    ),
    soulLessonProposee: z.string().nullish(),
  })
  .passthrough();
export type DraftOutput = z.infer<typeof draftOutputSchema>;

export const archiveOutputSchema = z
  .object({
    archiveSteps: z.array(z.object({ t: z.string().min(1), d: z.string().min(1) })),
    newsletterText: z.string().min(1),
    soulVersion: z.string().min(1),
  })
  .passthrough();
export type ArchiveOutput = z.infer<typeof archiveOutputSchema>;

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function check<T>(schema: z.ZodType<T>, obj: unknown): Result<T> {
  const r = schema.safeParse(obj);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export const validateVerifyOutput = (obj: unknown): Result<VerifyOutput> => check(verifyOutputSchema, obj);
export const validateDraftOutput = (obj: unknown): Result<DraftOutput> => check(draftOutputSchema, obj);
export const validateArchiveOutput = (obj: unknown): Result<ArchiveOutput> => check(archiveOutputSchema, obj);
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/shared/outputs.test.mjs`
Expected : PASS — les cas valides passent, les invalides (topics absent, fiabilite invalide, slug manquant, alerte.niveau invalide, teamsText vide, archiveSteps non tableau) échouent.

- [ ] **Step 5 : typecheck + suite**

Run : `npm run typecheck` → exit 0. Run : `npm test` → 18 fichiers verts.

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): shared/schemas/outputs.ts (← contracts, Zod source de vérité) + test porté"
```

---

### Task 9 : `shared/schemas/inputs.ts` (← command-inputs, Zod)

**Files:**
- Create: `src/shared/schemas/inputs.ts`
- Move: `tests/command-inputs.test.mjs` → `tests/shared/inputs.test.mjs`

**Interfaces:**
- Consumes : `ALLOWED_SKILLS`, `buildPrompt` de `@shared/skills`.
- Produces : `validateInputs(skill: string, inputs: unknown): { ok: true } | { ok: false; errors: string[] }`. (Réexporte aussi `buildPrompt` pour compat d'import si besoin.)

- [ ] **Step 1 : Porter le test**

```bash
git mv tests/command-inputs.test.mjs tests/shared/inputs.test.mjs
```
Dans `tests/shared/inputs.test.mjs`, remplacer la ligne d'import unique
`import { validateInputs, buildPrompt } from '../lib/command-inputs.mjs';`
par **deux** imports :
```js
import { validateInputs } from '@shared/schemas/inputs';
import { buildPrompt } from '@shared/skills';
```
Les assertions restent identiques.

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/shared/inputs.test.mjs` → FAIL.

- [ ] **Step 3 : Écrire `src/shared/schemas/inputs.ts`**

```ts
import { z } from 'zod';
import { ALLOWED_SKILLS } from '@shared/skills';

// chaîne libre courte mono-ligne (anti-injection) : <=280, sans caractère de contrôle
// (échappements unicode IDENTIQUES à lib/command-inputs.mjs)
const freeString = z
  .string()
  .max(280)
  .refine((v) => !/[\u0000-\u001f\u007f-\u009f]/.test(v), 'caractère de contrôle interdit');

// texte « sujets en vrac » : multi-lignes (saut de ligne) autorisé, borné, sans autres contrôles
const bulkText = z
  .string()
  .min(1)
  .max(8000)
  .refine((v) => v.trim().length > 0, 'texte vide')
  .refine(
    (v) => !/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(v),
    'caractère de contrôle interdit (hors saut de ligne)',
  );

const sceptique = z.enum(['off', 'ciblé', 'toujours']);
const redacteur = z.enum(['on', 'off']);

const verifySchema = z.object({ sujets: bulkText, sceptique: sceptique.optional() }).strict();
const draftSchema = z
  .object({ topics: z.array(z.unknown()), feedback: freeString.optional(), redacteur: redacteur.optional() })
  .strict();
const archiveSchema = z
  .object({
    teamsText: z.string().refine((v) => v.trim() !== '', 'teamsText requis'),
    topics: z.array(z.unknown()),
    sources: z.array(z.unknown()),
    leconSOUL: freeString.optional(),
  })
  .strict();

const SCHEMAS: Record<string, z.ZodType> = {
  'breves-verify': verifySchema,
  'breves-draft': draftSchema,
  'breves-archive': archiveSchema,
};

type InputsResult = { ok: true } | { ok: false; errors: string[] };

export function validateInputs(skill: string, inputs: unknown): InputsResult {
  if (!(ALLOWED_SKILLS as readonly string[]).includes(skill)) {
    return { ok: false, errors: ['skill inconnu'] };
  }
  const inp = inputs == null ? {} : inputs;
  const r = SCHEMAS[skill].safeParse(inp);
  if (r.success) return { ok: true };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

export { buildPrompt } from '@shared/skills';
```

- [ ] **Step 4 : Lancer (succès attendu)**

Run : `npx vitest run tests/shared/inputs.test.mjs`
Expected : PASS — texte multi-lignes accepté ; `\t` et NUL refusés ; clé inattendue refusée (`.strict()`) ; `sceptique`/`redacteur` validés ; `skill inconnu` refusé.

- [ ] **Step 5 : typecheck + suite complète**

Run : `npm run typecheck` → exit 0.
Run : `npm test` → **18 fichiers verts** (121 tests d'origine, redistribués + 1 fichier `skills` ajouté ; aucun test perdu).

- [ ] **Step 6 : Commit**

```bash
git add -A
git commit -m "feat(phase2.1): shared/schemas/inputs.ts (← command-inputs, Zod) + test porté"
```

---

## Critères de réussite Phase 2.1 (revue finale)

- [ ] `src/domain/` : `format`, `navigation`, `events`, `checking`, `edition`, `soul`, `agents` en TS strict, **zéro import Electron/React/fs**.
- [ ] `src/shared/` : `skills`, `schemas/outputs`, `schemas/inputs` ; Zod = source de vérité ; types via `z.infer` ; fonctions de frontière au contrat `{ ok, errors|value }` préservé.
- [ ] Tests portés sous `tests/domain/` et `tests/shared/`, **aucun test perdu** ; `npm test` vert.
- [ ] `npm run typecheck` (strict) et `npm run lint` exit 0.
- [ ] `lib/*.mjs` et `hud/*` **inchangés** (rewiring = 2.2).
- [ ] Comportement fonctionnel identique (ports 1:1, schémas Zod équivalents avec `.passthrough()`).
