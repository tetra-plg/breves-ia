# Compagnon Brèves IA — Design

> Date : 2026-06-24
> Statut : design validé, en attente de relecture avant plan d'implémentation
> Portée : app de bureau locale qui pilote la commande `/breves-ia` du BoilingBrain

## 1. Objectif

Donner une interface de bureau (fenêtre compagnon) à la commande `/breves-ia`, sans
réécrire le moteur. L'app **pilote** la commande existante : elle dispatche des
sous-commandes headless via le Claude Agent SDK (modèle éprouvé sur `poker-suivi`),
remonte les gates humains dans l'UI, et rend les écrans du mockup Claude Design
« Breves IA.dc.html ».

Le garde-fou central de la commande reste intact : **elle n'invente jamais**. Un fait
non confirmé est signalé comme tel, jamais affirmé.

### Décisions cadrées (brainstorm 2026-06-24)
- Rôle de l'UI : **front-end qui pilote la commande** (le moteur reste `/breves-ia`).
- Exécution : **locale, pour Pierre seul** (auth Claude + repo + MCP déjà sur la machine).
- Forme : **app de bureau Electron** (fidèle à la fenêtre compagnon du mockup).
- Moteur : **Claude Agent SDK dans le process principal Electron** (`@anthropic-ai/claude-agent-sdk`).
- Découpage : **3 sous-commandes headless** pilotées par l'UI ; gates dans l'interface.
- Progression « checking » : **jalons réels** (on coche chaque étape sur un événement
  réel, pas de fausse animation).

## 2. Architecture (locale, 2 couches)

Contrairement à `poker-suivi` (app distante → 3 étages HUD / companion distant / bridge
local), tout est local ici. On **fusionne** : le process principal Electron joue le rôle
d'exécuteur (comme le `bridge` de poker-suivi) **et** héberge l'UI.

```
┌─────────────────────────── Electron ───────────────────────────┐
│  Renderer (UI = mockup porté)        Main process (exécuteur)    │
│  ─────────────────────────           ───────────────────────────│
│  - machine d'états des vues          - runner: query() Agent SDK │
│  - rend les 7 vues + overlays        - cwd = repo BoilingBrain   │
│  - possède les gates humains   <IPC> - permissionMode bypass     │
│  - envoie send-command               - allow-list 3 sous-cmds    │
│  - s'abonne aux events streamés      - parse le bloc JSON final  │
│                                      - lit le FS BoilingBrain    │
│                                        (SOUL, éditions passées)  │
└─────────────────────────────────────────────────────────────────┘
```

- **Pas de companion/bridge distant** : inutile en local, on supprime ces deux étages.
- **IPC** via `preload.cjs` (contextIsolation) : `send-command({skill, inputs})` +
  abonnement `command-event` (streaming de jalons) et `command-result` (résultat final).
- **cwd = repo BoilingBrain** : recharge tels quels la SOUL, le MCP `boiling-brain-wiki`
  et les sous-agents. Source de vérité unique.

## 3. Les 3 sous-commandes (contrat de pilotage)

Modèle poker-suivi : le prompt est `/<skill>` + un bloc `INPUTS (…ne pose aucune
question)` en JSON. Chaque sous-commande termine par un **bloc JSON final** que le
runner extrait et renvoie à l'UI. Allow-list : `breves-verify | breves-draft | breves-archive`.

### 3.1 `/breves-verify`
- **Inputs** : `{ sujets: string }` (texte en vrac) ou `{ sujets: string[] }`.
- **Fait** : Phase 1 d'origine — extraction des sujets + **fan-out d'un sous-agent
  enquêteur par sujet** (brief identique à la commande d'origine).
- **Streame** (jalons réels, pour cocher les 5 étapes par carte) :
  `topic-detected`, `step:recherche`, `step:faits`, `step:date`, `step:source`,
  `step:article`, `topic-done`, `topic-error`.
- **Renvoie** :
  ```json
  { "topics": [ {
      "key": "okf", "sujet": "...", "raw": "<énoncé d'origine>",
      "date_reelle": "YYYY-MM-DD", "date_fournie": "YYYY-MM-DD|aucune",
      "date_corrigee": true, "fiabilite": "confirme|partiel|non_verifie",
      "faits": ["..."], "corrections": "<écarts vs énoncé, ou 'aucune'>",
      "alerte": { "niveau": "corrigé|nuance|date", "texte": "..." },
      "source": "<publication>", "url_citee": "...", "url_clippee": "...",
      "clipping_meta": "publication — auteur — date", "slug": "kebab-sans-date",
      "clipping_contenu": "<markdown fidèle>"
  } ] }
  ```

### 3.2 `/breves-draft`
- **Inputs** : `{ topics: <résultats verify>, feedback?: string }`.
- **Fait** : Phase 2 d'origine (sans le gate) — **lit `SOUL.md`** et l'incarne (voix §3,
  lignes rouges §4, exemples §5), rédige chaque brève dans la plume, **regroupe par date
  réelle** (ordre chrono), signale les `non_verifie`, **zéro tiret cadratin**. `feedback`
  présent ⇒ applique la correction demandée.
- **Renvoie** :
  ```json
  { "teamsText": "<prêt-à-coller Teams>",
    "corrections": [ {"niveau":"corrigé|date|nuance","titre":"...","detail":"..."} ],
    "sources":     [ {"name":"...","url_citee":"...","url_clippee":"...","repli":false} ],
    "soulLessonProposee": "<règle de style déduite du feedback, ou null>" }
  ```

### 3.3 `/breves-archive`
- **Inputs** : `{ teamsText, topics, sources, leconSOUL?: string }`.
- **Fait** : Phase 3 d'origine, **uniquement après validation UI** —
  `drop_to_raw('notes', 'YYYY-MM-DD-breves-ia-merim.md', …)`, un
  `drop_to_raw('clippings', 'YYYY-MM-DD-<slug>.md', …)` par sujet (saut si
  `non_verifie`/repli épuisé, signalé), **MAJ SOUL §5** (fenêtre glissante FIFO 3) +
  **§6 journal** si `leconSOUL`, puis **`/ingest`**.
- **Renvoie** :
  ```json
  { "archiveSteps": [ {"t":"Newsletter enregistrée","d":"raw/notes/…md"},
                      {"t":"3 clippings archivés","d":"raw/clippings/"},
                      {"t":"SOUL mise à jour","d":"v8 → v9 · +1 leçon"},
                      {"t":"Intégré au wiki personnel","d":"llm-wiki"} ],
    "newsletterText": "<copie finale>", "soulVersion": "v9" }
  ```

### 3.4 Factorisation (anti-duplication)
Le `/breves-ia` interactif d'origine **reste** (usage terminal). Les éléments communs
sont factorisés pour éviter toute divergence :
- **Brief enquêteur** (Phase 1) → fichier partagé inclus par `/breves-verify` et `/breves-ia`.
- **Lecture + incarnation SOUL** (Phase 2) → partagé par `/breves-draft` et `/breves-ia`.
- **Logique d'archive** (drop_to_raw + MAJ SOUL + ingest) → partagée par `/breves-archive`
  et `/breves-ia`.

## 4. Fidélité du workflow d'origine (traçabilité)

Exigence explicite : **le workflow et les garde-fous de `/breves-ia` doivent être
intégralement respectés** après découpage. Mapping :

| Élément d'origine | Où il vit après découpage |
|---|---|
| Phase 1 : extraction + fan-out enquêteurs | `/breves-verify` (brief identique) |
| Lot > 15 sujets : prévenir + proposer par lot | `/breves-verify` le signale ; l'UI affiche l'avertissement |
| Validation/recherche de date, repli source auto + URL citée d'origine | `/breves-verify` (inchangé) |
| Phase 2 : incarner SOUL, regrouper par date réelle, zéro tiret cadratin | `/breves-draft` |
| `non_verifie` signalé, jamais affirmé | porté par verify (`fiabilite`) **et** draft (formulation) |
| Gate Valider / Corriger | **UI** (Editor : boutons + re-call draft avec `feedback`) |
| « Propose puis confirme » l'ajout de règle SOUL | **UI** (case « enrichir la SOUL » → `leconSOUL` à archive) |
| Phase 3 : note + clippings + MAJ SOUL §5/§6 + ingest | `/breves-archive` |
| Garde-fous : aucune invention ; `raw/` immutable ; SOUL jamais dans `raw/` ; repli mentionné ; slugs kebab datés | conservés dans verify/draft/archive ; vérifiés par tests |

Aucune étape ni garde-fou n'est supprimé : seuls les **deux gates `AskUserQuestion`**
migrent de l'agent vers l'UI. Les sous-commandes restent « sans question » (modèle
poker-suivi) ; l'humain tranche dans l'interface.

## 5. UI : vues, flux & gates

Le renderer porte la machine d'états du mockup (état `view`). Vues :

1. **Dashboard** — « Bonjour Pierre », CTA Nouvelle édition, dernière édition, éditions
   récentes, accès SOUL + Historique.
2. **Compose** — textarea « sujets en vrac », chips de sujets détectés, « Lancer
   l'enquête » → `send-command('breves-verify', {sujets})`.
3. **Checking** — une carte Enquêteur par sujet ; les **5 étapes** se cochent sur les
   jalons réels streamés ; à `topic-done` : badge source + alerte (corrigé/nuance) ;
   `topic-error` : carte en erreur, les autres continuent. Drawer détail au clic.
   Bilan « N vérifiés · X corrigés · Y nuancés » → Rédiger.
4. **Editor** — `teamsText` éditable (corrections surlignées), récap corrections,
   sources & clippings. **Gate** : `Corriger` (modal feedback + case SOUL → re-call
   `breves-draft`) / `Valider & archiver` → `send-command('breves-archive', …)`.
5. **Archived** — étapes d'archivage (depuis `archiveSteps`), copie prête-à-coller.
6. **SOUL** — règles (§4/§3), exemples validés (§5), leçons (§6). Lecture FS.
7. **History** — éditions archivées → reader sheet (copie).

Stepper compact Sujets → Vérification → Rédaction → Archivé, piloté par `view`.

## 6. Données (lecture/écriture)

- **Lecture** (main process, FS BoilingBrain) :
  - SOUL : `.claude/breves-ia/SOUL.md` (parse §4/§5/§6 ; **n° de version** dérivé du
    nombre d'entrées datées du §6 journal, ou compteur explicite à introduire).
  - Éditions passées : notes déposées dans `raw/notes/*breves*` (dashboard/history).
- **Écriture** : uniquement via `/breves-archive` (drop_to_raw + ingest), jamais en
  écrivant directement dans `raw/` (immutable). La SOUL est modifiée hors `raw/`.

## 7. Gestion d'erreurs

- Enquêteur en échec : carte `topic-error`, le run continue ; verify renvoie le sujet
  avec `fiabilite: non_verifie`.
- Paywall / 403 / timeout : repli auto vers source accessible équivalente (logique
  d'origine), URL citée d'origine conservée, repli signalé dans `sources[]`.
- Clé API / auth Claude absente : écran d'aide au démarrage (diagnostic).
- Annulation d'un run : `query()` interrompu proprement, retour Dashboard.
- Bloc JSON final manquant/invalide : erreur explicite remontée à l'UI (pas de rendu
  silencieux de données partielles).

## 8. Structure projet (calquée poker-suivi)

```
breves-ia/
  hud/        main.mjs · preload.cjs · renderer.mjs · companion.html · ws-client?(non)
  lib/        runner.mjs (query Agent SDK + streaming jalons)
              skills.mjs (allow-list)
              command-inputs.mjs (build prompt /<skill> + INPUTS)
              parse-result.mjs (extraction du bloc JSON final)
              soul.mjs (lecture/parse SOUL + version)
              editions.mjs (lecture des notes archivées)
              load-env.mjs
  scripts/    build-html.mjs (mockup → companion.html)
  test/       *.test.mjs (node --test, SDK mocké)
  design.html (mockup de référence importé)
  package.json (type module ; deps: @anthropic-ai/claude-agent-sdk, electron)
```

Pas de `bridge/` ni `companion/` (étages distants supprimés).

## 9. Tests

- `node --test` (comme poker-suivi).
- **SDK mocké** : le runner accepte une fabrique `query` injectable ; les tests
  fournissent un flux d'événements scénarisé (jalons + bloc JSON final) pour vérifier
  parsing, mapping des jalons, et gestion d'erreurs — sans appel réseau.
- Tests de `parse-result` (bloc JSON valide/invalide), `command-inputs` (allow-list),
  `soul` (version + parse §4/§5/§6), `editions` (lecture notes).
- Smoke-test bout en bout (verify→draft→archive) reporté à une vraie veille, comme la
  commande d'origine.

## 10. Hors scope (plus tard)

- Packaging/signature/distribution de l'app.
- Multi-utilisateur, déploiement distant (le squelette IPC reste isolable pour un
  futur passage WS/companion si besoin).
- Tray/notifications avancées (on garde une fenêtre + tray minimal au départ).
