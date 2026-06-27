# _REVERSE_MODULE_MAP — Brèves IA

> Détection des modules réels par croisement de **4 signaux** (structure · graphe de dépendances ·
> sillage · git co-change), scoring de complexité, et **proposition global vs par-module**.
> **À valider/ajuster au checkpoint PM** avant que les drivers reverse démarrent.

---

## 1. Signaux croisés

### Signal A — Structure du code
Découpage en **couches** (pas en modules métier) : `src/{domain, shared, main, renderer, config}`.
Aucun workspace npm, aucun package séparé, un seul `package.json`. C'est un **monolithe Electron en couches**.

### Signal B — Graphe de dépendances (imports internes `@alias`)
```
renderer  ──► domain, shared, config        (126 imports internes au renderer)
main      ──► domain, shared, io            (41)
domain    ──► (auto-contenu, aucune dép Electron/React)   (46 importé par les autres)
shared    ──► (contrats purs)               (29 importé)
config    ──► (constantes)                  (1)
```
**Frontière nette** : `renderer` et `main` ne s'importent **jamais** mutuellement ; ils communiquent
uniquement via le contrat IPC de `shared/types`. `domain` est le noyau pur réutilisé des deux côtés.
**Point de coupe clair = la barrière IPC** (preload). Pas de clusters d'imports concurrents qui
suggéreraient des modules métier indépendants.

### Signal C — Sillage (noms métier, les « briques »)
Le sillage nomme des **briques fonctionnelles transverses**, pas des modules isolés :
pipeline 3 phases (verify/draft/archive), éditeur SOUL, rendu éditions, suivi live, design system,
vues de config (Settings/Agents/Commands). Toutes vivent **dans les mêmes couches** (une brique =
1 page + 1 groupe de handlers + des fonctions domain partagées).

### Signal D — Git co-change (cohésion)
`renderer/components` (147) et `renderer/pages` (56) co-évoluent massivement ; `domain` (13),
`main/ipc` (13), `main/io` (8), `main/engine` (6) bien plus stables. Cohésion **par couche**,
confirmée : le frontend est le centre de gravité du churn, le domaine est stable.

**Convergence des 4 signaux** : tous pointent vers **un seul produit cohérent, organisé en couches**,
sans frontières de modules métier déployables séparément. Aucune divergence de signal majeure
(donc pas de zone d'ombre de frontière).

---

## 2. Scoring de complexité

| Métrique | Valeur | Source |
|---|---|---|
| LOC TS/TSX | ~4 558 | `wc -l src/**` |
| Fichiers source | 149 (dont nombreux `.stories.tsx`/CSS modules) | `find src` |
| Fichiers de test | 54 (`.test.mjs`) | `find tests` |
| Surface API (canaux IPC) | 20 | `shared/types/ipc.ts` |
| Skills / sous-agents | 3 skills, 3 agents | `.claude/` |
| Features utilisateur distinctes | ~9 briques (3 phases + SOUL + history/reader + 3 vues config + design system) | sillage |
| Vues UI | 15 pages | `renderer/pages` |
| Couches architecturales | 5 (domain, shared, main, renderer, config) | structure |

**Verdict** : complexité **modérée**, fortement concentrée dans le renderer. Un seul domaine métier
(la chaîne de production de brèves), un découpage **technique en couches**. Le PM a tranché de
documenter en **par-module orienté sections d'app** (voir §3) — décision produit, non technique.

---

## 3. Découpage retenu : **PAR-MODULE (sections d'app)** ✅

> **Décision PM en checkpoint (2026-06-27)** : « la liste des modules doit être des phases de l'app :
> Accueil / Historique / Nouvelle édition / SOUL / Agents / Commandes. »
> Le Cartographe a recommandé le mode GLOBAL (les 4 signaux convergent vers un monolithe en couches) ;
> **le PM élève les briques fonctionnelles au rang de modules** (signal C / sillage), alignés sur la
> navigation réelle (`src/domain/navigation.ts:1`, `Shell.tsx`). **Décision PM prévaut.**

### Ajouts proposés par le Cartographe et **validés** au checkpoint
- ➕ **reglages** (Réglages/Settings) : 7ᵉ section de 1er rang omise de la liste initiale — vue propre
  (`pages/Settings.tsx`), 5 canaux IPC, édite `bbDir/repoDir/claudeBin`. Accessible au header comme
  les autres sections.
- ➕ **socle** (transverse, non-phase) : design system + store + IPC + moteur/SDK + config + packaging.
  Foyer documentaire unique des couches partagées (sinon dupliquées dans chaque module). Assimilable
  au Cycle 0 « fondations » (`docs/followup/foundation/`).

### Carte de modules (à instruire par les drivers)

| Module | Section d'app | Périmètre code (artefacts clés) | Canaux IPC | Données externes |
|---|---|---|---|---|
| **socle** *(transverse)* | — (fondations) | `renderer/components/ui/*` + `foundations/*` + `styles/tokens.css`, `store/app.store.ts`, `layouts/Shell.tsx`, `App.tsx`, `shared/types/{api,ipc}.ts`, `shared/{skills,errors,logger}.ts`, `main/index.ts`, `main/engine.ts` (cœur), `services/llm.service.ts`, `io/{config,env}.ts`, `domain/{frontmatter,format,navigation,events}.ts`, `preload/index.ts`, `forge.config.ts`, `vite.*.config.ts`, `build/` | tout le contrat (20) | SDK, config.json |
| **accueil** | Accueil | `pages/Dashboard.tsx`, `dashboard.handlers.ts` (get-dashboard) | `get-dashboard` | — |
| **nouvelle-edition** | Nouvelle édition (pipeline 3 phases) | `pages/{Compose,Checking,Detail,Editor,Archived}.tsx`, components `{EnqCard,Drawer,RunStatus,CorrectionRow,SourceRow,CorrectModal,ArchiveStep,BreveCard}`, `command.handlers.ts`, `engine.dispatch`/`archiveAndIngest`, `domain/{checking,edition,events}.ts`, `shared/schemas/{inputs,outputs}.ts`, `hooks/useCommandStream.ts` | `send-command`, `command-event`, `archive-ingest` | `.claude/commands/breves-{verify,draft,archive}.md`, `.claude/agents/{enqueteur,redacteur,sceptique}.md`, MCP wiki, `bbDir/raw/{notes,clippings}` |
| **historique** | Historique | `pages/{History,Reader}.tsx`, components `{HistoryRow,EditionRow}`, `dashboard.handlers.ts` (read-edition), `io/editions.io.ts`, `domain/edition.renderEditionHtml` | `read-edition` | `bbDir/raw/notes/*.md` |
| **soul** | SOUL | `pages/{Soul,EchEditions,EchBreves}.tsx`, components `{EchantillonCard,BreveCard}`, `soul.handlers.ts` (3), `io/soul.io.ts`, `domain/soul.ts` | `get-soul-structured`, `save-soul-sections`, `save-soul-echantillons` | `.claude/breves-ia/SOUL.md` |
| **agents** | Agents | `pages/Agents.tsx`, component `AgentCard`, `agents.handlers.ts` (2), `domain/agents.ts` | `get-agents`, `save-agent` | `.claude/agents/*.md` |
| **commands** | Commandes | `pages/Commands.tsx`, component `CommandCard`, `commands.handlers.ts` (2), `domain/commands.ts` | `get-commands`, `save-command` | `.claude/commands/*.md` |
| **reglages** ➕ | Réglages | `pages/Settings.tsx`, component `PathField`, `settings.handlers.ts` (5), `system.handlers.ts` (copy/open-external/hide/quit), `io/{config,env}.ts` | `get-settings`, `validate-path`, `pick-path`, `save-settings`, `quit-app`, `copy`, `open-external`, `hide-window` | `config.json` |

**Notes de frontière :**
- Le **design system** reste *dans* `socle` (vitrine Storybook = outil de dev, pas une section d'app).
- Les sous-flux `ech-editions`/`ech-breves` restent *dans* `soul` (ils l'alimentent en échantillons §5).
- `dashboard.handlers.ts` porte 2 canaux répartis sur 2 modules (`get-dashboard`→accueil, `read-edition`→historique) : à scinder conceptuellement, le fichier reste partagé.
- **CLI `npm run breves`** : **outil de dev secondaire** (décision PM), documenté dans `socle` comme point d'entrée alternatif, pas comme interface de 1er rang.

**Convention de répertoires aval** : `docs/modules/<module>/` pour les 7 sections + `docs/followup/foundation/` pour `socle` (Cycle 0).

---

## 4. Décisions du checkpoint (tracées)

| # | Décision | Statut |
|---|---|---|
| D1 | Découpage **par-module = sections d'app** (Accueil, Nouvelle édition, Historique, SOUL, Agents, Commandes) | **validé PM** |
| D2 | Ajout du module **reglages** (Settings) — 7ᵉ section signalée par le Cartographe | **validé PM** (implicite : « vois-tu autre chose ? » → oui) |
| D3 | Ajout du module transverse **socle** (fondations partagées) | **proposé** — *confirmer au prochain échange si une page socle distincte est souhaitée ou si le socle est réparti dans chaque module* |
| D4 | **CLI** = outil de dev secondaire | **validé PM** |
| D5 | Design system *dans* socle, ech-* *dans* soul | **proposé par le Cartographe** |

> Reste à confirmer (D3/D5) au prochain tour, mais non bloquant : les drivers peuvent démarrer la
> couche technique sur `socle` puis les modules de section.

### Mise à jour (2026-06-27) — production des dossiers par-module Cycle 1

| # | Décision | Statut |
|---|---|---|
| D6 | **Production des dossiers par-module** `docs/modules/<m>/{specs,architecture,implementation,tests}.md` pour les **7 sections** (accueil, nouvelle-edition, historique, soul, agents, commands, reglages) | **validé PM** — remplace le « replié » initial (la complexité modérée justifiait le repli, mais le PM a demandé la granularité Cycle 1) |
| D7 | **`socle` = la couche globale `docs/project/`** (architecture/implementation/security/tests), pas un dossier `docs/modules/socle/` | **acté** — lève l'ambiguïté de nommage : le socle est la fondation, pas un module de section |

> Conséquence : `docs/modules/` contient **7 modules** (les sections d'app) ; le **socle** reste documenté
> dans `docs/project/`. Les dossiers par-module ont été produits en mode reverse (constat tracé) par les
> agents module forward (PO/Architecte/Lead Dev/QA Module). Nouvelles zones d'ombre : GAP-20→25.
