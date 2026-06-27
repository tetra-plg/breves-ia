# Design System & Storybook complet — design

**Date** : 2026-06-27
**Statut** : validé (brainstorming), à passer en plan d'implémentation
**Branche** : `refonte-ts-react-electron`

## Objectif

Transformer le Storybook actuel (catalogue de composants brut, 13 stories 1:1
minimalistes) en une **vitrine complète et structurée** du design system, pour
qu'un UI Designer puisse en tirer un **UI Kit** (Figma) directement réutilisable.
Contrainte forte : le design system doit rester **la source unique réellement
employée par l'app Electron** — pas une couche documentaire parallèle.

## Contexte / état actuel

- **Stack** : Storybook 10 + `@storybook/react-vite`, React 19, Vite 6. Storybook
  fonctionnel (`.storybook/main.ts`, `preview.ts`, `preview-head.html` charge les
  fontes Hanken Grotesk + JetBrains Mono).
- **Design system = CSS** :
  - `src/renderer/styles/tokens.css` : variables (couleurs OKLCH, fontes, rayons,
    ombres), thème clair dans `:root` + thème sombre dans `body.dark`. Direction
    « Halo », issue de `design.html`.
  - `src/renderer/styles/app.css` : classes utilitaires (`.card`, `.btn-primary`,
    `.btn-ghost`, `.iconbtn`, `.cta`, `.pill`, `.badge-good`, `.alert`, `.eyebrow`,
    `.dot`, stepper…) + styles de domaine (`.ed-*`, `.win/.head/.content`,
    dashboard `.edition/.cta`).
- **13 composants** React (`src/renderer/components/`), tous avec une story, mais
  stories pauvres (juste des `args`, ni docs, ni contrôles enrichis).
- **Manques** : aucune doc des tokens dans Storybook (pas de page Couleurs/Typo/
  Espacements), pas de switch thème clair/sombre, primitives visuelles (boutons,
  badges, pills, alerts, stepper) inexistantes en tant que composants — seulement
  des classes CSS.

## Décisions de cadrage (issues du brainstorming)

1. **Ambition DS** : *Structurer + primitives*. On documente ET on extrait les
   primitives en vrais composants React documentés que l'app adopte.
2. **Styling des primitives** : *CSS Modules co-localisés*. Chaque primitive a son
   `.module.css` à côté du `.tsx`, consommant les variables de `tokens.css`. On
   vide `app.css` des classes correspondantes au fur et à mesure. Zéro dépendance
   externe (CSS Modules natifs Vite). Source unique = `tokens.css`.
3. **Périmètre migration** : *adoption complète*. On migre tous les consommateurs
   (composants + pages) vers les primitives et on vide `app.css` au passage.
4. **Features Storybook** : les quatre — pages Fondations (MDX), switch thème
   clair/sombre, autodocs + contrôles, hiérarchie structurée.
5. **Export JSON des tokens** : hors-scope cette passe (extension future si le
   designer veut un import Figma outillé).

## Conception

### 1. Structuration des tokens (source unique)

Garder un **seul `tokens.css`** comme source d'exécution (l'app et les Modules
consomment `var(--x)`), mais l'organiser en couches sémantiques commentées, sans
rien casser :

- **Primitifs** : palette brute + échelle (couleurs OKLCH, fontes, rayons, ombres).
- **Sémantiques** : rôles existants (`--accent`, `--good`, `--warn`, `--nuance` +
  `*Soft`, `--text/--muted/--faint`, surfaces `--bg/--win/--panel/--panel2`).
- **Ajout d'une échelle d'espacement** `--space-1…6`, documentée, que les
  primitives utiliseront à la place des valeurs magiques (`14px 15px`, `18px`…).
  Les classes legacy restent inchangées tant que non migrées.

### 2. Inventaire des primitives (12)

Cœur (8) :

| Primitive | Remplace | Variants / props |
|---|---|---|
| `Button` | `.btn-primary`, `.btn-ghost`, `.iconbtn`, `.cta` | `variant` (primary/ghost/icon/cta), `size`, `disabled`, `loading` |
| `Card` | `.card` | `padding`, `as` |
| `Badge` | `.badge-good` (+ frères) | `tone` (good/warn/nuance/accent) |
| `Pill` | `.pill` | `tone` |
| `Alert` | `.alert` | `tone` (good/warn/nuance/accent) |
| `Eyebrow` | `.eyebrow` | — (overline/label) |
| `StatusDot` | `.dot` + `done/active/todo` | `state` |
| `Spinner` | `.spinner` | `size` |

Optionnelles retenues (4) :

| Primitive | Remplace | Note |
|---|---|---|
| `Text` | `.muted`, `.faint` | helper typographique (`tone` muted/faint) |
| `Stepper` | `.steps/.step/.step-bar/.step-line` | fil d'étapes |
| `Field` (Textarea/Input) | `textarea`, inputs | champs de saisie documentés |
| `Modal`/`Overlay`/`Sheet` | `.overlay/.modal/.sheet` | coquilles de surcouche (Drawer, CorrectModal) |

Les 13 composants existants restent des **composés** s'appuyant sur ces
primitives ; ils ne deviennent pas des primitives.

### 3. Architecture Storybook

Taxonomie :

```
Fondations/        → pages MDX (doc, pas de composant)
  Introduction       (le DS, direction « Halo », comment l'utiliser)
  Couleurs           (swatches sémantiques clair+sombre + valeurs OKLCH)
  Typographie        (fontes, échelle, exemples)
  Espacements        (échelle --space-*)
  Rayons & Ombres    (--radius, --shadow)
Primitives/        → 1 story par primitive, autodocs + contrôles
  Button, Card, Badge, Pill, Alert, Eyebrow, StatusDot,
  Spinner, Text, Stepper, Field, Modal
Composants/        → les 13 existants, stories enrichies + autodocs
  BreveCard, AgentCard, Drawer, Toast, …
```

Réglages transverses (`.storybook/`) :

- **Switch thème** clair/sombre : `globalTypes` + décorateur qui pose/enlève
  `body.dark` (+ fond de scène cohérent). Visible sur toute story dans la toolbar.
- **Autodocs** activé globalement (`tags: ['autodocs']`).
- **Contrôles enrichis** : `argTypes` typés (selects pour `variant`/`tone`/`state`,
  booleans pour `disabled`/`loading`).
- Les **pages applicatives** (Dashboard, Compose…) ne sont PAS mises en Storybook
  (dépendances store/IPC Electron) — hors-scope.

### 4. Audit de couverture (Phase 0, avant extraction)

Avant de toucher aux primitives, auditer le catalogue existant pour garantir
complétude et cadrage — et en faire un invariant vérifié, pas un acquis :

- **Complétude** : chaque composant React de `src/renderer/components/*.tsx`
  (hors `*.stories.tsx`) a une story associée. Aujourd'hui 13/13 ; la vérif doit
  rester verte à chaque ajout de composant.
- **Cadrage** : chaque story couvre les **états/variants pertinents** du composant,
  pas seulement un cas « happy path » (ex. `BreveCard` → `Ajoutable` ET `Pleine` ;
  un composant à états a une story par état significatif). Lister les manques et
  les compléter.
- **Conformité taxonomie** : titres rangés sous `Composants/…`, `tags: ['autodocs']`
  présent, `argTypes` cohérents avec les props.
- **Filet anti-régression** : `build-storybook` liste bien toutes les entrées
  attendues (script ou test léger qui compare composants ↔ stories).

Cette phase produit la liste des stories à enrichir, traitée avant (ou en parallèle
de) l'extraction des primitives.

### 5. Plan d'adoption (migration complète, jamais d'état cassé)

Pour chaque primitive :

1. Créer `Primitive.tsx` + `Primitive.module.css` (styles repris à l'identique de
   `app.css`, branchés sur les tokens) + `Primitive.stories.tsx`.
2. Remplacer dans **tous** les consommateurs (composants + pages) la classe legacy
   par la primitive.
3. **Supprimer** la classe correspondante de `app.css`.
4. `tsc` + `vitest` + revue Storybook avant la primitive suivante.

Ordre (feuilles → composites) : `Eyebrow` → `Text` → `Badge` → `Pill` →
`StatusDot` → `Spinner` → `Button` → `Card` → `Alert` → `Field` → `Stepper` →
`Modal/Overlay/Sheet`.

En fin de passe, `app.css` ne contient plus que les styles **spécifiques au
domaine** (`.ed-*`, layouts `.win/.head/.content`, dashboard `.edition/.cta`…). La
frontière « primitive réutilisable » vs « style applicatif » devient nette.

### 6. Vérification

- **Couverture catalogue** : tout composant de `components/` a une story (invariant
  Phase 0) ; aucune story orpheline ; états/variants pertinents présents.
- **TypeScript** : `tsc --noEmit` vert.
- **Tests** : `vitest run` reste vert ; ajout de tests de rendu légers sur les
  primitives à variants (Button, Badge, Alert).
- **Storybook** : `build-storybook` réussit ; revue visuelle des deux thèmes.
- **Régression app** : lancement Electron pour vérifier qu'aucun écran n'a bougé
  visuellement après migration.

## Hors-scope

- Export JSON / Style Dictionary des tokens (extension future).
- Mise en Storybook des pages applicatives (Dashboard, Compose…).
- Refactor non lié (toute classe de domaine non remplacée par une primitive reste
  telle quelle dans `app.css`).

## Critères de succès

- Storybook avec arbo Fondations / Primitives / Composants, switch thème,
  autodocs et contrôles sur tout.
- Couverture catalogue vérifiée : chaque composant a une story bien cadrée
  (états/variants pertinents), invariant outillé contre la régression.
- 12 primitives React + CSS Modules, branchées sur `tokens.css`, utilisées par
  l'app (plus aucun consommateur des classes legacy correspondantes).
- `app.css` réduit à ses styles de domaine.
- `tsc`, `vitest`, `build-storybook` verts ; app Electron sans régression visuelle.
