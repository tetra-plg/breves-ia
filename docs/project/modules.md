# modules — Brèves IA

> Framework : reverse (constat) · cartographié à 4ce7095 · découpage validé PM (voir _REVERSE_MODULE_MAP.md)

Les 8 modules ci-dessous sont issus du checkpoint PM du 2026-06-27 : 7 sections d'app navigables + 1 socle transverse. Le découpage a été détecté par triangulation de 4 signaux (structure · imports · sillage · git co-change) puis élevé au rang de modules fonctionnels par décision PM (signal C / sillage prévaut sur la convergence technique vers un mode global).

**Notes transverses (décisions D4/D5) :**
- Le **design system** (`components/ui/*`, `styles/tokens.css`, Storybook) appartient au module **socle** ; la vitrine Storybook est un outil de développement secondaire, non une section d'app.
- Les sous-flux `ech-editions` (`pages/EchEditions.tsx`) et `ech-breves` (`pages/EchBreves.tsx`) appartiennent au module **soul** ; ils alimentent les échantillons §5 de la SOUL depuis les éditions archivées.
- Le **CLI `npm run breves`** (`scripts/breves-cli.ts`) est un outil de développement secondaire (D4) documenté dans `socle` ; il ne constitue pas une interface de premier rang.

---

## Vue d'ensemble

| Priorité | Module | Dépendances |
|---|---|---|
| 1 | **socle** | aucune (tout en dépend) |
| 2 | **nouvelle-edition** | socle |
| 3 | **accueil** | socle |
| 4 | **historique** | socle |
| 5 | **soul** | socle, historique |
| 6 | **agents** | socle |
| 7 | **commands** | socle |
| 8 | **reglages** | socle |

---

## socle

**Objectif** : fournir les fondations partagées (design system, store, contrat IPC, moteur SDK, config, packaging) sur lesquelles tous les autres modules s'appuient.

**Périmètre — capacités livrées :**
- Design system : 14 primitives UI (`Button`, `Card`, `Alert`, `Badge`, `Pill`, `Spinner`, `StatusDot`, `Input`, `Textarea`, `Modal`, `Stepper`, `Text`, `Eyebrow`) + pages fondations MDX + `styles/tokens.css` (couches sémantiques + échelle `--space`) + vitrine Storybook.
- Store Zustand global (`store/app.store.ts`) : ~20 slices, navigation `go(action)`, cycle run `beginRun/endRun/tickClock`, réduction d'événements pipeline.
- Shell et routeur : `layouts/Shell.tsx`, `App.tsx` (registry `VIEWS[view]→Page`).
- Contrat IPC : `shared/types/ipc.ts` (20 canaux), `shared/types/api.ts` (interface `Api`/`ApiResult`), preload `src/preload/index.ts`.
- Couche `shared/` : schémas Zod inputs/outputs, registre `ALLOWED_SKILLS`, `AppError`, logger.
- Couche `domain/` utilitaires transverses : `format.ts`, `frontmatter.ts`, `navigation.ts` (vues + FLOW + stepper), `events.ts`.
- Moteur et SDK : `main/engine.ts` (orchestration, `dispatch`, `archiveAndIngest`, validation anti-traversal `isSafeName`), `main/services/llm.service.ts` (pont SDK — `runSkill`/`runRaw`, résolution extraResource en mode packagé, `permissionMode:'bypassPermissions'`).
- Boot Electron : `main/index.ts` (loadEnv → readConfig → registerHandlers → createWindow, hook smoke `BREVES_SMOKE=1`).
- Config et env : `main/io/config.ts` (persistance `config.json`, `pathValid`), `main/io/env.ts` (hiérarchie env > file > défaut, `buildWikiMcp`).
- Packaging : `forge.config.ts` (signature ad-hoc, hardened-runtime désactivé, `extraResource` SDK hors asar, `MakerDMG`), `vite.*.config.ts` (3 configs, alias `@main/@preload/@renderer/@domain/@shared/@config/@assets`), `build/entitlements.mac.plist`.
- CLI de développement : `scripts/breves-cli.ts` (`npm run breves`), `scripts/install-local.sh`.
- Qualité : ESLint 9 flat, Prettier, hook Husky pre-commit (typecheck + lint + test, Node 22), Vitest (framework + conventions).

**Hors périmètre :**
- Toute logique métier propre à une section d'app (pipeline, SOUL, historique, agents, commandes, réglages).
- Gestion du contenu des fichiers `.claude/` (agents, commandes, SOUL) — responsabilité des modules concernés.
- Écrans et pages de navigation (chaque module gère ses propres `pages/`).
- Serveur ou couche réseau — l'app est locale mono-utilisateur, aucun backend distant.

**Dépendances :** aucune (module fondation, tous les autres en dépendent).

**Priorité de lancement :** 1 — prérequis absolu ; aucun autre module ne peut démarrer sans lui.

---

## nouvelle-edition

**Objectif** : permettre à l'utilisateur de produire une édition de brèves complète via le pipeline 3 phases (vérification fan-out → rédaction → archivage + ingestion wiki), qui constitue le cœur produit de l'application.

**Périmètre — capacités livrées :**
- Phase 1 — Vérification (`breves-verify`) : saisie des sujets + option sceptique (`pages/Compose.tsx`), déclenchement `send-command`, suivi live en temps réel (`pages/Checking.tsx`, `domain/checking.ts` machine à états 5 étapes, `hooks/useCommandStream.ts`, composants `EnqCard`/`RunStatus`), vue détail d'un topic (`pages/Detail.tsx`).
- Phase 2 — Rédaction (`breves-draft`) : éditeur de texte teams + affichage corrections/sources (`pages/Editor.tsx`, composants `CorrectionRow`/`SourceRow`/`CorrectModal`/`Drawer`), déclenchement automatique à l'entrée dans la vue.
- Phase 3 — Archivage (`breves-archive`) : confirmation + affichage du résultat et de la brève archivée (`pages/Archived.tsx`, composant `BreveCard`, `ArchiveStep`), appel `archive-ingest` qui enchaîne dépôt wiki + ingest MCP.
- Canaux IPC couverts : `send-command` (+ stream `command-event`), `archive-ingest`.
- Skills et agents externes : `.claude/commands/breves-{verify,draft,archive}.md`, `.claude/agents/{enqueteur,redacteur,sceptique}.md`.
- Domaine métier : `domain/checking.ts`, `domain/edition.ts` (parsing sentinelles, extraction brèves), `shared/schemas/{inputs,outputs}.ts` (validation Zod anti-injection).

**Hors périmètre :**
- Édition des agents ou commandes utilisés (module `agents`, module `commands`).
- Édition du profil éditorial SOUL qui guide la rédaction (module `soul`).
- Consultation des éditions archivées passées (module `historique`).
- Résolution de la configuration des chemins externes (module `reglages`).

**Dépendances :** socle. Consomme les données de `soul` (la SOUL courante alimente la plume du rédacteur) mais ne dépend pas du module soul au sens cycle — le fichier SOUL est une donnée externe gérée par le moteur.

**Priorité de lancement :** 2 — cœur produit, première valeur démontrable après le socle.

---

## accueil

**Objectif** : offrir un tableau de bord synthétique affichant la SOUL courante et l'accès aux éditions récentes, servant de point d'entrée de la session de travail.

**Périmètre — capacités livrées :**
- Page `pages/Dashboard.tsx` : affichage du résumé SOUL (version, extrait) + liste des éditions récentes.
- Déclenchement d'une nouvelle édition depuis le tableau de bord.
- Canal IPC `get-dashboard` (`dashboard.handlers.ts`) : lecture agrégée soul résumée + liste d'éditions.

**Hors périmètre :**
- Lecture complète d'une édition archivée (canal `read-edition` — appartient au module `historique`).
- Édition du contenu de la SOUL (module `soul`).
- Lancement du pipeline depuis une vue autre que le tableau de bord (module `nouvelle-edition`).

**Dépendances :** socle.

**Priorité de lancement :** 3 — vue d'entrée de l'app ; nécessaire à l'expérience complète mais non bloquant pour tester le pipeline.

---

## historique

**Objectif** : permettre à l'utilisateur de retrouver, relire et copier les éditions archivées dans BoilingBrain.

**Périmètre — capacités livrées :**
- Liste des éditions passées (`pages/History.tsx`, composant `HistoryRow`, `EditionRow`), triée par date.
- Lecteur d'édition individuelle (`pages/Reader.tsx`) avec rendu HTML (`domain/edition.ts:renderEditionHtml`) et action de copie.
- Lecture des fichiers notes archivés (`main/io/editions.io.ts` — scanne `{bbDir}/raw/notes`).
- Canal IPC `read-edition` (`dashboard.handlers.ts`).

**Hors périmètre :**
- Modification ou suppression d'une édition archivée — l'historique est en lecture seule.
- Production d'une nouvelle édition (module `nouvelle-edition`).
- Sélection d'un échantillon SOUL depuis l'historique (ce sous-flux `ech-*` appartient au module `soul`).

**Dépendances :** socle. `bbDir` doit être configuré (module `reglages`) pour que le scan de notes fonctionne — dépendance de données, non de code.

**Priorité de lancement :** 4 — valeur immédiate pour l'utilisateur existant ; prérequis indirect de `soul` (les sous-flux `ech-*` piochent dans les éditions).

---

## soul

**Objectif** : permettre à l'utilisateur d'éditer son profil éditorial SOUL (§1-4), de gérer manuellement ses échantillons vivants (§5) et de consulter le journal d'évolution (§6).

**Périmètre — capacités livrées :**
- Édition des sections §1-4 (`pages/Soul.tsx`, canaux `get-soul-structured` + `save-soul-sections`).
- Gestion des échantillons §5 — curation manuelle ≤ 3 (`pages/Soul.tsx`, canal `save-soul-echantillons`) ; jamais modifiés automatiquement par l'archivage.
- Consultation du journal §6 (lecture seule dans la vue SOUL ; mise à jour possible uniquement via la gate « propose puis confirme » de la phase d'archivage).
- Sous-flux `ech-editions` : sélection d'une édition archivée comme base d'un nouvel échantillon (`pages/EchEditions.tsx`, composant `EditionRow`).
- Sous-flux `ech-breves` : sélection d'une brève individuelle extraite d'une édition (`pages/EchBreves.tsx`, composant `BreveCard`).
- Couche domaine : `domain/soul.ts` (parse/sérialise 6 sections, versioning implicite `journal.length+1`), `main/io/soul.io.ts`.

**Hors périmètre :**
- Modification automatique de la SOUL §5 par le pipeline — jamais permis (règle métier centrale).
- Modification directe du journal §6 depuis cette vue — uniquement via gate archivage.
- Lancement du pipeline (module `nouvelle-edition`).
- Édition des agents et commandes qui utilisent la SOUL (modules `agents`, `commands`).

**Dépendances :** socle, historique (les sous-flux `ech-*` piochent dans les éditions archivées via `editions.io.ts`).

**Priorité de lancement :** 5 — nécessite l'historique pour les sous-flux d'échantillons ; valeur quotidienne pour affiner la plume.

---

## agents

**Objectif** : permettre à l'utilisateur d'éditer la configuration des sous-agents (enquêteur, rédacteur, sceptique) — prompt, modèle, outils, activation.

**Périmètre — capacités livrées :**
- Liste et édition des agents (`pages/Agents.tsx`, composant `AgentCard`).
- Parsing/sérialisation des fichiers `.md` agents avec frontmatter YAML (`domain/agents.ts` — `parseAgent`/`serializeAgent`/`activityFromMessage`).
- Lecture/écriture des fichiers `.claude/agents/*.md` dans `repoDir`.
- Canaux IPC : `get-agents`, `save-agent` (avec validation anti-traversal des noms — `engine.ts:isSafeName`).

**Hors périmètre :**
- Édition des slash-commands (module `commands`).
- Exécution des agents — déclenchée par le pipeline (module `nouvelle-edition`).
- Ajout ou suppression d'agents (le périmètre courant est CRUD sur les 3 agents existants).

**Dépendances :** socle.

**Priorité de lancement :** 6 — vue de configuration avancée ; nécessaire pour ajuster le comportement des agents sans intervention fichier directe.

---

## commands

**Objectif** : permettre à l'utilisateur d'éditer le contenu des slash-commands (breves-verify, breves-draft, breves-archive) qui pilotent les phases du pipeline.

**Périmètre — capacités livrées :**
- Liste et édition des commandes (`pages/Commands.tsx`, composant `CommandCard`).
- Parsing/sérialisation des fichiers `.md` commandes avec frontmatter (`domain/commands.ts` — `parseCommand`/`serializeCommand`).
- Lecture/écriture des fichiers `.claude/commands/*.md` dans `repoDir`.
- Canaux IPC : `get-commands`, `save-command` (avec validation anti-traversal des noms).

**Hors périmètre :**
- Édition des agents invoqués par les commandes (module `agents`).
- Exécution des commandes — déclenchée par le pipeline (module `nouvelle-edition`).
- Création ou suppression de commandes (CRUD sur les 3 commandes existantes).

**Dépendances :** socle.

**Priorité de lancement :** 7 — vue de configuration avancée ; parallélisable avec `agents` (même couche technique).

---

## reglages

**Objectif** : permettre à l'utilisateur de configurer les chemins système critiques (`bbDir`, `repoDir`, `claudeBin`) avec validation interactive, pour que l'application pointe vers les bonnes ressources locales.

**Périmètre — capacités livrées :**
- Formulaire de configuration (`pages/Settings.tsx`, composant `PathField`) : affichage et édition des 3 chemins.
- Sélection de chemin via dialogue natif (`pick-path`), validation à la volée (`validate-path`), sauvegarde avec application à chaud (`save-settings` → `applyConfig`).
- Persistance dans `{userData}/config.json` (écrit au 1er lancement avec les défauts hardcodés).
- Résolution de la hiérarchie env > file > défaut (`main/io/env.ts:resolveSetting`).
- Actions système auxiliaires : `copy`, `open-external` (URL `https?://`), `hide-window`, `quit-app` (`system.handlers.ts`).
- Canaux IPC couverts : `get-settings`, `validate-path`, `pick-path`, `save-settings`, `quit-app`, `copy`, `open-external`, `hide-window`.

**Hors périmètre :**
- Configuration de paramètres métier (modèles, prompts, SOUL) — responsabilité des modules `agents`, `commands`, `soul`.
- Gestion de plusieurs profils de configuration — configuration mono-utilisateur unique.
- Export ou import de la configuration.

**Dépendances :** socle.

**Priorité de lancement :** 8 — prérequis de facto pour que l'app fonctionne sur une nouvelle machine, mais découplé des modules fonctionnels dans le code ; les défauts hardcodés couvrent l'env de développement initial.
