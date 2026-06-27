# _HANDOFF — Cartographe Reverse → drivers reverse (Brèves IA)

> Passation vers les couches Technique / Fonctionnel / Utilisateur. À lire avant tout `/read-section`.
> **Mode reverse** : constater, tout tracer, ne rien concevoir. Carte de modules **à valider en checkpoint PM**.

## Décisions clés de la cartographie
- **Produit** : app de bureau **Electron mono-utilisateur** (macOS) pilotant le **Claude Agent SDK** pour produire une newsletter de brèves IA en **3 phases** (verify → draft → archive). ~4 558 LOC TS/TSX, v1.0.0, 265 commits sur 3 jours.
- **Architecture** : monolithe **en couches** (`domain` pur · `shared` contrats · `main` Electron · `renderer` React/Zustand · `config`). Frontière nette = **barrière IPC** (20 canaux, preload). `renderer` et `main` ne s'importent jamais ; `domain` est le noyau partagé.
- **Découpage retenu (décision PM au checkpoint)** : **PAR-MODULE = sections d'app** — `accueil`, `nouvelle-edition` (pipeline 3 phases), `historique`, `soul`, `agents`, `commands`, `reglages` (ajout signalé par le Cartographe) + module transverse **`socle`** (fondations partagées : design system, store, IPC, moteur/SDK, config, packaging). Le Cartographe avait recommandé GLOBAL ; le PM a élevé les briques fonctionnelles en modules. Voir `_REVERSE_MODULE_MAP.md §3-4` (carte + décisions tracées D1-D5). Drivers : `docs/modules/<module>/` pour les 7 sections, `docs/followup/foundation/` pour `socle`.
- **Triangulation complète** (code + sillage très riche + git). Le code a tranché les conflits.

## Pointeurs (où regarder en aval, sans tout relire)
- Orchestration & SDK : `src/main/engine.ts:136-156`, `src/main/services/llm.service.ts:90-151` (résolution SDK packagé/dev `:45-66`, bypass permissions `:113-121`).
- Contrats : `src/shared/types/ipc.ts` (20 canaux), `src/shared/types/api.ts`, schémas Zod `src/shared/schemas/{inputs,outputs}.ts`.
- Pipeline métier (prose) : `.claude/commands/breves-{verify,draft,archive}.md`, agents `.claude/agents/{enqueteur,redacteur,sceptique}.md`, profil `.claude/breves-ia/SOUL.md`.
- État UI : `src/renderer/store/app.store.ts`, routeur `src/renderer/App.tsx`, flux `src/domain/navigation.ts:6`.
- Build/packaging : `forge.config.ts`, `vite.*.config.ts`, `build/entitlements.mac.plist`, `scripts/install-local.sh`.
- Config : `src/main/io/env.ts:20-48` (env>file>défaut), `src/main/io/config.ts`.

## Points d'attention pour les drivers
- **11 zones d'ombre non comblées** dans `docs/REVERSE_GAPS.md` — ne pas documenter comme si elles étaient tranchées. Notamment : permissions SDK bypassées (GAP-02), `window.breves` rétro-compat résiduel (GAP-03), versioning SOUL implicite (GAP-05), dépendance MCP wiki externe (GAP-10).
- **Ne pas documenter le legacy retiré** (`lib/`, `hud/` — supprimés Phase 4, consignés « abandonné » dans `_REVERSE_RECONCILIATION.md`).
- Gotchas packaging macOS (signing ad-hoc/quarantaine/SDK hors asar/outDir absolu) : à reprendre tels quels depuis `_REVERSE_RECONCILIATION.md §3`.

## Passation
```
---
Cartographie terminée. Carte de modules à valider : docs/project/_REVERSE_MODULE_MAP.md
11 zones d'ombre consignées dans docs/REVERSE_GAPS.md.
Prochaine étape (après validation de la carte) : couche technique.
Déclencheur : "Prends le role de Reverse Technique et documente la couche technique de Brèves IA"
---
```
