# commands-view (build log) : vue Commandes (édition des slash-commands) + catalogue d'icônes

**Date** : 2026-06-27
**Spec** : docs/superpowers/specs/2026-06-27-commands-view-design.md
**Plan** : docs/superpowers/plans/2026-06-27-commands-view.md
**Objectif** : Vue Commandes pour éditer les slash-commands `breves-{verify,draft,archive}` (description + corps) dans `<repoDir>/.claude/commands/`, calquée sur la vue Agents ; renommer `repoDir` → « Repo Brèves » dans Réglages ; cataloguer les icônes dans Storybook.
**Statut** : livré — mergé sur `main` (`04a3ef0..5b6b843`), poussé sur origin.

## Préalable vérifié

Avant le chantier : confirmé empiriquement que l'app packagée invoque bien les commands. Avec `cwd = repoDir`, le message `system/init` du SDK liste `slash_commands: breves-archive, breves-draft, breves-verify` et `agents: enqueteur, redacteur, sceptique`. En omettant `settingSources`, le SDK v0.3.181 charge toutes les sources projet (`.claude/`). Aucun changement SDK nécessaire.

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Frontmatter partagé | `src/domain/frontmatter.ts` | `splitFrontmatter` extrait d'agents.ts (anti-duplication, comportement préservé) |
| Domaine commands | `src/domain/commands.ts` | `Command`, `CommandEdits`, `parseCommand`, `serializeCommand` |
| Engine | `src/main/engine.ts` | `loadCommands`/`getCommands` (trié)/`saveCommand` (name figé, refuse corps vide) |
| IPC | `src/main/ipc/commands.handlers.ts` (+ ipc.ts/api.ts/preload/index.ts) | `getCommands`/`saveCommand` ; `registerCommandsHandlers` (pluriel, distinct du singulier d'exécution de skills) |
| Navigation | `src/domain/navigation.ts` | vue `commands` + `goCommands` + « Commandes » |
| Composant | `src/renderer/components/CommandCard.{tsx,module.css,stories.tsx}` | composite design-system + story ; nom lecture seule, description (Input) + corps (Textarea) éditables |
| Page | `src/renderer/pages/Commands.tsx` (+ App.tsx) | liste les commands, save + toast |
| Header + rename | `src/renderer/layouts/Shell.tsx`, `pages/Settings.tsx` | 6e icône `⌘` Commandes ; label repoDir → « Repo Brèves » |
| Doc icônes | `src/renderer/components/foundations/Icones.mdx` | page `Fondations/Icônes` (catalogue glyphe/sens/où) |

## Validation RÉELLE

- ✅ **209 tests** (48 fichiers) verts sur `main` mergé (`npx vitest run`).
- ✅ `npm run typecheck` + `npm run lint` verts (hook Husky à chaque commit).
- ✅ `npm run build-storybook` : « Storybook build completed successfully » (CommandCard + Fondations/Icônes inclus).
- ✅ `npm run make` : DMG `Brèves IA-0.1.0-arm64.dmg` construit.
- ✅ App réinstallée via `scripts/install-local.sh`, lancée → **3 process vivants, aucun crash report**.
- ⏳ Vérif visuelle Electron (header ⌘, édition d'une command, label « Repo Brèves », page Storybook) : manuelle utilisateur.

## Gotchas de la passe

- **Nom de handler proche** : il existait déjà `command.handlers.ts` / `registerCommandHandlers` (singulier, exécution de skills). Le nouveau est `commands.handlers.ts` / `registerCommandsHandlers` (pluriel, édition de fichiers) — coexistence propre dans `ipc/index.ts`, signalée dans le brief T4.
- **`name` = identité** : le nom de la command (= nom de fichier) est figé (câblé au pipeline via `/${skill}`), non éditable ; `saveCommand` ne l'altère jamais.
- **Refacto `splitFrontmatter`** : extraite vers `frontmatter.ts` et réutilisée par agents.ts + commands.ts ; non-régression des tests agents vérifiée.

## Décisions / restes

- Portée : édition des 3 commands existantes (pas de création/suppression). Édition libre (aucun garde-fou), conforme au choix utilisateur.
- Catalogue d'icônes en **Fondations MDX** (pas de composant `Icon`) — ce sont des glyphes Unicode inline.
- Follow-up (revue finale opus, NON bloquant, defense-in-depth) : ajouter un guard de sanitization de `name` (rejeter `/`, `\`, `..`) **à la fois** sur `saveAgent` et `saveCommand` pour éviter la divergence (path-traversal actuel = pattern pré-existant derrière `contextIsolation` fermé).
- Méthode : exécution **subagent-driven** (10 tâches, implémenteur + revue par tâche, revue finale whole-branch opus = READY TO MERGE).
