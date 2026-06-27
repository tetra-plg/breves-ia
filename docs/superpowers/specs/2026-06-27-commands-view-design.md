# Vue Commandes (édition des slash-commands) + catalogue d'icônes — design

**Date** : 2026-06-27
**Statut** : design validé, prêt pour le plan d'implémentation

## Objectif

Donner une **vue Commandes** pour éditer les slash-commands du pipeline (`breves-verify/draft/archive`,
dans `<repoDir>/.claude/commands/`), calquée sur la vue Agents. En profiter pour **renommer** le champ
`repoDir` dans la vue Réglages et **cataloguer les icônes** du repo dans Storybook (Fondations).

## Contexte

- Une command = un `.md` dans `<repoDir>/.claude/commands/` : frontmatter `description:` + corps markdown
  (le prompt). Le **nom = le nom de fichier** (pas de champ `name:` dans le frontmatter, contrairement aux agents).
  Les 3 commands `breves-{verify,draft,archive}` pilotent le contrat JSON du pipeline.
- **Vérifié** : avec `cwd = repoDir`, le SDK découvre bien `.claude/commands/` (message `system/init` →
  `slash_commands: breves-archive, breves-draft, breves-verify`). Aucun changement SDK nécessaire
  (en omettant `settingSources`, la v0.3.181 charge toutes les sources projet). Voir [[breves-build-gotchas]].
- Précédent direct = la vue **Agents** : `getAgents`/`saveAgent` ([engine.ts](../../../src/main/engine.ts)),
  `parseAgent`/`serializeAgent` ([agents.ts](../../../src/domain/agents.ts)), `AgentCard`
  ([AgentCard.tsx](../../../src/renderer/components/AgentCard.tsx)), page `Agents`.
- `splitFrontmatter` est aujourd'hui une fonction **privée** dans `agents.ts`.
- Header (`Shell.tsx`) : ← Retour · ✦ Soul · ⚙ Agents · ⛭ Réglages · ◑ Thème · ✕ Quitter.
- Fondations MDX existantes : `src/renderer/components/foundations/{Couleurs,Espacements,Introduction,RayonsOmbres,Typographie}.mdx`.

## Décisions (issues du brainstorming)

| Sujet | Décision |
|---|---|
| Portée | **Éditer les 3 commands existantes** (description + corps). Pas de création/suppression. Nom figé (identité du slash-command). |
| Entrée UI | **6e icône header** : `⌘`, titre « Commandes ». |
| Garde-fou | **Édition libre** (comme SOUL/Agents), aucun filet. |
| Renommage repoDir | Label « Repo SOUL / agents » → **« Repo Brèves »**. |
| Catalogue d'icônes | Page **Fondations/Icônes** (MDX), pas une primitive (ce sont des glyphes Unicode bruts, pas un composant). |

## Architecture

### Domain

`src/domain/frontmatter.ts` (neuf) — extraction de `splitFrontmatter(raw): { fm: Record<string,string>; body: string }`
depuis agents.ts (comportement **préservé**). `agents.ts` l'importe désormais (suppression de la copie privée).

`src/domain/commands.ts` (neuf) :
- `interface Command { name: string; description: string; body: string }`.
- `interface CommandEdits { description: string; body: string }`.
- `parseCommand(raw): { description: string; body: string }` (via `splitFrontmatter` ; le `name` est posé par le loader).
- `serializeCommand(c: { description: string; body: string }): string` → `---\ndescription: <desc>\n---\n\n<body>\n`
  (si `description` vide, frontmatter avec `description:` vide, pour rester un `.md` Claude valide).

### Main — engine + IPC (calqué sur Agents)

[engine.ts](../../../src/main/engine.ts) :
- `loadCommands(deps): Command[]` — lit `<repoDir>/.claude/commands/*.md`, parse chacun, `name` = filename sans `.md`,
  trié par `name`. `try/catch` → `[]` si le dossier manque (comme `loadAgents`).
- `getCommands(deps): Command[]` — expose la liste.
- `saveCommand(deps, name, edits: CommandEdits): { ok; error? }` — valide (`name` non vide, `body` non vide),
  écrit `<repoDir>/.claude/commands/<name>.md` via `serializeCommand`. Le `name` n'est jamais modifié.

IPC : `getCommands` / `saveCommand`, câblés dans `ipc.ts`, `api.ts`, `preload/index.ts`,
`ipc/commands.handlers.ts` (neuf), enregistré dans `ipc/index.ts` — strictement comme `agents.handlers.ts`.

### Renderer

- **`CommandCard`** ([components/CommandCard.tsx] + `.module.css` + `.stories.tsx`, neuf) — composite calqué sur
  `AgentCard` : `name` en lecture seule (titre), `description` éditable (primitive `Input`), `body` éditable
  (primitive `Textarea`, hauteur confortable), bouton **Enregistrer** → `onSave({ description, body })`. Présentationnel.
- Page **`Commands`** ([pages/Commands.tsx], neuf) — charge `window.api.getCommands()`, rend une `CommandCard` par
  command, `save` appelle `window.api.saveCommand(name, edits)` + toast (calqué sur la page `Agents`).
- **Navigation** ([navigation.ts](../../../src/domain/navigation.ts)) : `'commands'` dans `VIEWS`,
  `goCommands: 'commands'` dans `ACTIONS`, `viewTitle('commands') = 'Commandes'`.
- **App.tsx** : enregistre `commands: Commands` dans le registre `VIEWS`.
- **Header** ([Shell.tsx](../../../src/renderer/layouts/Shell.tsx)) : ajoute la 6e icône `⌘` (`title="Commandes"`,
  `go('goCommands')`), placée après ⚙ Agents.

### Renommage repoDir (Réglages)

[Settings.tsx](../../../src/renderer/pages/Settings.tsx) — l'entrée `repoDir` de `FIELDS` : label
`'Repo SOUL / agents (dossier)'` → **`'Repo Brèves'`**. (Aucun changement de clé/logique ; pur libellé.)

### Catalogue d'icônes (Storybook / Fondations)

`src/renderer/components/foundations/Icones.mdx` (neuf) — page MDX `Fondations/Icônes` listant les glyphes
réellement utilisés et leur sens : `←` Retour · `✦` SOUL · `⚙` Agents · `⌘` Commandes · `⛭` Réglages ·
`◑` Thème · `✕` Quitter / erreur · `✓` validé (StatusDot) · `→` flèche (CTA, liens) · `+` Nouvelle édition.
Tableau glyphe | sens | où. Pas de composant `Icon` (YAGNI) : référence documentaire uniquement.

## Forme des données

```ts
interface Command { name: string; description: string; body: string }
interface CommandEdits { description: string; body: string }
```

## Gestion d'erreurs
- Dossier `.claude/commands/` absent → `getCommands` renvoie `[]` (pas de crash).
- `saveCommand` avec `name`/`body` vide → `{ ok:false, error }` ; fichier non écrit.
- Écriture impossible → `{ ok:false, error }` remontée en toast.

## Tests (vitest)
- `frontmatter.ts` : `splitFrontmatter` avec / sans frontmatter ; corps préservé.
- `agents.ts` : tests existants verts après refacto (non-régression de `parseAgent`/`serializeAgent`).
- `commands.ts` : `parseCommand` (frontmatter `description` + body) ; `serializeCommand` round-trip ; description vide.
- engine : `getCommands` (liste triée depuis `repoDir`, `name` = filename) ; `saveCommand` (écrit, refuse body vide, `name` figé).
- navigation : `nextView(_, 'goCommands') === 'commands'`, `viewTitle('commands') === 'Commandes'`, `'commands' ∈ VIEWS`.
- `CommandCard` : story (Composants/CommandCard). Couverture UI légère.

## Hors périmètre (YAGNI)
- Création / suppression / renommage de commands.
- Composant `Icon` (refacto des glyphes inline) — seulement un catalogue documentaire.
- Garde-fous / reset-to-default.
- Changement de `settingSources` (vérifié inutile).

## Fichiers touchés
`src/domain/frontmatter.ts` (neuf), `src/domain/agents.ts`, `src/domain/commands.ts` (neuf),
`src/main/engine.ts`, `src/main/ipc/commands.handlers.ts` (neuf), `src/main/ipc/index.ts`,
`src/shared/types/ipc.ts`, `src/shared/types/api.ts`, `src/preload/index.ts`,
`src/renderer/components/CommandCard.{tsx,module.css,stories.tsx}` (neufs),
`src/renderer/pages/Commands.tsx` (neuf), `src/renderer/App.tsx`, `src/domain/navigation.ts`,
`src/renderer/layouts/Shell.tsx`, `src/renderer/pages/Settings.tsx`,
`src/renderer/components/foundations/Icones.mdx` (neuf).
