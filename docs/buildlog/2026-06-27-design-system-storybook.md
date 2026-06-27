# design-system-storybook (build log) : vitrine Storybook + 12 primitives adoptées

**Date** : 2026-06-27
**Spec** : docs/superpowers/specs/2026-06-27-design-system-storybook-design.md
**Plan** : docs/superpowers/plans/2026-06-27-design-system-storybook.md
**Objectif** : transformer le Storybook (catalogue brut) en vitrine structurée d'un design system — Fondations + 12 primitives React documentées, réellement adoptées par l'app — pour qu'un UI Designer en tire un UI Kit.
**Statut** : livré (exécution subagent-driven, 21 tâches + revue par tâche). Reste : revue finale whole-branch + vérif visuelle Electron manuelle.

## Livré

| Livrable | Fichier(s) | Notes |
|---|---|---|
| Invariant de couverture stories | tests/renderer/stories-coverage.test.mjs | composant → story sœur (components/ + ui/) |
| Cadrage stories | components/*.stories.tsx | +4 stories d'états (CorrectModal/CorrectionRow/Drawer/EnqCard), 9 déjà cadrées |
| Tokens en couches + échelle espacement | src/renderer/styles/tokens.css, tests/renderer/tokens.test.mjs | couches Primitifs/Sémantiques, `--space-1..6`, parité byte-identique |
| Switch thème + autodocs | .storybook/preview.tsx | toolbar clair/sombre (body.dark), `tags:['autodocs']` |
| addon-docs (prérequis non prévu) | package.json, .storybook/main.ts | `@storybook/addon-docs@10.4.6` absent du react-vite |
| Taxonomie Composants/* | components/*.stories.tsx | 13 titres `Composants/<Nom>` |
| Pages Fondations (MDX) | components/foundations/*.mdx | Introduction, Couleurs, Typographie, Espacements, Rayons&Ombres |
| 12 primitives | src/renderer/components/ui/*.{tsx,module.css,stories.tsx} | Eyebrow, Text, Badge, Pill, StatusDot, Spinner, Button, Card, Alert, Textarea, Stepper, Modal/Overlay/Sheet |
| Tests de rendu primitives | tests/renderer/ui/*.test.mjs | smokes via react-dom/server (env node) |
| Helper niveauTone | components/niveau.ts (+ test) | mapping niveau→tone pour Alert |
| argTypes contrôles | BreveCard/CorrectModal stories | 2 booleans (11 sautés : props imbriquées) |
| Nettoyage app.css | src/renderer/styles/app.css | 85 → 51 lignes (domaine only) |

## Validation RÉELLE (chiffres réels)

- `npm run typecheck` (tsc --noEmit) : ✅ vert (état final).
- `npm test` (vitest) : ✅ **179 tests / 43 fichiers** (départ 160 → +19 : couverture, tokens, niveauTone, 12 smokes primitives).
- `npm run build-storybook` : ✅ succès (236 modules ; sections Fondations/Primitives/Composants présentes).
- Hook pre-commit Husky (typecheck+lint+test) : ✅ a gardé chaque commit de la passe.
- Revue par tâche (spec + qualité) : ✅ 21/21 Approved (Minors consignés, aucun Critical/Important non résolu).
- 🔶 Régression visuelle Electron (`npm start`, parcours des écrans, 2 thèmes) : **NON exécutée** — vérif manuelle utilisateur (nécessite GUI).

## Gotchas de la passe

- **`@storybook/addon-docs` absent** : le plan supposait qu'il était fourni par `@storybook/react-vite` ; faux. Sans lui, ni autodocs ni blocks MDX (`Meta`/`ColorPalette`/`Typeset`) ne résolvent. Installé en devDependency (10.4.6) + `addons:['@storybook/addon-docs']` (commit a4861d7). Contrainte « zéro dépendance runtime » respectée (dev only).
- **`style` non prévu sur primitives présentationnelles** : Eyebrow/Text portaient des styles inline chez de nombreux consommateurs ; ajout d'une prop `style` forwardée pour ne pas les perdre (parité de rendu).
- **Polymorphisme `as`** : Pill et Card avaient des consommateurs `<button>`/`<textarea>` ; rendus polymorphes (`as` + spread typé `ComponentPropsWithoutRef`) pour préserver onClick/value/type.
- **Distinction className vs token inline** : `var(--muted)`/`var(--faint)` en `style={{}}` ≠ classe `.muted`/`.faint` ; seuls les vrais `className` migrés (ArchiveStep laissé car inline).
- **Écarts de périmètre du plan corrigés** : StatusDot avait un 4e consommateur dynamique omis (EnqCard) ; Alert n'avait qu'un seul vrai consommateur de `.alert` (EnqCard ; le bloc de Drawer est inline et visuellement distinct, non touché) ; le textarea d'Editor était déjà devenu `Card as="textarea"` en amont.
- **`@keyframes spin` partagé** : conservé dans app.css (StatusDot.active + Spinner en dépendent) malgré le retrait des classes `.dot`/`.spinner`.
- **`StepperStep.n` typé `string`** côté domaine (pas `number`) : type local élargi.
- **`button:disabled` conservé** : des `<button>` natifs domaine subsistent (EditionRow `.edition`) → règle globale gardée.
- **Build logs par-tâche parasites** : un sous-agent en a créé un (tâche tokens) ; retiré — un seul build log en fin de passe (celui-ci).

## Décisions / restes

- **Parité visuelle priorisée** : CSS des primitives repris byte-identique de app.css ; `--space-*` ajouté + documenté mais NON rétro-injecté dans les primitives (anti-drift). Conforme au choix de cadrage.
- **`.sheet`** était du CSS mort : retiré d'app.css, mais primitive `Sheet` conservée pour le kit.
- **Hors-scope tenu** : pas d'export JSON tokens, pas de pages applicatives en Storybook.
- **Minors différés** (tri en revue finale) : `export const Date` (CorrectionRow.stories) masque le built-in ; `React.ReactNode` non-importé nommément (Pill) ; smokes primitives minimaux (variants non couverts) ; quelques stories de tons manquantes (Alert `Good`).
- **Restes** : revue finale whole-branch (opus) ; vérification visuelle Electron manuelle (2 thèmes) par l'utilisateur.
