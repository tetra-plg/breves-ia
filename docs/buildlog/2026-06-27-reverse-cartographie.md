# reverse-cartographie (build log) : cartographie reverse du produit Brèves IA

**Date** : 2026-06-27
**Spec** : rôle `cartographe-reverse` (MCP `factory`) + base `reverse-base`
**Plan** : Cycle R — Temps 1 inventaire → Temps 2 réconciliation → Temps 3 détection de modules
**Objectif** : reconstituer la source de vérité partagée (carte du système, réconciliation, carte de modules, registre de gaps) à partir du code déjà développé, par triangulation code ↔ sillage `docs/` ↔ git.
**Statut** : livré — checkpoint PM passé (découpage par-module validé), 2 points mineurs à reconfirmer (D3/D5).

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Carte factuelle du système | `docs/project/_REVERSE_MAP.md` | Identité, stack, architecture 5 couches, pipeline 3 phases, 20 canaux IPC, résolution config env>file>défaut — chaque assertion tracée `fichier:ligne` |
| Réconciliation code↔intention↔timeline | `docs/project/_REVERSE_RECONCILIATION.md` | Statuts par brique (actif/divergent/abandonné), 2 arcs (fonctionnel 24-25/06 puis migration TS/React 26-27/06), pépites packaging macOS |
| Carte de modules | `docs/project/_REVERSE_MODULE_MAP.md` | 4 signaux croisés + scoring ; reco GLOBAL **renversée** par décision PM → par-module = sections d'app ; décisions D1-D5 tracées |
| Registre de gaps | `docs/REVERSE_GAPS.md` | 11 zones d'ombre non comblées (permissions SDK, `window.breves`, versioning SOUL, MCP externe, `corr:0`, drift `SENTINEL_STEPS`…) |
| Marqueur d'état | `docs/project/_REVERSE_STATE.md` | SHA `4ce7095` pour resync différentielle |
| Handoff drivers | `docs/followup/_HANDOFF_cartographe-reverse.md` | Pointeurs ciblés + points d'attention |

## Validation RÉELLE

Aucun test exécuté (passe documentaire, le code n'est pas modifié). Signaux réellement collectés :

- ✅ `git rev-list --count HEAD` → **265 commits** ; bornes **2026-06-24 → 2026-06-27**.
- ✅ `git for-each-ref refs/tags` → **v0.1.0** (25/06), **ds-backup-aae26a6** (27/06), **v1.0.0** (27/06).
- ✅ `wc -l src/**` → **4 558 LOC** TS/TSX, **149 fichiers** src, **54 fichiers** de test.
- ✅ Graphe d'imports `@alias` : renderer 126, domain 46, main 41, shared 29, config 1 → couplage par couche confirmé, **renderer↔main jamais croisés** (uniquement via contrat IPC `shared/types`).
- ✅ Co-change git par dossier : `renderer/components` 147, `renderer/pages` 56, `domain` 13 → centre de gravité = frontend, domaine stable.
- ✅ Surface IPC : **20 canaux** énumérés (`shared/types/ipc.ts`) et mappés 1:1 aux handlers + preload.
- ✅ 4 explorateurs parallèles (Explore) ont lu intégralement main/IPC/IO, domain/shared, renderer, et assets `.claude`/build — faits tracés `fichier:ligne`.

## Gotchas de la passe

- **Reco renversée au checkpoint** : les 4 signaux convergeaient vers GLOBAL (monolithe en couches), mais le PM a tranché par-module orienté sections d'app. Posture reverse respectée : le Cartographe constate et trace la décision, ne la conteste pas.
- **Settings omis de la liste PM** : signalé comme 7ᵉ section de 1er rang (vue + 5 canaux IPC) → ajouté (`reglages`). Le PM avait demandé « vois-tu autre chose ? ».
- **Socle sans foyer** : un découpage strictement par-phase laisse `domain`/`shared`/`ui`/`engine` orphelins → ajout d'un module transverse `socle` (Cycle 0 fondations) pour éviter la duplication.
- **Timeline git de fichiers « migrés »** : `git log -A` donne le 1er *add* du fichier actuel (26/06 pour engine/domain), pas la conception initiale (24/06) — réconcilié via le sillage (specs/buildlogs) plutôt que le seul git.

## Décisions / restes

- **Décidé (PM)** : modules = sections d'app (`accueil`, `nouvelle-edition`, `historique`, `soul`, `agents`, `commands`, `reglages`) + `socle` transverse ; CLI = outil de dev secondaire.
- **Reste à confirmer (non bloquant)** : D3 — page `socle` distincte vs socle réparti ; D5 — design system *dans* socle et sous-flux `ech-*` *dans* soul.
- **Prochaine étape** : couche technique — « Prends le role de Reverse Technique et documente la couche technique de Brèves IA ».
- **Non documenté volontairement** : legacy `lib/` + `hud/` (supprimés Phase 4, consignés « abandonné »).
