# Migration Phase 4 — Suppression du legacy (`lib/` + `hud/`), React unique frontal (design)

**Date** : 2026-06-27
**Branche d'intégration** : `refonte-ts-react-electron`
**Spec parent** : [2026-06-26-migration-phase3-renderer-react-design.md](./2026-06-26-migration-phase3-renderer-react-design.md)
**Statut** : design validé (CLI re-pointé sur `src/` via `tsx` ; suppression intégrale de `lib/`+`hud/`), prêt pour plan Phase 4

## Contexte

Les Phases 1-3b ont porté l'application en TypeScript + React + Electron Forge/Vite. Les 11 vues
sont en React et le code source vit sous `src/`. Le legacy reste en place : le vieux front Electron
`hud/` et la bibliothèque `lib/*.mjs`. La Phase 4 les **supprime** pour faire du renderer React
l'unique frontal.

### Graphe de dépendances réel (reconnaissance)

- **`src/` (app React/TS) ne dépend NI de `lib/` NI de `hud/`** — totalement autonome.
- **Aucun test** (`tests/*.test.mjs`) ne cible `lib/` ou `hud/` (29 fichiers, tous via les alias
  `@domain`/`@main`/`@renderer`/`@shared`, sauf `tests/alias.test.mjs` qui teste la résolution d'alias).
- **`hud/`** (5 fichiers : `main.mjs`, `engine.mjs`, `preload.cjs`, `renderer.mjs`, `companion.html`)
  n'est référencé que par : le script npm `hud` (`electron hud/main.mjs`) et `scripts/breves-cli.mjs`
  (`import … from '../hud/engine.mjs'`). (Un commentaire dans `src/main/index.ts:33` mentionne
  « port de hud/main.mjs » — sans dépendance.)
- **`lib/`** (18 `.mjs`) n'est maintenu en vie que par `scripts/breves-cli.mjs`
  (`import { loadEnvFile } from '../lib/load-env.mjs'`) et transitivement par `hud/`.
- **`scripts/breves-cli.mjs`** = `npm run breves`, le CLI headless documenté au README, qui dispatche
  `breves-verify`/`breves-draft`/`breves-archive` via `hud/engine.mjs` + `lib/load-env.mjs`.
- **eslint** (`eslint.config.mjs`) ignore déjà `lib`, `hud`, `scripts` ; **`scripts/` n'est pas dans
  `tsconfig.include`** (pas de typecheck dédié).

### Décision de cadrage (validée)

Le CLI `npm run breves` est **conservé mais re-pointé sur `src/`** (le port TS), pas supprimé. Cela
permet de supprimer `lib/` et `hud/` intégralement tout en gardant la capacité headless
(scripts/CI/automatisation). Mécanisme retenu : **`tsx`** (runner TS léger qui résout les alias
`tsconfig.paths`).

## Décisions (validées)

- **Re-pointer le CLI** : `scripts/breves-cli.mjs` → `scripts/breves-cli.ts`, important
  `defaultDeps`/`dispatch` depuis `@main/engine` et `loadEnvFile` depuis `@main/io/env` (équivalents
  TS exacts des imports legacy). Logique CLI **inchangée** (verify/draft/archive, lecture stdin,
  sortie JSON, `onEvent` → stderr).
- **Exécution via `tsx`** : ajout de la devDep `tsx` ; `"breves": "tsx scripts/breves-cli.ts"`. Le
  chemin `engine → services → io` est **headless-safe** (aucun `import 'electron'` vérifié).
- **Supprimer** `hud/` (5 fichiers) et `lib/` (18 `.mjs`) intégralement.
- **Nettoyer les références** : retirer le script npm `hud` ; retirer `'lib'`/`'hud'` des `ignores`
  eslint ; mettre à jour le README (app = `npm start` ; CLI = `npm run breves`).
- **Ordre « zéro fenêtre cassée »** : re-pointer + vérifier le CLI **d'abord**, **puis** supprimer
  `lib/`+`hud/`, **puis** re-vérifier. Jamais d'état intermédiaire où le CLI est cassé.

## Architecture (après Phase 4)

```text
src/                      # unique frontal (main Electron + preload + renderer React + domain + shared)
scripts/
  breves-cli.ts          # CLI headless re-pointé sur @main/engine (run via tsx)
  smoke-boot.mjs         # smoke de boot Electron (inchangé)
  typecheck.mjs          # wrapper tsc (inchangé)
tests/                   # Vitest (inchangé ; ne référence ni lib/ ni hud/)
# (lib/ et hud/ supprimés)
```

**Flux CLI (re-pointé)** : `npm run breves <verify|draft|archive>` → `tsx scripts/breves-cli.ts` →
`loadEnvFile()` (`@main/io/env`) + `defaultDeps()` + `dispatch()` (`@main/engine`) → service SDK →
JSON sur stdout. Identique au comportement legacy, mais via le moteur TS.

## Découpage prévu (à affiner dans le plan)

1. **Re-pointage CLI + tsx** : ajout `tsx` ; `scripts/breves-cli.ts` ; script npm `breves` repointé ;
   smoke CLI (`npm run breves` sans arg → usage + exit 1) ; vérifs vertes. (Les fichiers legacy sont
   encore présents à ce stade — le re-pointage ne dépend plus d'eux.)
2. **Suppression `hud/` + `lib/`** : `git rm` des deux dossiers ; retrait du script npm `hud` ;
   nettoyage des `ignores` eslint ; mise à jour README ; re-vérifs vertes + smoke CLI + sanity build.

## Contraintes transverses

- **Node 22** (`nvm use`) pour tout. `npm run typecheck` (0) / `lint` (0) / `test` (verts) à chaque tâche.
- `src/` reste l'unique frontal ; **aucun `import 'electron'`** dans le chemin du CLI (engine/services/io).
- `tests/*` **inchangés** (aucun ne dépend de `lib/`/`hud/`).
- Le re-pointage **précède** la suppression (ordre « zéro fenêtre cassée »).
- Pas de nouvelle dépendance runtime hors `tsx` (devDep).

## Critères de réussite (Phase 4)

- `npm run breves` fonctionne via `tsx` + `@main/engine` (smoke sans arg → usage + exit 1 ; verify
  *live* validable manuellement par l'utilisateur).
- `lib/` et `hud/` **supprimés** ; **aucune référence résiduelle** (`grep -rn "lib/\|hud/"` hors
  `docs/` ne renvoie plus rien dans le code/config) ; script npm `hud` retiré ; eslint ignores nettoyés ;
  README à jour.
- `npm run typecheck` (0) / `lint` (0) / `test` (160 verts) / `build-storybook` OK / `npm start` build
  sans erreur (sanity).
- Le renderer React est l'unique frontal. **Validation visuelle/CLI finale par l'utilisateur.**

## Reste (Phase 5)

Qualité + packaging (build distribuable, signature, etc.). Candidats reportés : refresh dashboard
post-archivage (Minor 3b-4). Plan séparé.
