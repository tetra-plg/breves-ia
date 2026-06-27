# _REVERSE_RECONCILIATION — Brèves IA

> Table **code ↔ intention (sillage) ↔ timeline (git)**. Le **code gagne** sur les conflits ;
> les divergences sont consignées, jamais masquées. Git = arbitre chronologique (« qui est arrivé en dernier »).
> Cartographié à `4ce7095` (2026-06-27).

---

## 1. Chronologie macro (git)

- **Dépôt** : 265 commits, du **2026-06-24** (`19f933c` « Design: compagnon Brèves IA ») au **2026-06-27** (`4ce7095`). Trois jours de développement très dense (sillage SDD piloté par subagents).
- **Tags / releases** :
  | Tag | Date | Signification |
  |---|---|---|
  | `v0.1.0` | 2026-06-25 | 1re version fonctionnelle (moteur + app Electron + agents, **avant** migration React) |
  | `ds-backup-aae26a6` | 2026-06-27 | backup avant nettoyage du design system |
  | `v1.0.0` | 2026-06-27 | version courante : migration React terminée, packaging DMG, vues config (Settings/Agents/Commands) |

- **Deux grands arcs** lisibles dans le sillage :
  1. **Arc fonctionnel initial** (24-25/06) : moteur brèves, app Electron « HUD » legacy (`lib/` + `hud/`), agents enquêteur/sceptique/rédacteur, éditeur SOUL, rendu éditions. Specs `docs/superpowers/specs/2026-06-24..25-*`.
  2. **Arc migration TS/React** (26-27/06) : refonte complète en TS strict + React 19 + Zustand, suppression du legacy, design system + Storybook, packaging. Specs `…/2026-06-26..27-migration-phase*` + `design-system-storybook` + `settings-view` + `commands-view`.

---

## 2. Réconciliation par brique

Statuts : **actif** (livré, câblé, conforme) · **divergent** (livré ≠ intention initiale) · **périmé** (sillage obsolète) · **abandonné/retiré**.

| Brique | Code (preuve présente) | Intention (sillage) | Timeline git | Statut |
|---|---|---|---|---|
| **Moteur brèves (dispatch skills)** | `src/main/engine.ts:136-156`, `services/llm.service.ts` | `specs/2026-06-24-breves-ia-companion-design.md`, `plans/…-moteur.md` | conçu 24/06, migré 26/06 (`engine.ts` add `dfb4cde`), dernier touch `4ce7095` 27/06 | **actif** |
| **Phase 1 — verify + enquêteur** | `.claude/commands/breves-verify.md`, `.claude/agents/enqueteur.md`, schémas Zod | `plans/2026-06-24-agents-verify.md` | 24/06 | **actif** |
| **Passe sceptique** | `.claude/agents/sceptique.md` (modèle sonnet, mode `ciblé`), injecté `engine.ts:139-142` | `buildlog 2026-06-25-f-agents-sceptique.md` | 25/06 | **actif** |
| **Phase 2 — draft + rédacteur** | `.claude/commands/breves-draft.md`, `.claude/agents/redacteur.md`, `draftOutputSchema` | `specs/2026-06-25-agent-redacteur-design.md`, `buildlog …-j-agent-redacteur.md` | 25/06 | **actif** |
| **Phase 3 — archive + ingest** | `.claude/commands/breves-archive.md`, `engine.archiveAndIngest`, `runRaw('/ingest')` | `specs/…-companion-design.md`, skill `breves-archive` | 24-26/06 | **actif** |
| **SOUL (parse/édition §1-6)** | `domain/soul.ts`, `io/soul.io.ts`, pages `Soul/EchEditions/EchBreves` | `specs/2026-06-24-soul-editeur-structure-design.md`, `…-soul-echantillons-manuels-design.md` | 24/06 puis 25/06 (échantillons manuels) puis migré 27/06 (`buildlog …-r-…soul-agents`) | **actif** |
| **Rendu éditions (HTML)** | `domain/edition.ts:25` (`renderEditionHtml`), pages `Reader/History` | `specs/2026-06-24-rendu-editions-style-design.md`, brainstorm `.superpowers/brainstorm/.../editions-style.html` | 24/06, migré 27/06 (`buildlog …-s-…history-reader`) | **actif** |
| **Suivi live (sentinelles/cards)** | `domain/edition.ts:218` (`parseSentinels`), `domain/checking.ts`, `hooks/useCommandStream` | `plans/2026-06-26-migration-phase3b1-flux-verification.md` | 26/06 | **actif** |
| **Design system + Storybook** | `components/ui/*` (14 primitives + stories + tests), `styles/tokens.css` | `specs/2026-06-27-design-system-storybook-design.md` (inclut Phase 0 audit de couverture) | 27/06 | **actif** |
| **Vue Settings (config chemins)** | `pages/Settings.tsx`, `ipc/settings.handlers.ts`, `io/config.ts`, `io/env.ts` | `specs/2026-06-27-settings-view-design.md` | 27/06 | **actif** |
| **Vue Agents (édition agents)** | `pages/Agents.tsx`, `ipc/agents.handlers.ts`, `domain/agents.ts` | `specs/2026-06-24-agents-config-design.md`, `buildlog …-g-agents-config-ui.md` | conçu 24/06, vue migrée 27/06 | **actif** |
| **Vue Commands (édition slash-commands)** | `pages/Commands.tsx`, `ipc/commands.handlers.ts`, `domain/commands.ts` | `specs/2026-06-27-commands-view-design.md` | 27/06 (dernière brique livrée) | **actif** |
| **CLI hors UI (`npm run breves`)** | `scripts/breves-cli.ts` (re-pointé sur `@main/engine` via tsx) | `plans/2026-06-27-migration-phase4-suppression-legacy.md` | 27/06 (`d9b5770`) | **actif** |
| **Packaging DMG + signing ad-hoc** | `forge.config.ts`, `build/entitlements.mac.plist`, `scripts/install-local.sh` | `specs/…-migration-phase5-packaging-qualite-design.md` | 27/06 | **actif** |
| **Hook pre-commit Husky** | `.husky/pre-commit` (typecheck+lint+test, via nvm) | `buildlog …-u-migration-phase5-packaging-qualite.md` | 27/06 | **actif** |
| **Legacy `lib/` + `hud/` (HUD non-React)** | **absent du code** (supprimé) | `specs/…-migration-ts-react-electron-design.md`, `plans/…-phase4-suppression-legacy.md` | retiré 27/06 (`52ca856` « supprime le legacy lib/ + hud/ ») | **abandonné/retiré** — ne pas documenter |
| **Alias `window.breves`** | présent `src/preload/index.ts:35-36` | annoncé « Phase 4 removal » | toujours là à HEAD | **divergent** (rétro-compat non retirée — voir GAP) |
| **`corr: 0` hardcodé dans EditionSummary** | `io/editions.io.ts:37` (compteur corrections jamais calculé) | non spécifié | 26/06 | **divergent** (legacy/placeholder — voir GAP) |
| **`SENTINEL_STEPS` dupliqué de `STEPS`** | `domain/edition.ts:194` vs `domain/checking.ts:3` | non spécifié | 26/06 | **divergent** (risque de drift — voir GAP) |

---

## 3. Pépites captées dans les buildlogs / sillage

- **Packaging macOS (critique)** : signature ad-hoc + hardened-runtime = **crash SIGTRAP V8 au boot** ; il faut soit retirer hardened-runtime (choix retenu, `forge.config.ts:24`), soit notariser. La **quarantaine** doit être retirée (`xattr -dr com.apple.quarantine`) avant le 1er lancement (`scripts/install-local.sh:51-53`). Confirmé par la mémoire projet (`macos-signing-quarantine.md`).
- **SDK hors asar** : `@anthropic-ai/claude-agent-sdk` utilise `import.meta.url` + fork/spawn → doit vivre sur le disque réel → externalisé (`vite.main.config.ts:18`) + `extraResource` (`forge.config.ts:13-18`). Le SDK n'a aucune dépendance transitive.
- **outDir renderer absolu** : sans `path.resolve(__dirname,'.vite/renderer/main_window')` la fenêtre est vide en prod (`vite.renderer.config.ts:15`).
- **Node 22 imposé** : `engines.node >=22` ajouté pour la gate pre-commit (`buildlog …-u-…`).
- **Permissions SDK bypassées** : `permissionMode:'bypassPermissions'` hardcodé (`llm.service.ts:113-121`) — l'app pilote Claude sans prompt de permission (intentionnel, app locale de confiance).
- **« propose puis confirme »** : la SOUL §6 n'est mise à jour qu'avec confirmation utilisateur (gate UI via `wantSoulLesson` / `leconSOUL`), jamais automatiquement.

---

## 4. Conflits tranchés (code gagne)

1. **`window.breves`** — le sillage annonçait son retrait en Phase 4 ; le code le conserve. **Constat retenu : l'alias existe** (`preload/index.ts:35-36`). Divergence consignée en GAP-03.
2. **Vues `detail` / `reader`** — absentes du `const VIEWS` (`navigation.ts:1`) mais bien câblées dans le registry `App.tsx:22-37` et atteintes par `setView` direct. **Constat retenu : 13 vues nominales + 2 vues hors-routeur** (GAP-04).
3. **Versioning SOUL** — pas de champ version explicite ; dérivé de `journal.length+1` à la fois côté domain (`soul.ts:67`) et côté commande archive. **Constat retenu : versioning implicite** (GAP-05).
