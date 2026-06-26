# migration-phase3b3-soul-agents (build log) : SOUL + échantillons + agents React

**Date** : 2026-06-27
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md) (sous-plan 3b-3)
**Plan** : [docs/superpowers/plans/2026-06-27-migration-phase3b3-soul-agents.md](../superpowers/plans/2026-06-27-migration-phase3b3-soul-agents.md)
**Objectif** : Porter en React les vues **soul** (§1-4 éditables + save, §5 échantillons liste/ajout/retrait/save, §6 journal), le sélecteur d'échantillons 2 écrans **ech-editions → ech-breves** (`domain/edition.extractBreves`), et **agents** (cartes éditables + enregistrement), 1:1 avec le renderer vanilla.
**Statut** : livré (Phase 3b-3). Branche `refonte-ts-react-electron` (poussée). Revue finale opus : « Ready for 3b-4 = Yes ». **Validation visuelle finale à confirmer par l'utilisateur** (`npm start`).

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Store soul/ech | `src/renderer/store/app.store.ts` | `SoulForm` + `soulForm`/`soulVersion`/`soulJournal`/`echEdition`/`echKeepLocal` + actions `loadSoul`/`setSoulField`/`setEchEdition`/`setEchKeepLocal`/`addEchantillon`(max 3)/`removeEchantillon` (+ test) |
| Composants | `AgentCard.tsx`, `EchantillonCard.tsx`, `BreveCard.tsx` (+ stories) | présentationnels ; rendu markdown via `inlineMd` |
| Page Soul | `src/renderer/pages/Soul.tsx` | §1-4 store-backed + save (4 requis → `saveSoulSections` + refresh dashboard) ; §5 (EchantillonCard, add désactivé à 3, `saveSoulEchantillons`) ; §6 journal lecture |
| Sélecteur §5 | `src/renderer/pages/EchEditions.tsx`, `EchBreves.tsx` | édition → `readEdition` + `extractBreves` → ajout brève (max 3, date = ISO édition) → retour soul (echKeepLocal) |
| Page Agents | `src/renderer/pages/Agents.tsx` | cartes éditables (modèle/mode si sceptique/outils/prompt/activé) → `saveAgent` + toast |
| Shell | `src/renderer/layouts/Shell.tsx` | retour `ech-breves`→`ech-editions`, `ech-editions`→`soul` (echKeepLocal) |
| Registry | `src/renderer/App.tsx` | vues `soul`/`agents`/`ech-editions`/`ech-breves` |

**Points clés** :
- **`echKeepLocal`** (port du legacy) : l'état §1-4 + §5 vit dans le **store** (pas en state local) pour survivre au démontage de Soul pendant le sous-flux d'échantillons. Au montage, Soul recharge depuis le disque (`getSoulStructured`) **sauf** retour du sous-flux. Tout site qui met `echKeepLocal=true` navigue vers `soul`, unique consommateur qui le remet à false — aucun chemin ne le laisse bloqué ; un `go('goSoul')` frais recharge.
- **Idempotence StrictMode** : l'effet de montage de Soul est gardé par un `useRef` (comme Editor.tsx) — la double-invocation dev ne reconsomme pas `echKeepLocal` ni ne réécrase l'état (fix appliqué après revue de lot, voir Gotchas).
- **Isolation cross-view** : `echantillons`/`soulForm` ne sont touchés que par Soul/EchBreves ; le flux verify→draft→archive n'utilise que `wantSoulLesson` (champ distinct) — pas d'interférence.
- **Pas de fuite** : EchBreves et Agents gardent leur chargement async par un drapeau `alive` + cleanup.
- **Parité** : classes CSS + inline repris ; libellés/toasts/états désactivés/max-3/`isScept` (`!!mode || name==='sceptique'`) identiques au legacy.

## Validation RÉELLE (sous Node 22)

- `npm test` : ✅ **28 fichiers / 157 tests** (ajout : `app.store.soul.test.mjs`).
- `npm run typecheck` : ✅ 0. `npm run lint` : ✅ 0 (pristine).
- `npm run build-storybook` : ✅ (83 modules ; stories AgentCard/EchantillonCard/BreveCard).
- Sanity build `npm start` : ✅ `.vite/build/main.cjs` + `preload.cjs` présents, grep d'erreurs vide.
- `lib/*.mjs`/`hud/*` : **inchangés**. Aucun `import 'electron'` dans `src/renderer`. `SOUL.md` non stagé.
- Exécution subagent-driven : 3 lots + revue par lot (Lot B en opus) + revue finale opus. **Push après chaque commit** (6 commits `c3a0d47`..`2584f09`).

## Gotchas de la passe

- **Idempotence StrictMode (Soul)** : version initiale de l'effet de montage non idempotente — passe 1 consommait `echKeepLocal` (→ false), passe 2 retombait sur le rechargement disque et écrasait l'échantillon ajouté + les éditions §1-4 en cours. Fix : garde `useRef` (`loaded`) en tête d'effet (commit `7c6906f`), comme Editor.tsx.
- **Garde `alive` volontairement absente sur le load de Soul** : combinée à la garde `useRef` + au cleanup StrictMode, une garde `alive` casserait le chargement (le cleanup de la passe 1 mettrait `alive=false` avant résolution du fetch → load skippé en dev). La garde `useRef` est le bon outil (idempotence requise pour `echKeepLocal`) ; l'écriture post-unmount via `getState()` est inoffensive (store global, pas de setState sur composant démonté). Décision documentée, pas un oubli.
- **`add()` dans EchBreves** : lit `echEdition` via `getState()` + null-guard plutôt que la variable de closure, car TS strict ne narrow pas une closure à travers un early-return. Comportement identique, plus sûr (re-check `>=3` sur l'état frais).
- Toujours **sous Node 22** (`nvm use`) — Storybook 10.

## Décisions / restes

- **Minors (revue finale, non bloquants)** : `echEdition` jamais réinitialisé (inoffensif, fidèle au legacy — `ech-breves` n'est atteignable que via `ech-editions` qui le re-set) ; `save` d'Agents non mémoïsé (AgentCard non memoïsé — sans impact).
- **Carry-over hors-scope (rappel 3b-2)** : `lib/contracts.mjs` `faits` non typé string — passe lib future.
- **Reste migration** : 3b-4 (history/reader), Phase 4 (suppression `.mjs`/`hud`), Phase 5 (qualité + packaging).
