# migration-phase1-fondation (build log) : toolchain TS/Vitest/Forge+Vite + squelette

**Date** : 2026-06-26
**Spec** : [docs/superpowers/specs/2026-06-26-migration-ts-react-electron-design.md](../superpowers/specs/2026-06-26-migration-ts-react-electron-design.md)
**Plan** : [docs/superpowers/plans/2026-06-26-migration-phase1-fondation.md](../superpowers/plans/2026-06-26-migration-phase1-fondation.md)
**Objectif** : Poser la toolchain (Vitest, TypeScript strict, ESLint/Prettier, Electron Forge + Vite) et le squelette `src/`, **sans modifier le comportement fonctionnel** ni convertir le code métier `.mjs`.
**Statut** : livré (Phase 1/5). Mergé dans la branche d'intégration `refonte-ts-react-electron` (merge `aa93ef8`). Branche `migration-phase1` supprimée.

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Port des 16 tests vers Vitest | `tests/*.test.mjs` + `vitest.config.mjs` | `node:test` → `vitest`, `lib/` `.mjs` intacte, fixtures déplacées |
| Toolchain TypeScript strict | `tsconfig.json` | `strict`, `paths` relatifs `./src/*` (pas de `baseUrl`), cible `src/` seulement |
| Wrapper typecheck | `scripts/typecheck.mjs` | affiche les vraies erreurs tsc, tolère TS18003 (src/ vide) |
| ESLint flat + Prettier | `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` | lint `src/**` ; ignore lib/hud/scripts/tests/*.config |
| Squelette + alias | `src/{main,preload,renderer,domain,shared,config,assets}`, `src/config/constants.ts` | alias `@main/@preload/@renderer/@domain/@shared/@config/@assets` câblés à l'identique dans tsconfig + vitest + 3 configs Vite |
| Scaffold Forge + Vite | `forge.config.ts`, `vite.{main,preload,renderer}.config.ts` | makers DMG/exe/deb, VitePlugin |
| Fenêtre placeholder React | `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/{index.html,main.tsx,styles/placeholder.css}` | `npm start` ; main/preload émis en `.cjs` (CJS sous projet ESM) |
| Scripts npm | `package.json` | `start`/`package`/`make`/`typecheck`/`lint`/`format` ajoutés ; `hud`/`breves` conservés |

## Validation RÉELLE

- `npm test` (Vitest) : ✅ **17 fichiers / 121 tests** (16 portés + `alias.test.mjs`), parité avec l'ancien `node --test` (120).
- `npm run typecheck` : ✅ exit 0.
- `npm run lint` : ✅ exit 0.
- `npm start` (Forge) : ✅ build `.vite/build/main.cjs` + `preload.cjs`, process Electron vivant, **aucune** erreur `require is not defined` / `Cannot find module`. ⚠️ **Rendu visuel de la fenêtre NON vérifié** (environnement headless) — à confirmer par l'utilisateur via `npm start`.
- `npm run hud` (legacy) : 🔴 **cassé — bug ANTÉRIEUR à la migration**, prouvé par un worktree `main` propre (`npm ci` neuf) qui crashe à l'identique. Cause : interop ESM/CJS Electron 33 + Node 20.18.3 au chargement de `@anthropic-ai/claude-agent-sdk`. Hors périmètre Phase 1.

## Gotchas de la passe

- **Collision de basename Forge** : `src/main/index.ts` et `src/preload/index.ts` ont le même basename `index` → le plugin Vite écrivait les deux sur `.vite/build/index.js` (collision, `main.js` jamais produit → « Cannot find module .vite/build/main.js »). Fix : forcer les noms de sortie (`build.lib.fileName` côté main, `rollupOptions.output.entryFileNames` côté preload).
- **ESM vs CJS du main** : Forge émet le main en CommonJS (`require`) ; sous `"type":"module"` ça crashe (`require is not defined in ES module scope`). Fix retenu (option propre) : garder le projet ESM et nommer les bootstraps `main.cjs`/`preload.cjs` (CJS explicite).
- **TS 6 + `baseUrl`** : `baseUrl` déprécié (TS5101) → `paths` préfixés `./` et `baseUrl` retiré (pas de `ignoreDeprecations` global).
- **`tsc --noEmit` sur src/ vide** : exit 2 (TS18003) → wrapper `scripts/typecheck.mjs` qui préserve les messages d'erreur réels.
- **Hygiène commit** : le 1er commit a embarqué (via `git add -A`) l'édition `SOUL.md` (suppression d'un échantillon §5, **conservée** sur décision utilisateur) + les 2 favicons `assets/` (légitimes).

## Décisions / restes

- **Versions montées** au-delà de la cible initiale (ranges `^`) : TS **6.0.3**, React **19.2**, Vite 6, Vitest 4. Tout vert ; à garder en tête pour la conversion `lib/`/`hud/` en Phase 2 (TS 6 plus strict).
- **`npm run hud` à réparer** : bug SDK ESM/CJS antérieur — à traiter (probablement Phase 2, lors de la migration du cœur Electron) ou en correctif séparé.
- **Branche d'intégration** : `refonte-ts-react-electron` (tirée de `main`). Les phases 2→5 s'y empilent ; `main` reste propre.
- **Reste Phase 2** : `domain/` (modules purs → `.ts`), `main/`+`preload/` typés, `window.api`, `io/`, services, handlers IPC par domaine, Zod sur la frontière.
