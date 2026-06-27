# REVERSE_REVIEW — Rapport de revue Doc Reviewer (Cycle 3)

> Mode : reverse autonome · Source de vérité : code + `_REVERSE_RECONCILIATION.md` + `REVERSE_GAPS.md`
> Cartographié à `4ce7095` · Revue menée le 2026-06-27

---

## 1. Tableau livré ↔ documenté

| Brique / Feature | Statut code (`_REVERSE_RECONCILIATION`) | Guide utilisateur existe ? | Module technique complet ? | Alerte |
|---|---|---|---|---|
| Moteur brèves (dispatch skills) | actif | via `nouvelle-edition/guide.md` | `docs/project/` (socle) | — |
| Phase 1 — verify + enquêteur | actif | `nouvelle-edition/guide.md` ✓ | `modules/nouvelle-edition/` ✓ | — |
| Passe sceptique | actif | `nouvelle-edition/guide.md` ✓ | `modules/nouvelle-edition/` ✓ | — |
| Phase 2 — draft + rédacteur | actif | `nouvelle-edition/guide.md` ✓ | `modules/nouvelle-edition/` ✓ | — |
| Phase 3 — archive + ingest | actif | `nouvelle-edition/guide.md` ✓ | `modules/nouvelle-edition/` ✓ | — |
| SOUL (§1-6) | actif | `soul/guide.md` ✓ | `modules/soul/` ✓ | ALERTE partielle → voir §2 |
| Rendu éditions (HTML) | actif | `historique/guide.md` ✓ | `modules/historique/` ✓ | — |
| Suivi live (sentinelles/cards) | actif | `nouvelle-edition/guide.md` ✓ | `modules/nouvelle-edition/` ✓ | — |
| Design system + Storybook | actif | non documenté (outil de dev — hors scope manuel) | `docs/project/` (socle) | — (non-scope assumé) |
| Vue Settings (Réglages) | actif | `reglages/guide.md` ✓ | `modules/reglages/` ✓ | — |
| Vue Agents | actif | `agents/guide.md` ✓ | `modules/agents/` ✓ | — |
| Vue Commands (Commandes) | actif | `commands/guide.md` ✓ | `modules/commands/` ✓ | — |
| Accueil (Dashboard) | actif | `accueil/guide.md` ✓ | `modules/accueil/` ✓ | ALERTE → voir §2 |
| CLI `npm run breves` | actif | non documenté (outil de dev — hors scope manuel) | non (décision PM D4) | — (non-scope assumé) |
| Packaging DMG + signing | actif | mention dans `reglages/guide.md` (prérequis) | `docs/project/` (socle) | — |
| Legacy `lib/` + `hud/` | abandonné/retiré | non documenté ✓ (correct) | consigné dans réconciliation | — |
| `window.breves` (alias rétro) | divergent (GAP-03) | non documenté ✓ (interne) | signalé GAP-03 | — |
| `corr: 0` hardcodé (GAP-06) | divergent | documenté comme « comportement connu » dans `accueil/guide.md` ✓ | signalé GAP-06 | RÉSOLU dans le guide |
| Thème clair/sombre (GAP-19) | divergent (non exposé UI) | non mentionné dans aucun guide ✓ | signalé GAP-19 | — (correct, feature non atteignable) |
| `Dashboard.soul` non rendu (GAP-20) | divergent | **INCOHÉRENCE CRITIQUE** (voir §2) | signalé GAP-20 | **ALERTE** |
| Bouton Quitter absent (GAP-23) | divergent (canal IPC sans déclencheur UI) | non mentionné ✓ | signalé GAP-23 | — (correct) |

---

## 2. Incohérences inter-couches

### ALERTE-01 — CRITIQUE : version SOUL affichée sur l'Accueil (guide) vs non rendue dans le code

**Source :** `docs/user/accueil/guide.md:7,22,31` vs `docs/modules/accueil/specs.md` (tableau états, ligne « SOUL absente ») vs GAP-20.

**Constat :** Le guide utilisateur affirme — avec des exemples concrets (« Consulte la version de ta SOUL (ex. : "v3") affichée en haut ») — que la version SOUL est visible sur l'Accueil. La spec module (reverse, code fait foi) constate explicitement que `dashboard.soul` est agrégé côté backend mais **non rendu dans `Dashboard.tsx`** : « La SOUL n'est pas affichée dans le Dashboard ». GAP-20 confirme.

**Impact :** le guide présente comme acquise une feature non atteignable (la donnée est dispo mais l'UI ne l'affiche pas). Un utilisateur irait chercher une information absente de l'écran.

**À trancher :** PM / Lead Dev — soit câbler le rendu de la version SOUL dans `Dashboard.tsx`, soit corriger le guide pour supprimer les mentions d'affichage (lignes 7, 22, 31, 40, 56).

**Statut :** reste à trancher.

---

### ALERTE-02 — MINEURE : `article` utilisé dans le guide Nouvelle édition (step enquêteur)

**Source :** `docs/user/nouvelle-edition/guide.md:58` — tableau des 5 étapes, cellule « article » pour l'étape finale de l'enquêteur.

**Constat :** La charte (`charter.md`) liste « article » dans les termes à éviter (préférer « brève »). Cependant, ici « article » désigne l'étape de récupération de l'article source (clipping web), pas la brève produite. C'est un nom d'étape technique (conforme au code `STEPS` dans `checking.ts`), pas un synonyme de « brève ».

**Évaluation :** écart formel léger ; la charte vise principalement l'usage du mot comme synonyme de « brève ». Ici le contexte est distinct (source web). Néanmoins, une formulation alternative (« source », « contenu web ») serait plus strictement conforme.

**À trancher :** PM / Doc — corriger ou considérer l'exception acceptable.

---

### ALERTE-03 — MINEURE : `Newsletter` dans le guide Nouvelle édition

**Source :** `docs/user/nouvelle-edition/guide.md:119` — « Newsletter enregistrée dans le wiki ».

**Constat :** La charte dit préférer « édition » à « newsletter ». Cette occurrence reproduit probablement le libellé du toast UI ou de l'étape d'archivage telle qu'elle apparaît dans l'app. S'il s'agit d'un libellé exact de l'UI (`archiveOutputSchema`), le reproduire est correct selon la charte (les messages UI sont reproduits verbatim). S'il s'agit d'une paraphrase, « édition » est préférable.

**À trancher :** vérifier le label exact de l'étape dans `Archived.tsx`.

---

### ALERTE-04 — MINEURE : `ton` dans le guide Commandes

**Source :** `docs/user/commands/guide.md:43` — « Pour ajuster la voix ou le style des brèves ».

**Constat :** L'usage de « voix » est acceptable selon la charte (« plume : style, voix, ton — acceptable aussi »). Pas d'alerte. Signalé pour mémoire.

---

## 3. Liens cassés

**Résultat de la vérification exhaustive :** aucun lien cassé détecté.

Tous les fichiers référencés en « Voir aussi » dans les 7 guides existent sur le disque :
- `../accueil/guide.md` ✓
- `../nouvelle-edition/guide.md` ✓
- `../historique/guide.md` ✓
- `../soul/guide.md` ✓
- `../agents/guide.md` ✓
- `../commands/guide.md` ✓
- `../reglages/guide.md` ✓

Tous les fichiers `docs/project/*.md` (architecture, implementation, security, tests, specs, vision, modules) existent. Tous les dossiers `docs/modules/<m>/` contiennent bien `specs.md`, `architecture.md`, `implementation.md`, `tests.md` pour les 7 modules.

---

## 4. Terminologie — conformité à la charte

| Terme cible | Occurrence correcte dans les guides | Écart constaté |
|---|---|---|
| brève (pas article/post/item) | systématique dans tous les guides ✓ | Voir ALERTE-02 (étape enquêteur, contexte spécifique) |
| édition (pas newsletter/document) | systématique ✓ | Voir ALERTE-03 (label UI possible) |
| SOUL (pas profil/prompt) | systématique ✓ | — |
| échantillon (pas sample/exemple) | systématique ✓ | — |
| enquêteur (pas sous-agent/worker) | systématique ✓ | — |
| rédacteur (pas LLM/agent de rédaction) | systématique ✓ | — |
| sceptique (pas vérificateur) | systématique ✓ | — |
| plume (pas voix seul / ton seul) | utilisé ✓, alternatives ok | — |
| vue (pas page/écran/onglet) | systématique ✓ | — |
| Accueil (pas Dashboard) | aucune occurrence de « Dashboard » dans les guides ✓ | — |
| Réglages (pas Settings/Configuration) | aucune occurrence de « Settings » dans les guides ✓ | — |
| Historique (pas Archive/Journal) | systématique ✓ | — |
| **Termes interdits** (IPC, handler, store, Zustand, asar, endpoint, composant, SDK, permissionMode) | **aucune occurrence dans les 7 guides** ✓ | — |
| Tutoiement systématique | vérifié sur l'ensemble des guides ✓ | — |

**Verdict terminologie : conforme à la charte** — deux alertes mineures (ALERTE-02, ALERTE-03) à trancher.

---

## 5. Couverture des modules

| Module | Guide `docs/user/` | Dossier `docs/modules/` (4 fichiers) | Couverture dans `specs.md` global |
|---|---|---|---|
| accueil | ✓ | ✓ (specs + arch + impl + tests) | US-01 ✓ |
| nouvelle-edition | ✓ | ✓ (specs + arch + impl + tests) | US-02 à US-06 ✓ |
| historique | ✓ | ✓ (specs + arch + impl + tests) | US-09 (implicite) ✓ |
| soul | ✓ | ✓ (specs + arch + impl + tests) | US-07, US-08 ✓ |
| agents | ✓ | ✓ (specs + arch + impl + tests) | US-10 ✓ |
| commands | ✓ | ✓ (specs + arch + impl + tests) | US-11 ✓ |
| reglages | ✓ | ✓ (specs + arch + impl + tests) | US-12 (implicite) ✓ |
| socle (fondations) | non (hors scope manuel) | dans `docs/project/` ✓ | — |

**Couverture complète sur les 7 modules.** Pas de trou identifié.

---

## 6. Synthèse des 25 gaps (REVERSE_GAPS.md)

### Par type

| Type | Count | Gaps |
|---|---|---|
| divergence | 8 | GAP-03, 04, 05, 07, 19, 20, 21, 23 |
| sécurité | 5 | GAP-02, 12, 13, 14, 15 |
| edge-case | 5 | GAP-09, 17, 22, 24, 25 |
| config | 2 | GAP-01, 11 |
| intention | 2 | GAP-08, 10 |
| dead-code | 1 | GAP-06 |
| tests | 1 | GAP-16 |
| accessibilité | 1 | GAP-18 |

### Par sévérité (Doc Reviewer — impact sur la compréhension utilisateur)

**Bloquants pour la compréhension (incohérence doc ↔ code) :**

| Gap | Observation | Impact manuel |
|---|---|---|
| **GAP-20** | `Dashboard.soul` agrégé mais non rendu : la version SOUL n'est pas affichée sur l'Accueil | **Le guide accueil ment** (ALERTE-01 — à corriger dans guide ou dans le code) |
| **GAP-17** | Pas d'onboarding au 1er lancement si chemins invalides : état cassé silencieux | Guide Réglages couvre bien le cas ; la mention « démarre par Réglages » dans README.md l'adresse partiellement |
| **GAP-06** | `corr: 0` hardcodé | Guide accueil le documente comme « comportement connu » — résolu dans le guide |

**Cosmétiques (pas d'impact sur compréhension) :**

| Gap | Observation |
|---|---|
| GAP-03 | `window.breves` alias rétro-compat — interne, invisible utilisateur |
| GAP-04 | Vues `detail`/`reader` hors-routeur — non impactant pour le manuel |
| GAP-05 | Versioning SOUL implicite — guide le mentionne correctement (`vN` affiché) |
| GAP-07 | `SENTINEL_STEPS` dupliqué — risque technique, invisible utilisateur |
| GAP-08 | Mode ciblé heuristique — documenté dans le guide nouvelle-edition |
| GAP-09 | Plafond 15 sujets non contraint côté code — guide le mentionne correctement |
| GAP-11 | CLI force `repoDir = cwd` — hors scope manuel |
| GAP-19 | Thème non exposé — non mentionné dans les guides (correct) |
| GAP-21 | Double modèle SOUL — risque technique, invisible utilisateur |
| GAP-22 | Échantillon §5 non persisté si oubli — guide le documente explicitement via la note « Attention » |
| GAP-23 | Bouton Quitter absent — canal IPC orphelin, non mentionné dans le guide (correct) |

**Sécurité (hors scope manuel utilisateur — signalé pour architecte) :**
GAP-02 (bypassPermissions), GAP-12 (CSP absente), GAP-13 (DevTools prod), GAP-14 (escapeHtml partiel), GAP-15 (sandbox non explicite)

**Tests / qualité (hors scope manuel) :**
GAP-16 (pages React non testées), GAP-18 (accessibilité CSS)

**Config / intention (hors scope manuel) :**
GAP-01 (chemins hardcodés mono-utilisateur), GAP-10 (MCP BoilingBrain dépendance externe), GAP-24, GAP-25

---

## 7. Verdict global de cohérence

### 🟡 Cohérence globale : écarts mineurs — un point critique à trancher

**Points saillants :**

1. **ALERTE CRITIQUE (GAP-20 vs guide accueil)** : le guide `accueil/guide.md` décrit la version SOUL comme visible sur l'Accueil (lignes 7, 22, 31, 40, 56), alors que le code (`Dashboard.tsx`) ne rend pas `dashboard.soul`. Feature documentée ≠ feature atteignable. À trancher : corriger le guide ou câbler le rendu.

2. **Terminologie homogène et conforme** : les 7 guides respectent intégralement la charte — tutoiement, vocabulaire normé, zéro terme interdit. Niveau de conformité excellent.

3. **Couverture complète** : 7 modules ont guide utilisateur + dossier technique (4 fichiers) + couverture dans `specs.md` global. Aucun trou de couverture.

4. **Liens cassés : zéro** — tous les renvois « Voir aussi » pointent vers des fichiers existants.

5. **Gaps documentés mais non résolus** : 25 gaps restent ouverts dans `REVERSE_GAPS.md`. Le seul qui génère une incohérence entre la doc utilisateur et la réalité du code est GAP-20 (ALERTE-01). Les autres sont soit correctement documentés, soit hors scope du manuel utilisateur.
