# migration-phase4-suppression-legacy (build log) : React unique frontal

**Date** : 2026-06-27
**Spec** : [docs/superpowers/specs/2026-06-27-migration-phase4-suppression-legacy-design.md](../superpowers/specs/2026-06-27-migration-phase4-suppression-legacy-design.md)
**Plan** : [docs/superpowers/plans/2026-06-27-migration-phase4-suppression-legacy.md](../superpowers/plans/2026-06-27-migration-phase4-suppression-legacy.md)
**Objectif** : Faire du renderer React l'unique frontal : re-pointer le CLI headless `npm run breves` sur le moteur TS `src/` (via `tsx`), puis supprimer intégralement `lib/` + `hud/`.
**Statut** : livré (Phase 4). Branche `refonte-ts-react-electron` (poussée). Revue finale opus : « legacy removed cleanly = Yes ». **Validation CLI/visuelle finale à confirmer par l'utilisateur.**

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| CLI re-pointé | `scripts/breves-cli.ts` (remplace `.mjs`) | importe `@main/engine` (`defaultDeps`/`dispatch`) + `@main/io/env` (`loadEnvFile`) ; logique verify/draft/archive inchangée |
| Runner TS | `package.json` (devDep `tsx`) | `"breves": "tsx scripts/breves-cli.ts"` ; tsx résout les alias `tsconfig.paths` (forme simple, sans `--tsconfig`) |
| Suppression legacy | `hud/` (5 fichiers) + `lib/` (17 `.mjs`) | `git rm -r hud lib` — 22 fichiers retirés |
| Nettoyage | `package.json`, `eslint.config.mjs`, `README.md` | script `hud` retiré ; `'lib'`/`'hud'` retirés des ignores eslint ; README (app = `npm start`, CLI = `npm run breves`) |
| Commentaires | `src/main/index.ts`, `src/shared/schemas/inputs.ts` | 2 commentaires référençant d'anciens chemins `lib/`/`hud/` nettoyés (pour satisfaire le grep résiduel ; aucun code modifié) |

**Points clés** :
- **Ordre « zéro fenêtre cassée »** : Task 1 re-pointe + vérifie le CLI (smoke) **avant** que Task 2 ne supprime quoi que ce soit. Gate de revue entre les deux.
- **CLI headless** : le chemin `engine → services → io` n'importe aucun `electron` et n'a aucun effet de bord au chargement (client SDK lazy) → le smoke `npm run breves` (sans arg → usage + exit 1) prouve que le graphe TS + alias se charge sous `tsx` sans appel SDK ni réseau.
- **`src/` était déjà autonome** : aucun import de `lib/`/`hud/`, aucun test ne les cible → suppression sans impact sur l'app ni les tests.

## Validation RÉELLE (sous Node 22)

- `npm run breves` (sans arg) : ✅ `usage: breves-cli <verify|draft|archive> [arg]` + exit 1 (via `tsx`, alias résolus, sans SDK).
- `npm test` : ✅ **29 fichiers / 160 tests** (inchangés). `npm run typecheck` : ✅ 0. `npm run lint` : ✅ 0.
- `npm run build-storybook` : ✅. Sanity build `npm start` : ✅ `.vite/build/main.cjs` présent, grep d'erreurs vide.
- Grep résiduel `lib/`/`hud/` (hors `docs/`) : ✅ **vide**. `lib/` et `hud/` : **supprimés**.
- `SOUL.md` non stagé. Exécution subagent-driven : 2 tâches + revue par tâche (gate avant suppression) + revue finale opus. **Push après chaque commit** (2 commits `d9b5770`, `52ca856`).

## Gotchas de la passe

- **`tsx` + alias** : `tsx` résout `compilerOptions.paths` du `tsconfig.json` automatiquement → la forme simple `tsx scripts/breves-cli.ts` suffit (le fallback `--tsconfig` prévu n'a pas été nécessaire).
- **Grep résiduel attrape les commentaires** : 2 commentaires dans `src/` mentionnaient `hud/main.mjs` / `lib/command-inputs.mjs` → nettoyés (commentaires uniquement) pour passer le gate.
- Toujours **sous Node 22** (`nvm use`).

## Décisions / restes

- **Minors (revue finale, non bloquants)** : le plan annonçait « 18 `lib` / 23 total » — chiffre réel **17 `lib` + 5 `hud` = 22** (suppression bien complète, simple erreur de prose) ; `package.json engines.node >=20.19` plus permissif que le Node 22 mandaté (pré-existant, sans risque — le toolchain tourne en 22) ; `scripts/breves-cli.ts` hors gate typecheck/lint (tradeoff documenté, le smoke sert de filet).
- **Reste migration** : Phase 5 (qualité + packaging : `make`/distribuable, signature). Candidat reporté : refresh dashboard post-archivage (Minor 3b-4).
- **Jalon** : le renderer vanilla est **supprimé** — React est l'unique frontal de breves-ia.
