# Design System & Storybook complet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le Storybook en vitrine structurée d'un design system (Fondations + 12 primitives React documentées), réellement adopté par l'app Electron, pour qu'un UI Designer en tire un UI Kit.

**Architecture:** Les tokens CSS (`tokens.css`) restent la source unique d'exécution. On extrait les classes utilitaires de `app.css` en primitives React co-localisées avec leur CSS Module (consommant `var(--token)`), on migre tous les consommateurs vers ces primitives, et on vide `app.css` au fur et à mesure. Storybook gagne une taxonomie (Fondations/Primitives/Composants), un switch thème clair/sombre, l'autodocs et des contrôles.

**Tech Stack:** React 19, TypeScript (strict), Vite 6, Storybook 10 (`@storybook/react-vite`), CSS Modules (natifs Vite), Vitest 4 (environnement node), tests de rendu via `react-dom/server`.

## Global Constraints

- **Aucune nouvelle dépendance runtime.** CSS Modules sont natifs Vite ; tests via `react-dom/server` (déjà présent). MDX/docs sont fournis par `@storybook/react-vite` (déjà installé).
- **Parité visuelle stricte.** Le CSS de chaque primitive est repris **à l'identique** des règles de `app.css` (mêmes px, mêmes `var(--token)`). On ne « retrofit » PAS l'échelle d'espacement dans les primitives existantes (risque de drift visuel) — `--space-*` est ajouté et documenté pour le travail neuf.
- **Jamais d'état cassé.** Une classe n'est retirée de `app.css` qu'une fois tous ses consommateurs migrés. `tsc --noEmit` et `vitest run` doivent rester verts à la fin de chaque tâche.
- **Primitives testables.** Chaque primitive expose un attribut sémantique stable (`data-variant` / `data-tone` / `data-state`) pour permettre des assertions de rendu indépendantes des classes hachées par les CSS Modules.
- **Emplacements.** Primitives : `src/renderer/components/ui/<Name>.tsx` + `<Name>.module.css` + `<Name>.stories.tsx`. Tests : `tests/renderer/ui/<Name>.test.mjs`. Pages Fondations : `src/renderer/components/foundations/*.mdx`.
- **Copy FR inchangée.** Aucun libellé visible utilisateur n'est modifié pendant la migration.
- **Alias d'import** : `@renderer/*`, `@domain/*` (voir `tsconfig.json` / `vitest.config.mjs`).
- **Commits fréquents**, un par tâche minimum, en français, préfixe conventionnel (`feat:`, `refactor:`, `test:`, `chore:`, `docs:`).

---

## Carte des fichiers

**Créés :**
- `src/renderer/components/ui/` — 12 primitives (`.tsx` + `.module.css` + `.stories.tsx` chacune).
- `src/renderer/components/foundations/` — `Introduction.mdx`, `Couleurs.mdx`, `Typographie.mdx`, `Espacements.mdx`, `RayonsOmbres.mdx`.
- `tests/renderer/stories-coverage.test.mjs` — invariant de couverture.
- `tests/renderer/ui/*.test.mjs` — smokes de rendu des primitives.

**Modifiés :**
- `src/renderer/styles/tokens.css` — réorganisation en couches + échelle `--space-*`.
- `src/renderer/styles/app.css` — classes retirées au fil des migrations.
- `.storybook/main.ts` — glob `.mdx`.
- `.storybook/preview.ts` → `.storybook/preview.tsx` — switch thème + autodocs globaux.
- Les 13 stories existantes — titres `Composants/*`.
- Composants & pages consommateurs — adoption des primitives (listes exactes par tâche).

---

## Phase 0 — Audit de couverture

### Task 0.1: Invariant de couverture des stories

**Files:**
- Create: `tests/renderer/stories-coverage.test.mjs`

**Interfaces:**
- Produces: rien (test only). Garantit que tout composant de `components/` et `components/ui/` a une story sœur.

- [ ] **Step 1: Écrire le test de couverture (qui échouera si une story manque)**

```js
// tests/renderer/stories-coverage.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = (p) => fileURLToPath(new URL(p, import.meta.url));

function componentsWithoutStory(absDir) {
  if (!existsSync(absDir)) return [];
  const files = readdirSync(absDir);
  return files
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''))
    .filter((base) => !files.includes(`${base}.stories.tsx`));
}

test('chaque composant components/ a une story', () => {
  const missing = componentsWithoutStory(dir('../../src/renderer/components'));
  assert.deepEqual(missing, [], `Stories manquantes: ${missing.join(', ')}`);
});

test('chaque primitive components/ui a une story', () => {
  const missing = componentsWithoutStory(dir('../../src/renderer/components/ui'));
  assert.deepEqual(missing, [], `Stories de primitives manquantes: ${missing.join(', ')}`);
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il passe (13/13 aujourd'hui, ui/ vide)**

Run: `npx vitest run tests/renderer/stories-coverage.test.mjs`
Expected: 2 tests PASS (aucune story manquante actuellement).

- [ ] **Step 3: Commit**

```bash
git add tests/renderer/stories-coverage.test.mjs
git commit -m "test: invariant de couverture composants <-> stories"
```

### Task 0.2: Cadrage des stories existantes (revue manuelle)

**Files:**
- Modify (si manque détecté): toute `src/renderer/components/*.stories.tsx`

**Interfaces:**
- Produces: stories couvrant les états/variants significatifs de chaque composant.

- [ ] **Step 1: Appliquer la rubrique de cadrage à chacune des 13 stories**

Rubrique — une story doit exister par état **visuellement distinct** piloté par les props :
- Composant à booléen d'état (`disabled`, `active`, présence/absence) → 1 story par valeur. Ex. `BreveCard` a déjà `Ajoutable` + `Pleine` ✓.
- Composant piloté par `niveau`/tone (`EnqCard`, `Drawer`, `CorrectionRow`) → 1 story par niveau (`date`, `corrigé`, `nuance`).
- Composant à contenu conditionnel (`RunStatus` rend `null` si `!active`, `Toast` si `!message`) → 1 story du cas visible (le cas `null` n'a pas besoin de story).

Pour chaque story déficiente, ajouter les variantes manquantes en suivant le style existant (objet `args`). Exemple pour `RunStatus` (n'a probablement qu'un cas) — ajouter au besoin :

```tsx
export const Actif: StoryObj<typeof RunStatus> = {
  args: { status: { active: true, title: 'Vérification', clock: '00:12', activity: 'Recherche des sources…' } },
};
```

- [ ] **Step 2: Vérifier que Storybook build liste toutes les entrées**

Run: `npx storybook build --quiet` (ou `npm run build-storybook`)
Expected: build réussit, dossier `storybook-static/` régénéré sans erreur de story.

- [ ] **Step 3: Commit (si des stories ont été enrichies)**

```bash
git add src/renderer/components/*.stories.tsx
git commit -m "test(storybook): cadrage des stories par états/variants significatifs"
```

---

## Phase 1 — Tokens

### Task 1.1: Réorganiser tokens.css en couches + échelle d'espacement

**Files:**
- Modify: `src/renderer/styles/tokens.css`
- Create: `tests/renderer/tokens.test.mjs`

**Interfaces:**
- Produces: variables `--space-1..6` disponibles globalement ; couches commentées Primitifs/Sémantiques.

- [ ] **Step 1: Écrire le test de garde des tokens (échoue : `--space-*` absents)**

```js
// tests/renderer/tokens.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../../src/renderer/styles/tokens.css', import.meta.url)), 'utf8');

test('échelle d’espacement présente', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    assert.match(css, new RegExp(`--space-${n}\\s*:`), `--space-${n} manquant`);
  }
});

test('tokens sémantiques conservés (non-régression)', () => {
  for (const v of ['--accent', '--good', '--warn', '--nuance', '--text', '--muted', '--faint', '--radius', '--shadow']) {
    assert.match(css, new RegExp(`${v}\\s*:`), `${v} manquant`);
  }
});
```

- [ ] **Step 2: Lancer, vérifier l'échec sur `--space-*`**

Run: `npx vitest run tests/renderer/tokens.test.mjs`
Expected: FAIL (`--space-1 manquant`).

- [ ] **Step 3: Restructurer `tokens.css`**

Réorganiser `:root` en blocs commentés et ajouter l'échelle d'espacement, **sans changer les valeurs existantes**. Insérer dans `:root` (après le bloc couleurs, avant la fermeture), et laisser `body.dark` inchangé :

```css
:root{
  /* ===== Primitifs : surfaces & couleurs ===== */
  --bg:#e7e1d4; --win:#f8f4ec; --panel:#f2ece1; --panel2:#ece5d8;
  --line:rgba(64,52,34,0.12); --text:#2e2a22; --muted:#6f6557; --faint:#a89d8b;

  /* ===== Sémantiques : intentions ===== */
  --accent:oklch(0.52 0.072 46); --accentSoft:oklch(0.91 0.030 62); --onAccent:#faf6ee;
  --good:oklch(0.50 0.085 150); --goodSoft:oklch(0.91 0.045 150);
  --warn:oklch(0.53 0.135 34); --warnSoft:oklch(0.92 0.05 44);
  --nuance:oklch(0.58 0.10 74); --nuanceSoft:oklch(0.91 0.06 82);

  /* ===== Échelle d'espacement (nouveau — travail neuf ; primitives existantes gardent leurs px d'origine pour parité) ===== */
  --space-1:4px; --space-2:8px; --space-3:11px; --space-4:14px; --space-5:18px; --space-6:22px;

  /* ===== Formes & typo ===== */
  --radius:14px; --radiusSm:10px; --shadow:0 14px 36px rgba(60,48,28,0.10);
  --display:'Hanken Grotesk',system-ui,sans-serif; --body:'Hanken Grotesk',system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
}
```

- [ ] **Step 4: Lancer le test et la suite complète**

Run: `npx vitest run tests/renderer/tokens.test.mjs && npx tsc --noEmit`
Expected: PASS + tsc vert.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/styles/tokens.css tests/renderer/tokens.test.mjs
git commit -m "refactor(tokens): couches sémantiques + échelle --space, garde de non-régression"
```

---

## Phase 2 — Infrastructure Storybook

### Task 2.1: Switch thème clair/sombre + autodocs globaux

**Files:**
- Delete/rename: `.storybook/preview.ts` → `.storybook/preview.tsx`
- Modify: `.storybook/main.ts`

**Interfaces:**
- Produces: toolbar thème (global `theme` = `light`|`dark` posant `body.dark`) ; `tags: ['autodocs']` global.

- [ ] **Step 1: Remplacer `preview.ts` par `preview.tsx`**

```bash
git mv .storybook/preview.ts .storybook/preview.tsx
```

Contenu de `.storybook/preview.tsx` :

```tsx
import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../src/renderer/styles/tokens.css';
import '../src/renderer/styles/app.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Thème',
      defaultValue: 'light',
      toolbar: {
        title: 'Thème',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme === 'dark';
      useEffect(() => {
        document.body.classList.toggle('dark', dark);
        document.body.style.background = 'var(--win)';
      }, [dark]);
      return <Story />;
    },
  ],
};

export default preview;
```

- [ ] **Step 2: Vérifier que le dev server démarre et que la toolbar « Thème » bascule `body.dark`**

Run: `npm run storybook` (laisser tourner ~10 s, ouvrir http://localhost:6006, basculer le thème sur n'importe quelle story, vérifier le changement clair/sombre, puis arrêter).
Expected: la toolbar « Thème » apparaît ; bascule visible ; pas d'erreur console.

- [ ] **Step 3: Commit**

```bash
git add .storybook/preview.tsx
git commit -m "feat(storybook): switch thème clair/sombre + autodocs global"
```

### Task 2.2: Taxonomie — préfixer les 13 stories existantes par `Composants/`

**Files:**
- Modify: les 13 `src/renderer/components/*.stories.tsx`

**Interfaces:**
- Produces: arbre Storybook `Composants/<Nom>`.

- [ ] **Step 1: Mettre à jour chaque `title`**

Pour chaque story, préfixer le titre. Exemple `BreveCard.stories.tsx` :

```tsx
const meta: Meta<typeof BreveCard> = { component: BreveCard, title: 'Composants/BreveCard' };
```

Appliquer à : BreveCard, AgentCard, CorrectModal, CorrectionRow, Drawer, EchantillonCard, EditionRow, EnqCard, HistoryRow, RunStatus, SourceRow, ArchiveStep, Toast (titre = `Composants/<Nom>`). Les stories sans `title` explicite : ajouter `title: 'Composants/<Nom>'`.

- [ ] **Step 2: Vérifier le build**

Run: `npx storybook build --quiet`
Expected: toutes les stories rangées sous `Composants/`, build OK.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/*.stories.tsx
git commit -m "refactor(storybook): taxonomie Composants/*"
```

### Task 2.3: Pages Fondations (MDX)

**Files:**
- Modify: `.storybook/main.ts` (ajouter `.mdx` au glob)
- Create: `src/renderer/components/foundations/Introduction.mdx`, `Couleurs.mdx`, `Typographie.mdx`, `Espacements.mdx`, `RayonsOmbres.mdx`

**Interfaces:**
- Produces: section `Fondations/*` dans Storybook.

- [ ] **Step 1: Étendre le glob des stories**

Dans `.storybook/main.ts`, remplacer la ligne `stories` :

```ts
  stories: ['../src/renderer/**/*.mdx', '../src/renderer/**/*.stories.@(ts|tsx)'],
```

- [ ] **Step 2: Créer `Introduction.mdx`**

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="Fondations/Introduction" />

# Design System — direction « Halo »

Le design system de Brèves IA repose sur une **source unique** : les variables CSS de
`src/renderer/styles/tokens.css` (thème clair dans `:root`, thème sombre dans `body.dark`).

- **Fondations** — couleurs, typographie, espacements, formes (cette section).
- **Primitives** — composants React élémentaires (Button, Badge, Card…) consommant les tokens.
- **Composants** — assemblages applicatifs construits sur les primitives.

Utilisez le sélecteur **Thème** de la barre d'outils pour visualiser chaque écran en clair et en sombre.
```

- [ ] **Step 3: Créer `Couleurs.mdx`**

```mdx
import { Meta, ColorPalette, ColorItem } from '@storybook/addon-docs/blocks';

<Meta title="Fondations/Couleurs" />

# Couleurs

Rôles sémantiques (les valeurs s'adaptent automatiquement au thème via les tokens).

<ColorPalette>
  <ColorItem title="accent" subtitle="--accent / --accentSoft" colors={{ accent: 'var(--accent)', accentSoft: 'var(--accentSoft)' }} />
  <ColorItem title="good" subtitle="--good / --goodSoft" colors={{ good: 'var(--good)', goodSoft: 'var(--goodSoft)' }} />
  <ColorItem title="warn" subtitle="--warn / --warnSoft" colors={{ warn: 'var(--warn)', warnSoft: 'var(--warnSoft)' }} />
  <ColorItem title="nuance" subtitle="--nuance / --nuanceSoft" colors={{ nuance: 'var(--nuance)', nuanceSoft: 'var(--nuanceSoft)' }} />
  <ColorItem title="Surfaces" subtitle="bg / win / panel / panel2" colors={{ bg: 'var(--bg)', win: 'var(--win)', panel: 'var(--panel)', panel2: 'var(--panel2)' }} />
  <ColorItem title="Texte" subtitle="text / muted / faint" colors={{ text: 'var(--text)', muted: 'var(--muted)', faint: 'var(--faint)' }} />
</ColorPalette>
```

- [ ] **Step 4: Créer `Typographie.mdx`**

```mdx
import { Meta, Typeset } from '@storybook/addon-docs/blocks';

<Meta title="Fondations/Typographie" />

# Typographie

Deux familles : **Hanken Grotesk** (`--display` / `--body`) et **JetBrains Mono** (`--mono`).

<Typeset
  fontFamily="Hanken Grotesk"
  fontSizes={[10, 11, 12.5, 13.5, 14, 18, 23]}
  sampleText="Brèves IA — l'actualité, vérifiée."
/>

<Typeset
  fontFamily="JetBrains Mono"
  fontSizes={[10, 11, 12.5]}
  sampleText="VÉRIFICATION · 00:12"
/>
```

- [ ] **Step 5: Créer `Espacements.mdx`**

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="Fondations/Espacements" />

# Espacements

Échelle `--space-1` à `--space-6`. À utiliser pour tout nouvel agencement.

<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
  {[1, 2, 3, 4, 5, 6].map((n) => (
    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <code style={{ width: 90 }}>--space-{n}</code>
      <div style={{ height: 14, width: `var(--space-${n})`, background: 'var(--accent)', borderRadius: 3 }} />
    </div>
  ))}
</div>
```

- [ ] **Step 6: Créer `RayonsOmbres.mdx`**

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="Fondations/Rayons & Ombres" />

# Rayons & Ombres

<div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
  <div style={{ width: 120, height: 80, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>--radius</div>
  <div style={{ width: 120, height: 80, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radiusSm)' }}>--radiusSm</div>
  <div style={{ width: 120, height: 80, background: 'var(--win)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>--shadow</div>
</div>
```

- [ ] **Step 7: Vérifier le build (les pages Fondations apparaissent)**

Run: `npx storybook build --quiet`
Expected: section `Fondations/` présente, build sans erreur MDX.

> Note: si `@storybook/addon-docs/blocks` n'est pas résolu, l'import est exposé par `@storybook/react-vite` (docs intégré en SB10). En cas d'échec d'import, vérifier le chemin via `npm ls @storybook/addon-docs` et ajuster l'import vers le paquet listé.

- [ ] **Step 8: Commit**

```bash
git add .storybook/main.ts src/renderer/components/foundations/
git commit -m "feat(storybook): pages Fondations (Couleurs, Typo, Espacements, Rayons/Ombres)"
```

---

## Phase 3 — Primitives (extraction + adoption + nettoyage app.css)

> Patron commun à chaque tâche primitive : (1) test smoke échouant → (2) créer `.tsx` + `.module.css` → (3) test vert → (4) story → (5) migrer les consommateurs → (6) retirer la/les classe(s) de `app.css` → (7) `tsc` + `vitest` verts → (8) commit. La migration remplace les `className` legacy ; les `style={{…}}` inline référençant `var(--token)` restent inchangés.

### Task 3.1: Eyebrow

**Files:**
- Create: `src/renderer/components/ui/Eyebrow.tsx`, `Eyebrow.module.css`, `Eyebrow.stories.tsx`
- Create: `tests/renderer/ui/Eyebrow.test.mjs`
- Modify (migration): `components/EnqCard.tsx`, `components/AgentCard.tsx`, `components/Drawer.tsx`, `pages/Soul.tsx`, `pages/Dashboard.tsx`, `pages/Editor.tsx`
- Modify: `src/renderer/styles/app.css` (retirer `.eyebrow`)

**Interfaces:**
- Produces: `<Eyebrow as?={keyof JSX.IntrinsicElements} className?>{children}</Eyebrow>` (défaut `as="div"`).

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Eyebrow.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';

test('Eyebrow rend son texte', () => {
  const html = renderToStaticMarkup(h(Eyebrow, null, 'VÉRIFICATION'));
  assert.ok(html.includes('VÉRIFICATION'));
});
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run tests/renderer/ui/Eyebrow.test.mjs` (module introuvable).

- [ ] **Step 3: Créer la primitive**

```css
/* src/renderer/components/ui/Eyebrow.module.css */
.root{font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
```

```tsx
// src/renderer/components/ui/Eyebrow.tsx
import type { ReactNode } from 'react';
import s from './Eyebrow.module.css';

interface EyebrowProps {
  children: ReactNode;
  as?: 'div' | 'span' | 'p';
  className?: string;
}

export function Eyebrow({ children, as: Tag = 'div', className }: EyebrowProps) {
  return <Tag className={className ? `${s.root} ${className}` : s.root}>{children}</Tag>;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// src/renderer/components/ui/Eyebrow.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eyebrow } from './Eyebrow';

const meta: Meta<typeof Eyebrow> = { component: Eyebrow, title: 'Primitives/Eyebrow' };
export default meta;

export const Defaut: StoryObj<typeof Eyebrow> = { args: { children: 'Vérification' } };
```

- [ ] **Step 6: Migrer les consommateurs**

Dans les 6 fichiers listés, remplacer `<div className="eyebrow">…</div>` (et variantes `<span className="eyebrow">`) par `<Eyebrow>…</Eyebrow>` (ou `<Eyebrow as="span">`). Ajouter l'import `import { Eyebrow } from '@renderer/components/ui/Eyebrow';`. Si la classe est combinée (`className="eyebrow autre"`), passer le reste via `className`.

Vérifier qu'il ne reste aucune occurrence :
Run: `grep -rn 'className="[^"]*eyebrow' src/renderer/components src/renderer/pages`
Expected: aucun résultat.

- [ ] **Step 7: Retirer `.eyebrow` de `app.css`** (ligne `.eyebrow{…}`).

- [ ] **Step 8: Vérifier**

Run: `npx tsc --noEmit && npx vitest run`
Expected: vert.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/components/ui/Eyebrow.* tests/renderer/ui/Eyebrow.test.mjs src/renderer/styles/app.css src/renderer/components src/renderer/pages
git commit -m "feat(ui): primitive Eyebrow + migration + retrait .eyebrow"
```

### Task 3.2: Text

**Files:**
- Create: `ui/Text.tsx`, `Text.module.css`, `Text.stories.tsx`, `tests/renderer/ui/Text.test.mjs`
- Modify (migration `muted`): `components/CorrectModal.tsx`, `pages/Archived.tsx`, `pages/Compose.tsx`, `pages/Soul.tsx`, `pages/History.tsx`, `pages/EchEditions.tsx`, `pages/Dashboard.tsx`, `pages/Editor.tsx`, `pages/Checking.tsx`
- Modify (migration `faint`): `components/Drawer.tsx`, `components/ArchiveStep.tsx`, `pages/Compose.tsx`, `pages/EchEditions.tsx`, `pages/Soul.tsx`, `pages/Reader.tsx`, `pages/Agents.tsx`, `pages/History.tsx`, `pages/EchBreves.tsx`, `pages/Dashboard.tsx`, `pages/Editor.tsx`
- Modify: `app.css` (retirer `.muted` et `.faint`)

**Interfaces:**
- Produces: `<Text tone="muted"|"faint" as?={'span'|'div'|'p'} className?>{children}</Text>` (défaut `as="span"`). Attribut `data-tone`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Text.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Text } from '@renderer/components/ui/Text';

test('Text expose data-tone', () => {
  const html = renderToStaticMarkup(h(Text, { tone: 'faint' }, 'discret'));
  assert.ok(html.includes('data-tone="faint"'));
  assert.ok(html.includes('discret'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Text.module.css */
.muted{color:var(--muted)}
.faint{color:var(--faint)}
```

```tsx
// ui/Text.tsx
import type { ReactNode } from 'react';
import s from './Text.module.css';

interface TextProps {
  tone: 'muted' | 'faint';
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
  className?: string;
}

export function Text({ tone, children, as: Tag = 'span', className }: TextProps) {
  const cls = [s[tone], className].filter(Boolean).join(' ');
  return <Tag className={cls} data-tone={tone}>{children}</Tag>;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Text.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  component: Text,
  title: 'Primitives/Text',
  argTypes: { tone: { control: 'inline-radio', options: ['muted', 'faint'] } },
};
export default meta;

export const Muted: StoryObj<typeof Text> = { args: { tone: 'muted', children: 'Texte secondaire' } };
export const Faint: StoryObj<typeof Text> = { args: { tone: 'faint', children: 'Texte discret' } };
```

- [ ] **Step 6: Migrer**

Remplacer `<X className="muted">` → `<Text tone="muted" as="x">` et `<X className="faint">` → `<Text tone="faint" as="x">` selon la balise d'origine (`div`/`span`/`p`). Conserver tout autre attribut/`style`. Importer `Text`.

Vérifier :
Run: `grep -rn 'className="[^"]*\b\(muted\|faint\)\b' src/renderer/components src/renderer/pages`
Expected: aucun résultat.

- [ ] **Step 7: Retirer `.muted` et `.faint` de `app.css`** (ligne 28).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit**

```bash
git commit -am "feat(ui): primitive Text (muted/faint) + migration + retrait classes"
```

### Task 3.3: Badge

**Files:**
- Create: `ui/Badge.tsx`, `Badge.module.css`, `Badge.stories.tsx`, `tests/renderer/ui/Badge.test.mjs`
- Modify (migration): `components/EnqCard.tsx`
- Modify: `app.css` (retirer `.badge-good`)

**Interfaces:**
- Produces: `<Badge tone="good"|"warn"|"nuance"|"accent">{children}</Badge>` (défaut `tone="good"`). `data-tone`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Badge.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Badge } from '@renderer/components/ui/Badge';

test('Badge expose data-tone et son contenu', () => {
  const html = renderToStaticMarkup(h(Badge, { tone: 'warn' }, 'Corrigé'));
  assert.ok(html.includes('data-tone="warn"'));
  assert.ok(html.includes('Corrigé'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Badge.module.css */
.root{font:500 10px var(--body);padding:3px 7px;border-radius:20px}
.good{color:var(--good);background:var(--goodSoft)}
.warn{color:var(--warn);background:var(--warnSoft)}
.nuance{color:var(--nuance);background:var(--nuanceSoft)}
.accent{color:var(--accent);background:var(--accentSoft)}
```

```tsx
// ui/Badge.tsx
import type { ReactNode } from 'react';
import s from './Badge.module.css';

type Tone = 'good' | 'warn' | 'nuance' | 'accent';
interface BadgeProps { tone?: Tone; children: ReactNode; }

export function Badge({ tone = 'good', children }: BadgeProps) {
  return <span className={`${s.root} ${s[tone]}`} data-tone={tone}>{children}</span>;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Badge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: 'Primitives/Badge',
  argTypes: { tone: { control: 'inline-radio', options: ['good', 'warn', 'nuance', 'accent'] } },
};
export default meta;

export const Good: StoryObj<typeof Badge> = { args: { tone: 'good', children: 'Vérifié' } };
export const Warn: StoryObj<typeof Badge> = { args: { tone: 'warn', children: 'Corrigé' } };
export const Nuance: StoryObj<typeof Badge> = { args: { tone: 'nuance', children: 'Nuance' } };
export const Accent: StoryObj<typeof Badge> = { args: { tone: 'accent', children: 'Date' } };
```

- [ ] **Step 6: Migrer `EnqCard.tsx`** — remplacer `<span className="badge-good">…</span>` par `<Badge tone="good">…</Badge>`. Si EnqCard choisissait dynamiquement la couleur via inline style, mapper le niveau vers `tone` (`corrigé`→`warn`, `nuance`→`nuance`, défaut→`good`). Importer `Badge`.

Vérifier : `grep -rn 'badge-good' src/renderer` → aucun résultat (hors `app.css` à nettoyer juste après).

- [ ] **Step 7: Retirer `.badge-good` de `app.css`** (ligne 34).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Badge + migration EnqCard + retrait .badge-good"`

### Task 3.4: Pill

**Files:**
- Create: `ui/Pill.tsx`, `Pill.module.css`, `Pill.stories.tsx`, `tests/renderer/ui/Pill.test.mjs`
- Modify (migration): `components/Drawer.tsx`, `pages/Compose.tsx`, `pages/Editor.tsx`
- Modify: `app.css` (retirer `.pill`)

**Interfaces:**
- Produces: `<Pill className?>{children}</Pill>`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Pill.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Pill } from '@renderer/components/ui/Pill';

test('Pill rend son contenu', () => {
  assert.ok(renderToStaticMarkup(h(Pill, null, 'GPT-5')).includes('GPT-5'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Pill.module.css */
.root{font:500 11px var(--body);color:var(--muted);background:var(--panel2);border:1px solid var(--line);padding:4px 9px;border-radius:20px}
```

```tsx
// ui/Pill.tsx
import type { ReactNode } from 'react';
import s from './Pill.module.css';

interface PillProps { children: ReactNode; className?: string; }

export function Pill({ children, className }: PillProps) {
  return <span className={className ? `${s.root} ${className}` : s.root}>{children}</span>;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Pill.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pill } from './Pill';

const meta: Meta<typeof Pill> = { component: Pill, title: 'Primitives/Pill' };
export default meta;

export const Defaut: StoryObj<typeof Pill> = { args: { children: 'Étiquette' } };
```

- [ ] **Step 6: Migrer** les 3 fichiers : `<span className="pill">…</span>` → `<Pill>…</Pill>`. Importer `Pill`.
Vérifier : `grep -rn 'className="[^"]*\bpill\b' src/renderer/components src/renderer/pages` → aucun.

- [ ] **Step 7: Retirer `.pill` de `app.css`** (ligne 33).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Pill + migration + retrait .pill"`

### Task 3.5: StatusDot

**Files:**
- Create: `ui/StatusDot.tsx`, `StatusDot.module.css`, `StatusDot.stories.tsx`, `tests/renderer/ui/StatusDot.test.mjs`
- Modify (migration): `components/SourceRow.tsx`, `components/ArchiveStep.tsx`, `components/Drawer.tsx`
- Modify: `app.css` (retirer `.dot` et ses modificateurs)

**Interfaces:**
- Produces: `<StatusDot state="done"|"active"|"todo" />`. `data-state`. L'état `done` rend le `✓` en interne.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/StatusDot.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { StatusDot } from '@renderer/components/ui/StatusDot';

test('StatusDot done rend le check et data-state', () => {
  const html = renderToStaticMarkup(h(StatusDot, { state: 'done' }));
  assert.ok(html.includes('data-state="done"'));
  assert.ok(html.includes('✓'));
});
test('StatusDot todo sans check', () => {
  assert.ok(!renderToStaticMarkup(h(StatusDot, { state: 'todo' })).includes('✓'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/StatusDot.module.css */
.root{width:15px;height:15px;border-radius:50%;flex:none}
.done{background:var(--good);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px}
.active{border:2px solid var(--accent);border-top-color:transparent;animation:spin .7s linear infinite}
.todo{border:1.5px solid var(--line)}
```

```tsx
// ui/StatusDot.tsx
import s from './StatusDot.module.css';

type State = 'done' | 'active' | 'todo';
interface StatusDotProps { state: State; }

export function StatusDot({ state }: StatusDotProps) {
  return <span className={`${s.root} ${s[state]}`} data-state={state} aria-hidden="true">{state === 'done' ? '✓' : null}</span>;
}
```

> Note: l'animation `spin` est définie globalement dans `app.css` (`@keyframes spin`) — conservée (utilisée aussi par Spinner). Ne pas la retirer.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/StatusDot.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from './StatusDot';

const meta: Meta<typeof StatusDot> = {
  component: StatusDot,
  title: 'Primitives/StatusDot',
  argTypes: { state: { control: 'inline-radio', options: ['done', 'active', 'todo'] } },
};
export default meta;

export const Done: StoryObj<typeof StatusDot> = { args: { state: 'done' } };
export const Active: StoryObj<typeof StatusDot> = { args: { state: 'active' } };
export const Todo: StoryObj<typeof StatusDot> = { args: { state: 'todo' } };
```

- [ ] **Step 6: Migrer** : `<span className="dot done">✓</span>` → `<StatusDot state="done" />` ; `<span className="dot active" />` → `<StatusDot state="active" />` ; `<span className="dot todo" />` → `<StatusDot state="todo" />`. Pour les états dynamiques (`className={\`dot ${s.state}\`}`), passer `state={s.state}`. Importer `StatusDot`.
Vérifier : `grep -rn 'className="[^"]*\bdot\b\|`dot ' src/renderer/components src/renderer/pages` → aucun (hors `.corr-dot`/`.cta .plus` qui sont d'autres classes — ne pas toucher).

- [ ] **Step 7: Retirer `.dot`, `.dot.done`, `.dot.active`, `.dot.todo` de `app.css`** (lignes 66-69). **Conserver** `@keyframes spin`.

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive StatusDot + migration + retrait .dot"`

### Task 3.6: Spinner

**Files:**
- Create: `ui/Spinner.tsx`, `Spinner.module.css`, `Spinner.stories.tsx`, `tests/renderer/ui/Spinner.test.mjs`
- Modify (migration): `components/RunStatus.tsx`
- Modify: `app.css` (retirer `.spinner`, **conserver** `@keyframes spin`)

**Interfaces:**
- Produces: `<Spinner />`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Spinner.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Spinner } from '@renderer/components/ui/Spinner';

test('Spinner rend un élément aria-hidden', () => {
  assert.ok(renderToStaticMarkup(h(Spinner)).includes('aria-hidden'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Spinner.module.css */
.root{width:15px;height:15px;flex:none;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .7s linear infinite}
```

```tsx
// ui/Spinner.tsx
import s from './Spinner.module.css';

export function Spinner() {
  return <span className={s.root} aria-hidden="true" />;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Spinner.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = { component: Spinner, title: 'Primitives/Spinner' };
export default meta;

export const Defaut: StoryObj<typeof Spinner> = {};
```

- [ ] **Step 6: Migrer `RunStatus.tsx`** — remplacer `<span className="spinner" aria-hidden="true" />` par `<Spinner />`. Importer `Spinner`.
Vérifier : `grep -rn 'className="spinner"' src/renderer` → aucun.

- [ ] **Step 7: Retirer `.spinner` de `app.css`** (ligne 83). **Conserver** `@keyframes spin` (ligne 84).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Spinner + migration RunStatus + retrait .spinner"`

### Task 3.7: Button

**Files:**
- Create: `ui/Button.tsx`, `Button.module.css`, `Button.stories.tsx`, `tests/renderer/ui/Button.test.mjs`
- Modify (migration `btn-primary`): `components/BreveCard.tsx`, `components/CorrectModal.tsx`, `components/AgentCard.tsx`, `pages/Soul.tsx`, `pages/Compose.tsx`, `pages/Archived.tsx`, `pages/Checking.tsx`, `pages/Editor.tsx`
- Modify (migration `btn-ghost`): `components/CorrectModal.tsx`, `components/EchantillonCard.tsx`, `pages/Archived.tsx`, `pages/Soul.tsx`, `pages/Reader.tsx`, `pages/Editor.tsx`
- Modify (migration `iconbtn`): `layouts/Shell.tsx`
- Modify (migration `cta`): `pages/Dashboard.tsx`
- Modify: `app.css` (retirer `.btn-primary`, `.btn-ghost`, `.iconbtn`, `.cta`, `.cta .plus`, `button:disabled`)

**Interfaces:**
- Produces: `<Button variant="primary"|"ghost"|"icon"|"cta" loading? {...buttonHTMLAttributes}>`. `data-variant`. `loading` rend un `Spinner` + applique `disabled`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Button.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Button } from '@renderer/components/ui/Button';

test('Button primary rend un bouton avec data-variant', () => {
  const html = renderToStaticMarkup(h(Button, { variant: 'primary' }, 'Lancer'));
  assert.ok(html.includes('<button'));
  assert.ok(html.includes('data-variant="primary"'));
  assert.ok(html.includes('Lancer'));
});
test('Button loading est disabled', () => {
  const html = renderToStaticMarkup(h(Button, { variant: 'primary', loading: true }, 'X'));
  assert.ok(html.includes('disabled'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Button.module.css */
.primary{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:none;background:var(--accent);color:var(--onAccent);font:600 14px var(--body);padding:12px;border-radius:var(--radiusSm)}
.ghost{background:transparent;border:1px solid var(--line);color:var(--text);font:600 13px var(--body);padding:11px 16px;border-radius:var(--radiusSm)}
.icon{display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex:none;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:9px}
.cta{display:flex;align-items:center;gap:13px;width:100%;text-align:left;border:1px solid var(--accent);background:var(--accentSoft);border-radius:var(--radius);padding:15px 16px}
.root:disabled{opacity:.45;cursor:not-allowed;pointer-events:none}
```

```tsx
// ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './Button.module.css';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'icon' | 'cta';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: Variant;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant, loading = false, disabled, className, children, ...rest }: ButtonProps) {
  const cls = [s.root, s[variant], className].filter(Boolean).join(' ');
  return (
    <button className={cls} data-variant={variant} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
```

> Note: `app.css` portait `button:disabled{…}` globalement. On le remplace par `.root:disabled` scoping Button. **Vérifier** qu'aucun autre `<button>` legacy non migré ne dépendait du style disabled global avant de retirer la règle globale (Task finale de revue). Si des boutons natifs subsistent, conserver `button:disabled` dans `app.css` jusqu'à leur migration.

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  title: 'Primitives/Button',
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'ghost', 'icon', 'cta'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

export const Primary: StoryObj<typeof Button> = { args: { variant: 'primary', children: 'Lancer la vérification' } };
export const Ghost: StoryObj<typeof Button> = { args: { variant: 'ghost', children: 'Annuler' } };
export const Icon: StoryObj<typeof Button> = { args: { variant: 'icon', children: '☰' } };
export const Cta: StoryObj<typeof Button> = { args: { variant: 'cta', children: 'Nouvelle brève' } };
export const Loading: StoryObj<typeof Button> = { args: { variant: 'primary', loading: true, children: 'Vérification…' } };
export const Disabled: StoryObj<typeof Button> = { args: { variant: 'primary', disabled: true, children: 'Indisponible' } };
```

- [ ] **Step 6: Migrer** chaque `<button className="btn-primary" …>` → `<Button variant="primary" …>`, `btn-ghost` → `variant="ghost"`, `iconbtn` → `variant="icon"`, et la `<button className="cta">`/`<a className="cta">` du Dashboard → `<Button variant="cta">`. Conserver `onClick`, `disabled`, `style`, `aria-*`. Importer `Button`. Pour `.cta .plus` (cercle `+`), garder l'élément enfant `<span className="plus">` tel quel **dans** le `<Button variant="cta">` (le style `.cta .plus` reste descendant — voir Step 7).
Vérifier : `grep -rn 'className="[^"]*\(btn-primary\|btn-ghost\|iconbtn\)\b\|className="cta"' src/renderer/components src/renderer/pages src/renderer/layouts` → aucun.

- [ ] **Step 7: Nettoyer `app.css`** — retirer `.btn-primary` (29-30), `.btn-ghost` (31), `.iconbtn` (6-7), `.cta` (54). Pour `.cta .plus` (55) : le sélecteur descendant ne fonctionnera plus (plus de `.cta`). Déplacer la règle `.plus` en classe autonome dans `Button.module.css` n'est pas possible (enfant arbitraire) → **conserver** `.plus` comme classe globale dans `app.css` en la réécrivant sans le parent : `.plus{width:36px;height:36px;flex:none;border-radius:50%;background:var(--accent);color:var(--onAccent);display:flex;align-items:center;justify-content:center;font-size:18px}`. Retirer `button:disabled` (85) **uniquement** si la revue finale (Task 5.1) confirme zéro `<button>` natif restant ; sinon conserver.

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Button (primary/ghost/icon/cta/loading) + migration + nettoyage app.css"`

### Task 3.8: Card

**Files:**
- Create: `ui/Card.tsx`, `Card.module.css`, `Card.stories.tsx`, `tests/renderer/ui/Card.test.mjs`
- Modify (migration): `components/BreveCard.tsx`, `components/AgentCard.tsx`, `components/Drawer.tsx`, `components/RunStatus.tsx`, `components/HistoryRow.tsx`, `components/EchantillonCard.tsx`, `pages/EchEditions.tsx`, `pages/Dashboard.tsx`, `pages/Archived.tsx`, `pages/Soul.tsx`, `pages/Editor.tsx`, `pages/Checking.tsx`
- Modify: `app.css` (retirer `.card`)

**Interfaces:**
- Produces: `<Card as?={'div'|'button'} className? style? {...rest}>{children}</Card>`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Card.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Card } from '@renderer/components/ui/Card';

test('Card rend ses enfants', () => {
  assert.ok(renderToStaticMarkup(h(Card, null, 'contenu')).includes('contenu'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Card.module.css */
.root{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px 15px}
```

```tsx
// ui/Card.tsx
import type { HTMLAttributes, ReactNode } from 'react';
import s from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className, ...rest }: CardProps) {
  return <div className={className ? `${s.root} ${className}` : s.root} {...rest}>{children}</div>;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = { component: Card, title: 'Primitives/Card' };
export default meta;

export const Defaut: StoryObj<typeof Card> = { args: { children: 'Contenu de la carte' } };
```

- [ ] **Step 6: Migrer** chaque `<div className="card" …>` → `<Card …>` (conserver `style`, `onClick`). Pour `className="card autre"`, passer `className="autre"`. Importer `Card`. Cas RunStatus : il combine `className="card"` + `style` (accentSoft) → `<Card style={{…}}>`.
Vérifier : `grep -rn 'className="[^"]*\bcard\b' src/renderer/components src/renderer/pages` → aucun.

- [ ] **Step 7: Retirer `.card` de `app.css`** (ligne 26).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Card + migration + retrait .card"`

### Task 3.9: Alert

**Files:**
- Create: `ui/Alert.tsx`, `Alert.module.css`, `Alert.stories.tsx`, `tests/renderer/ui/Alert.test.mjs`
- Modify (migration): `components/EnqCard.tsx`, `components/Drawer.tsx`
- Modify: `app.css` (retirer `.alert`)

**Interfaces:**
- Produces: `<Alert tone="accent"|"good"|"warn"|"nuance" style? className?>{children}</Alert>`. `data-tone`. Layout `.alert` + couleurs de fond/texte par tone (via tokens `*Soft`/couleur). Mapping niveau→tone : `corrigé`→`warn`, `nuance`→`nuance`, défaut→`accent`.

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Alert.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Alert } from '@renderer/components/ui/Alert';

test('Alert expose data-tone et son contenu', () => {
  const html = renderToStaticMarkup(h(Alert, { tone: 'warn' }, 'Fait corrigé'));
  assert.ok(html.includes('data-tone="warn"'));
  assert.ok(html.includes('Fait corrigé'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Alert.module.css */
.root{display:flex;flex-direction:column;gap:3px;border-radius:var(--radiusSm);padding:8px 10px}
.accent{color:var(--accent);background:var(--accentSoft)}
.good{color:var(--good);background:var(--goodSoft)}
.warn{color:var(--warn);background:var(--warnSoft)}
.nuance{color:var(--nuance);background:var(--nuanceSoft)}
```

```tsx
// ui/Alert.tsx
import type { HTMLAttributes, ReactNode } from 'react';
import s from './Alert.module.css';

type Tone = 'accent' | 'good' | 'warn' | 'nuance';
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  children: ReactNode;
}

export function Alert({ tone = 'accent', children, className, ...rest }: AlertProps) {
  const cls = [s.root, s[tone], className].filter(Boolean).join(' ');
  return <div className={cls} data-tone={tone} {...rest}>{children}</div>;
}
```

> Note: aujourd'hui `.alert` ne porte que le layout ; la couleur venait d'un `style` inline (via `niveauColor`/`niveauSoft` de `components/niveau.ts`). On internalise la couleur dans la primitive par `tone`. À la migration, remplacer le `style={{background: niveauSoft(n), color: niveauColor(n)}}` par `tone={niveauTone(n)}` (helper local de mapping ci-dessous).

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Alert.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  component: Alert,
  title: 'Primitives/Alert',
  argTypes: { tone: { control: 'inline-radio', options: ['accent', 'good', 'warn', 'nuance'] } },
};
export default meta;

export const Accent: StoryObj<typeof Alert> = { args: { tone: 'accent', children: 'Information de date' } };
export const Warn: StoryObj<typeof Alert> = { args: { tone: 'warn', children: 'Fait corrigé' } };
export const Nuance: StoryObj<typeof Alert> = { args: { tone: 'nuance', children: 'Nuance importante' } };
```

- [ ] **Step 6: Migrer** `EnqCard.tsx` et `Drawer.tsx` — remplacer `<div className="alert" style={{background: niveauSoft(n), color: niveauColor(n)}}>` par `<Alert tone={niveauTone(n)}>`. Ajouter dans `components/niveau.ts` le mapping (cohérent avec les helpers existants) :

```ts
export const niveauTone = (n: string): 'accent' | 'warn' | 'nuance' =>
  n === 'corrigé' ? 'warn' : n === 'nuance' ? 'nuance' : 'accent';
```

Importer `Alert` et `niveauTone`. Conserver le contenu interne de l'alerte.
Vérifier : `grep -rn 'className="alert"' src/renderer` → aucun.

- [ ] **Step 7: Retirer `.alert` de `app.css`** (ligne 70).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert (la suite inclut `tests/renderer/niveau.test.mjs` ; ajouter un cas pour `niveauTone` si le fichier teste déjà les helpers).

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Alert (tones) + niveauTone + migration + retrait .alert"`

### Task 3.10: Textarea (Field)

**Files:**
- Create: `ui/Textarea.tsx`, `Textarea.module.css`, `Textarea.stories.tsx`, `tests/renderer/ui/Textarea.test.mjs`
- Modify (migration): `components/CorrectModal.tsx`, `components/AgentCard.tsx`, `pages/Compose.tsx`, `pages/Soul.tsx`, `pages/Editor.tsx`
- Modify: `app.css` (retirer le sélecteur global `textarea`)

**Interfaces:**
- Produces: `<Textarea {...textareaHTMLAttributes} />` (style DS appliqué via module).

- [ ] **Step 1: Test smoke (échoue)**

```js
// tests/renderer/ui/Textarea.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Textarea } from '@renderer/components/ui/Textarea';

test('Textarea rend un textarea avec la valeur', () => {
  const html = renderToStaticMarkup(h(Textarea, { value: 'salut', readOnly: true }));
  assert.ok(html.includes('<textarea'));
  assert.ok(html.includes('salut'));
});
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Créer la primitive**

```css
/* ui/Textarea.module.css */
.root{width:100%;border:1px solid var(--line);resize:vertical;padding:14px 15px;font:400 13.5px/1.65 var(--mono);color:var(--text);background:var(--panel);border-radius:var(--radius)}
```

```tsx
// ui/Textarea.tsx
import type { TextareaHTMLAttributes } from 'react';
import s from './Textarea.module.css';

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={className ? `${s.root} ${className}` : s.root} {...rest} />;
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Story**

```tsx
// ui/Textarea.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = { component: Textarea, title: 'Primitives/Field/Textarea' };
export default meta;

export const Defaut: StoryObj<typeof Textarea> = { args: { placeholder: 'Collez votre actualité ici…', rows: 6 } };
```

- [ ] **Step 6: Migrer** chaque `<textarea …>` → `<Textarea …>` (conserver `value`, `onChange`, `placeholder`, `rows`, `style`). Importer `Textarea`.
Vérifier : `grep -rn '<textarea' src/renderer/components src/renderer/pages` → aucun.

- [ ] **Step 7: Retirer le sélecteur global `textarea{…}` de `app.css`** (ligne 61).

- [ ] **Step 8: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 9: Commit** — `git commit -am "feat(ui): primitive Textarea + migration + retrait textarea global"`

### Task 3.11: Stepper

**Files:**
- Create: `ui/Stepper.tsx`, `Stepper.module.css`, `Stepper.stories.tsx`, `tests/renderer/ui/Stepper.test.mjs`
- Modify (migration): `layouts/Shell.tsx`
- Modify: `app.css` (retirer `.stepper`, `.steps`, `.step`, `.step.done`, `.step.active`, `.step-bar`, `.step-line`)

**Interfaces:**
- Consumes: la forme retournée par `stepper(view)` de `@domain/navigation` — `{ steps: Array<{ n: number; state: 'done'|'active'|'todo' }>, line: string }`.
- Produces: `<Stepper steps={st.steps} line={st.line} />`.

- [ ] **Step 1: Vérifier la forme exacte du modèle**

Run: `grep -n "steps\|line\|state" src/domain/navigation.ts | head`
Confirmer les noms de champs (`n`, `state`, `line`). Adapter le type ci-dessous si différent.

- [ ] **Step 2: Test smoke (échoue)**

```js
// tests/renderer/ui/Stepper.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Stepper } from '@renderer/components/ui/Stepper';

test('Stepper rend les pastilles et la ligne', () => {
  const html = renderToStaticMarkup(h(Stepper, {
    steps: [{ n: 1, state: 'done' }, { n: 2, state: 'active' }, { n: 3, state: 'todo' }],
    line: 'Étape 2 / 3',
  }));
  assert.ok(html.includes('✓'));          // l'étape done affiche un check
  assert.ok(html.includes('Étape 2 / 3'));
});
```

- [ ] **Step 3: Run → FAIL**

- [ ] **Step 4: Créer la primitive** (CSS repris à l'identique de `app.css` lignes 14-20)

```css
/* ui/Stepper.module.css */
.stepper{flex:none;display:flex;align-items:center;gap:10px;padding:11px 18px;border-bottom:1px solid var(--line);background:var(--panel)}
.steps{display:flex;align-items:center;gap:5px}
.step{width:21px;height:21px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:600 11px var(--body);border:1.5px solid var(--line);background:transparent;color:var(--faint)}
.done{background:var(--accentSoft);color:var(--accent);border-color:transparent}
.active{background:var(--accent);color:var(--onAccent);border-color:transparent}
.bar{width:13px;height:1.5px;background:var(--line)}
.line{margin-left:auto;font:500 11px var(--mono);color:var(--muted)}
```

```tsx
// ui/Stepper.tsx
import s from './Stepper.module.css';

interface Step { n: number; state: 'done' | 'active' | 'todo'; }
interface StepperProps { steps: Step[]; line: string; }

export function Stepper({ steps, line }: StepperProps) {
  return (
    <div className={s.stepper}>
      <div className={s.steps}>
        {steps.map((step, i) => (
          <span key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={`${s.step} ${step.state === 'done' ? s.done : step.state === 'active' ? s.active : ''}`}>
              {step.state === 'done' ? '✓' : step.n}
            </span>
            {i < steps.length - 1 && <span className={s.bar} />}
          </span>
        ))}
      </div>
      <span className={s.line}>{line}</span>
    </div>
  );
}
```

- [ ] **Step 5: Run → PASS**

- [ ] **Step 6: Story**

```tsx
// ui/Stepper.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stepper } from './Stepper';

const meta: Meta<typeof Stepper> = { component: Stepper, title: 'Primitives/Stepper' };
export default meta;

export const Milieu: StoryObj<typeof Stepper> = {
  args: { steps: [{ n: 1, state: 'done' }, { n: 2, state: 'active' }, { n: 3, state: 'todo' }], line: 'Étape 2 / 3' },
};
```

- [ ] **Step 7: Migrer `layouts/Shell.tsx`** — remplacer le bloc `{st.steps.length > 0 && (<div className="stepper">…</div>)}` par `{st.steps.length > 0 && <Stepper steps={st.steps} line={st.line} />}`. Importer `Stepper`.
Vérifier : `grep -rn 'className="stepper"\|className="steps"\|className="step ' src/renderer` → aucun.

- [ ] **Step 8: Retirer** les règles stepper de `app.css` (lignes 13-20, bloc commenté `/* stepper */`).

- [ ] **Step 9: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 10: Commit** — `git commit -am "feat(ui): primitive Stepper + migration Shell + retrait styles stepper"`

### Task 3.12: Modal / Overlay / Sheet

**Files:**
- Create: `ui/Modal.tsx`, `Modal.module.css`, `Modal.stories.tsx`, `tests/renderer/ui/Modal.test.mjs`
- Modify (migration): `components/CorrectModal.tsx`
- Modify: `app.css` (retirer `.overlay`, `.modal` ; **traiter `.sheet`** — voir Step 7)

**Interfaces:**
- Produces: `<Overlay onClose?>{children}</Overlay>`, `<Modal>{children}</Modal>`, `<Sheet>{children}</Sheet>` (exportés depuis `ui/Modal.tsx`). `Overlay` rend le fond ; `Modal`/`Sheet` la surface.

- [ ] **Step 1: Vérifier l'usage de `.sheet`**

Run: `grep -rn 'className="sheet"\|className="overlay"\|className="modal"' src/renderer`
Noter les consommateurs réels. `.sheet` peut être du CSS mort (aucun consommateur) — le confirmer ici.

- [ ] **Step 2: Test smoke (échoue)**

```js
// tests/renderer/ui/Modal.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Overlay, Modal } from '@renderer/components/ui/Modal';

test('Overlay+Modal rendent le contenu', () => {
  const html = renderToStaticMarkup(h(Overlay, null, h(Modal, null, 'corps')));
  assert.ok(html.includes('corps'));
});
```

- [ ] **Step 3: Run → FAIL**

- [ ] **Step 4: Créer les primitives** (CSS repris de `app.css` lignes 78-80)

```css
/* ui/Modal.module.css */
.overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:40}
.sheet{width:400px;max-width:94vw;height:760px;max-height:96vh;background:var(--win);border:1px solid var(--line);border-radius:16px;overflow:auto;box-shadow:var(--shadow)}
.modal{width:360px;max-width:100%;background:var(--win);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px}
```

```tsx
// ui/Modal.tsx
import type { ReactNode } from 'react';
import s from './Modal.module.css';

export function Overlay({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className={s.overlay} onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}>
      {children}
    </div>
  );
}

export function Modal({ children }: { children: ReactNode }) {
  return <div className={s.modal}>{children}</div>;
}

export function Sheet({ children }: { children: ReactNode }) {
  return <div className={s.sheet}>{children}</div>;
}
```

- [ ] **Step 5: Run → PASS**

- [ ] **Step 6: Stories**

```tsx
// ui/Modal.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Overlay, Modal, Sheet } from './Modal';

const meta: Meta = { title: 'Primitives/Modal' };
export default meta;

export const Dialogue: StoryObj = {
  render: () => (
    <div style={{ position: 'relative', height: 480 }}>
      <Overlay><Modal>Contenu de la fenêtre modale</Modal></Overlay>
    </div>
  ),
};
export const Panneau: StoryObj = {
  render: () => (
    <div style={{ position: 'relative', height: 820 }}>
      <Overlay><Sheet>Panneau plein</Sheet></Overlay>
    </div>
  ),
};
```

- [ ] **Step 7: Migrer `CorrectModal.tsx`** — remplacer `<div className="overlay">…<div className="modal">…</div></div>` par `<Overlay onClose={…}><Modal>…</Modal></Overlay>` (préserver la logique de fermeture existante). Importer depuis `@renderer/components/ui/Modal`.
**`.sheet`** : si Step 1 confirme zéro consommateur, retirer `.sheet` de `app.css` (CSS mort) — la primitive `Sheet` reste pour le kit. Sinon migrer le consommateur identifié.
Vérifier : `grep -rn 'className="overlay"\|className="modal"' src/renderer/components src/renderer/pages` → aucun.

- [ ] **Step 8: Retirer `.overlay`, `.modal` (et `.sheet` si mort) de `app.css`** (lignes 77-80 et le commentaire `/* overlays */`).

- [ ] **Step 9: Vérifier** — `npx tsc --noEmit && npx vitest run` → vert.

- [ ] **Step 10: Commit** — `git commit -am "feat(ui): primitives Overlay/Modal/Sheet + migration CorrectModal + nettoyage overlays"`

---

## Phase 4 — Composants : autodocs & contrôles

### Task 4.1: Enrichir les argTypes des 13 composants

**Files:**
- Modify: les `src/renderer/components/*.stories.tsx` ayant des props à variants/états

**Interfaces:**
- Produces: contrôles interactifs (selects/booleans) dans l'onglet Docs/Controls.

- [ ] **Step 1: Ajouter `argTypes` là où c'est pertinent**

Pour chaque composant dont une prop pilote un état discret, ajouter `argTypes` au `meta`. Exemple `BreveCard.stories.tsx` :

```tsx
const meta: Meta<typeof BreveCard> = {
  component: BreveCard,
  title: 'Composants/BreveCard',
  argTypes: { disabled: { control: 'boolean' } },
};
```

Pour les composants pilotés par `niveau` (EnqCard, Drawer, CorrectionRow), exposer un `argType` `niveau` en `inline-radio` avec options `['date', 'corrigé', 'nuance']` si la prop existe au niveau du composant. Ne pas inventer de prop : se limiter aux props réellement déclarées dans le `interface …Props` du composant.

- [ ] **Step 2: Vérifier le build et l'onglet Controls**

Run: `npm run storybook` (ouvrir une story enrichie, vérifier les contrôles), puis arrêter. Puis `npx storybook build --quiet`.
Expected: contrôles visibles, build OK.

- [ ] **Step 3: Commit** — `git commit -am "docs(storybook): argTypes/contrôles sur les composants"`

---

## Phase 5 — Vérification finale

### Task 5.1: Revue de nettoyage `app.css` + non-régression

**Files:**
- Modify: `src/renderer/styles/app.css` (selon découvertes)

- [ ] **Step 1: Vérifier qu'aucune classe migrée ne subsiste**

Run:
```bash
grep -rnE 'className="[^"]*\b(card|btn-primary|btn-ghost|iconbtn|pill|badge-good|alert|eyebrow|muted|faint|dot|spinner|stepper|steps)\b' src/renderer/components src/renderer/pages src/renderer/layouts
```
Expected: aucun résultat (hors classes de domaine non ciblées : `.ed-*`, `.win`, `.head`, `.content`, `.pad`, `.row`, `.edition`, `.enq`, `.corr-*`, `.editable`, `.toast`, `.diamond`, `.plus`, `.hello`).

- [ ] **Step 2: Confirmer le statut de `button:disabled`**

Run: `grep -rn '<button' src/renderer/components src/renderer/pages src/renderer/layouts`
Si zéro `<button>` natif restant (tous passés par `Button`), retirer `button:disabled` de `app.css`. Sinon le conserver.

- [ ] **Step 3: Vérifier l'état final de `app.css`**

`app.css` ne doit plus contenir que : layout (`.win/.head/.h-*/.diamond/.content/.pad`), `.row`, rendu éditions (`.ed-*`), dashboard (`.edition`, `.plus`, `.hello`), `.enq*`, `.corr-*`, `.editable`, `.toast`, `@keyframes spin`/`pulse`, et les resets globaux (`*`, `html,body`, scrollbars…). Lire le fichier et confirmer.

- [ ] **Step 4: Suite complète + tsc + build Storybook**

Run: `npx tsc --noEmit && npx vitest run && npx storybook build --quiet`
Expected: tout vert ; `tests/renderer/stories-coverage.test.mjs` confirme que les 12 primitives ont une story.

- [ ] **Step 5: Lancer l'app Electron et contrôler la non-régression visuelle**

Run: `npm start` (ou la commande de dev Electron du projet). Parcourir Dashboard, Compose, Checking, Editor, Soul, Agents, History, Reader, Archived. Vérifier qu'aucun écran n'a bougé visuellement (boutons, cartes, badges, alertes, stepper, modales identiques à avant).
Expected: parité visuelle confirmée dans les deux thèmes (basculer le thème de l'app si disponible).

- [ ] **Step 6: Commit final**

```bash
git commit -am "chore(ui): revue finale app.css + vérification non-régression DS"
```

### Task 5.2: Build log

**Files:**
- Create: `docs/buildlog/2026-06-27-design-system-storybook.md`

- [ ] **Step 1: Rédiger le build log** (format projet : En-tête, Livré, Validation RÉELLE avec chiffres réels, Gotchas, Décisions/restes). N'inscrire que les vérifications réellement exécutées.

- [ ] **Step 2: Commit** — `git commit -am "docs: build log design system + Storybook"`

---

## Self-Review (effectuée par l'auteur du plan)

- **Couverture spec :** Tokens (Task 1.1) ✓ ; 12 primitives (3.1–3.12) ✓ ; Fondations MDX (2.3) ✓ ; switch thème (2.1) ✓ ; autodocs+contrôles (2.1, 4.1) ✓ ; taxonomie (2.2) ✓ ; audit couverture/cadrage (0.1, 0.2) ✓ ; adoption complète + nettoyage app.css (chaque tâche 3.x + 5.1) ✓ ; vérification tsc/vitest/build/Electron (5.1) ✓.
- **Placeholders :** aucun ; code complet fourni pour chaque primitive, test, story et CSS.
- **Cohérence des types :** `data-variant`/`data-tone`/`data-state` cohérents entre primitives et tests ; `niveauTone` défini en 3.9 et consommé là où Alert est migrée ; forme `Stepper` validée contre `@domain/navigation` au Step 1 de 3.11.
- **Hors-scope respecté :** pas d'export JSON tokens, pas de pages applicatives en Storybook, pas de retrofit `--space` dans les primitives existantes (parité visuelle priorisée).
