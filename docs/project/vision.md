# Vision & Découverte — Brèves IA

> Framework : reverse (constat) · cartographié à `4ce7095`
> Généré par : Product Discovery (Cycle 0) — mode reverse
> Fichier cible : `docs/project/vision.md`

---

## Le problème

**Problème résolu :** Pierre (VP Engineering, référent IA chez Merim) décrypte régulièrement l'actualité IA pour ses collègues PM. Produire ces brèves de façon régulière, fiable et dans une voix éditoriale cohérente est coûteux en temps : il faut vérifier les faits (l'actu IA est dense en erreurs et en hype), rédiger dans une plume précise, puis archiver dans le wiki personnel pour capitaliser.

**Situation actuelle (avant l'outil) :** Production manuelle ad-hoc, en dehors de tout système. Risque d'invention ou d'imprécision factuelle, difficulté à tenir une cadence, et aucune capitalisation structurée de la plume ni des sources dans le wiki.

**Pourquoi maintenant :** L'actu IA s'est accélérée (volume, vélocité, risque d'erreur). Le Claude Agent SDK rend possible un fan-out de vérification parallèle + une rédaction guidée par une plume codifiée (SOUL). L'écosystème BoilingBrain (wiki + MCP `drop_to_raw` + `/ingest`) permet l'archivage structuré. Les briques techniques étaient disponibles et matures au moment du développement (2026-06-24/27, v1.0.0).

---

## Les utilisateurs

### Utilisateur principal (opérateur)

**Persona :** Pierre, VP Engineering / référent IA, Merim
**Quotidien :** Suit l'actualité IA, rédige et publie une newsletter interne de brèves pour ses collègues PM. Utilise Claude Code et l'écosystème BoilingBrain au quotidien.
**Niveau numérique :** Expert (CLI, chemins de fichiers, configuration YAML/JSON, binaire `claude`, Node)
**Plateforme principale :** macOS (Apple Silicon, app de bureau locale)
**Motivation principale :** Publier régulièrement une newsletter IA fiable, à sa voix, sans y passer des heures et sans introduire d'erreurs factuelles.
**Frustration principale :** Le volume d'actu IA rend la vérification manuelle très longue ; maintenir une plume cohérente sur la durée est difficile sans support éditorial structuré.

> Décision PM en interview : L'opérateur principal est Pierre, VP Engineering / référent IA (cf. SOUL §1), qui décrypte l'actu IA et publie une newsletter à voix assumée.

### Utilisateurs secondaires (audience / lecteurs)

| Persona | Rôle | Besoin spécifique |
|---------|------|------------------|
| PM Merim | Product Manager non-spécialiste IA | Recevoir des brèves fiables, denses, lisibles en quelques secondes, sans jargon gratuit |

> Décision PM en interview : L'audience des brèves = PM Merim non-spécialistes IA, peu de temps (SOUL §2). Les PM sont des lecteurs finaux, pas des utilisateurs de l'outil.

### Hors cible (explicite)

- **Distribution SaaS / externe** : l'outil est perso/interne Merim, pas destiné à être vendu ni distribué à des tiers.
- **Utilisateurs non techniques voulant zéro config** : l'app requiert un binaire `claude` installé, un `repoDir`/`bbDir` configurés, Node ≥ 22 — profil CLI assumé.
- **Rédacteurs multiples (v1)** : le multi-rédacteurs/multi-SOUL est explicitement différé en v2.

> Décision PM en interview : Outil perso/interne (Merim). Pas de distribution/vente externe.

---

## Vision produit

**En une phrase :** Brèves IA est un compagnon de bureau local (Electron, macOS) qui pilote le Claude Agent SDK pour vérifier des sujets d'actualité IA, les rédiger dans la plume de Pierre (SOUL), et les archiver dans le wiki BoilingBrain — permettant à un VP Engineering de tenir une cadence de newsletter fiable sans y passer des heures.

**Métriques de succès à 12 mois :**

| Métrique | Cible qualitative | Comment mesurer |
|----------|------------------|----------------|
| Régularité de publication | Cadence tenue sur la durée (pas de loupé prolongé) | Fréquence des éditions dans `raw/notes/` du wiki |
| Fidélité à la plume | Les brèves sonnent comme Pierre (SOUL respectée) | Relecture manuelle ; absence de signaux de correction récurrents dans le journal §6 |
| Fiabilité factuelle | Zéro fait inventé ; les non-confirmés sont marqués `non_verifie` | Absence d'alertes de correction post-publication ; présence du garde-fou dans le code (`outputs.ts:4`) |

> Décision PM en interview : métriques = régularité de publication, fidélité à la plume, fiabilité factuelle.
> Note : cet outil est interne, sans analytics applicatif. Les métriques sont observées manuellement.

**Proposition de valeur différenciante :**
Un profil éditorial codifié (SOUL — 6 sections : voix, audience, tics, lignes rouges, échantillons vivants, journal d'évolution) guidant un sous-agent rédacteur (modèle opus, aucun outil), combiné à un fan-out de vérification parallèle (jusqu'à 15 enquêteurs simultanés) et une passe sceptique adversariale. La SOUL est vivante : elle évolue à chaque édition validée (§6), curatée manuellement (§5).

**Alternatives existantes :**

| Alternative | Pourquoi insuffisante |
|-------------|----------------------|
| Rédaction manuelle + recherche web | Trop long, risque d'erreur, pas de capitalisation de la plume |
| Prompt Claude générique | Aucune codification de la voix, aucune vérification parallèle, aucun archivage structuré |
| Outils de curation de veille (newsletters tierces) | Voix externe, pas de personnalisation, pas d'intégration wiki BoilingBrain |

---

## Périmètre v1

### Dans le scope (briques actives à `4ce7095`)

| Fonctionnalité | Priorité | Trace |
|----------------|----------|-------|
| Pipeline 3 phases : verify / draft / archive | Must | `_REVERSE_RECONCILIATION.md` — toutes briques « actif » |
| Fan-out vérification parallèle (≤15 sujets) via sous-agent `enqueteur` (opus, WebSearch/WebFetch) | Must | `.claude/commands/breves-verify.md:17`, `.claude/agents/enqueteur.md` |
| Passe sceptique adversariale (`off\|ciblé\|toujours`) via sous-agent `sceptique` (sonnet) | Should | `.claude/agents/sceptique.md`, `_REVERSE_RECONCILIATION.md` |
| Rédaction dans la SOUL via sous-agent `redacteur` (opus, aucun outil) ou inline | Must | `.claude/agents/redacteur.md`, `.claude/commands/breves-draft.md` |
| Archivage dans wiki BoilingBrain (note + clippings + MAJ SOUL §6) | Must | `.claude/commands/breves-archive.md`, `src/main/engine.ts:archiveAndIngest` |
| SOUL éditable (§1-4 texte, §5 échantillons manuels ≤3, §6 journal datés) | Must | `src/domain/soul.ts`, pages `Soul/EchEditions/EchBreves` |
| Suivi live de vérification (sentinelles `«BREVES»`, 5 étapes par sujet) | Must | `src/domain/checking.ts`, `hooks/useCommandStream.ts` |
| Vues configuration : Agents, Commands, Settings (chemins bbDir/repoDir/claudeBin) | Should | pages `Agents/Commands/Settings`, `src/main/io/config.ts` |
| Historique / lecteur des éditions archivées | Should | pages `History/Reader`, `src/main/io/editions.io.ts` |
| CLI hors UI (`npm run breves verify/draft/archive`) | Could | `scripts/breves-cli.ts` |
| Packaging macOS DMG (signing ad-hoc) | Must | `forge.config.ts`, `out/make/` |
| Design system + Storybook (14 primitives, couverture stories) | Should | `src/renderer/components/ui/`, `.storybook/` |

### Hors scope v1 (explicite)

| Fonctionnalité | Raison d'exclusion | Version cible |
|----------------|-------------------|---------------|
| Multi-rédacteurs / multi-SOUL (plusieurs plumes, plusieurs newsletters) | Architecture mono-utilisateur ; complexité non traitée | v2 |
| Distribution externe / SaaS | Outil perso interne ; hors cible assumée | Jamais |
| Planification automatique / scheduling | Non spécifié, non développé | À définir |
| Notarisation Apple (Developer ID) | Non prioritaire pour usage interne mono-poste | À définir |
| CI cloud (GitHub Actions ou équivalent) | Seul hook pre-commit Husky en v1 (`GAP-16`) | À définir |
| Tests des pages React et du preload | Non couvert en v1 (`GAP-16`) | À définir |

### Roadmap indicative

- **v1 (livré — `4ce7095`)** : pipeline 3 phases, SOUL éditable, vues config, historique/lecteur, packaging DMG, CLI hors UI.
- **v2** : multi-rédacteurs / multi-SOUL (plusieurs plumes, plusieurs newsletters) — intention confirmée en interview.
- **Vision long terme** : capitalisation éditoriale et wiki croisés entre plusieurs contributeurs Merim ; éventuelle intégration dans un workflow BoilingBrain plus large.

> Décision PM en interview : vision 12 mois = ouvrir vers multi-rédacteurs / multi-SOUL (plusieurs plumes/newsletters) → roadmap v2.

---

## Contraintes non-négociables

| Contrainte | Type | Détail |
|------------|------|--------|
| App locale macOS mono-utilisateur | Architecturale | Electron, pas de serveur, pas d'auth applicative (`README.md`, `_REVERSE_MAP.md §1`) |
| Node ≥ 22 | Technique | `package.json:6-8`, `.nvmrc:1` — imposé par le SDK et la gate pre-commit |
| Dépendance binaire `claude` | Technique | `src/main/io/env.ts:claudeBin` — le Claude Agent SDK utilise le binaire local avec ses identifiants |
| Dépendance repo BoilingBrain + MCP wiki | Technique | `bbDir` requis pour archivage (`raw/`) et MCP `boiling-brain-wiki` ; script Python fastmcp (`GAP-10`) |
| Signing ad-hoc (non notarisé) | Technique / déploiement | Hardened-runtime désactivé + strip quarantaine requis au 1er lancement (`scripts/install-local.sh:51-53`, mémoire `macos-signing-quarantine.md`) |
| SDK `@anthropic-ai/claude-agent-sdk` externalisé hors asar | Technique | Utilise `import.meta.url` + fork/spawn → `extraResource` obligatoire (`forge.config.ts:13-18`, `vite.main.config.ts:18`) |
| `permissionMode: 'bypassPermissions'` hardcodé | Posture assumée | App locale de confiance, le SDK exécute les outils sans confirmation (`llm.service.ts:113-121`, `GAP-02`) |

### Contraintes réglementaires

- **Données personnelles :** usage interne Merim uniquement — les brèves traitent de l'actu IA publique, pas de données personnelles de tiers. Aucune collecte applicative.
- **IA dans le produit :** oui — agents Claude (enquêteur opus, sceptique sonnet, rédacteur opus) pilotés par le Claude Agent SDK. Usage interne, non soumis à obligation de déclaration externe. Pertinent pour une lecture AI Act usage interne (bas risque).
- **Domaine réglementé :** non.
- **Obligations connues :** aucune identifiée (usage interne, pas de traitement de données personnelles, pas de déploiement public).

---

## Risques et inconnues

| # | Risque / Inconnue | Impact | Hypothèse à valider |
|---|-------------------|--------|---------------------|
| 1 | **Fidélité de la SOUL au fil du temps** : le journal §6 peut dériver si les leçons proposées sont acceptées sans soin — la plume se dégrade progressivement. | Élevé | La gate « propose puis confirme » (UI `wantSoulLesson`) est suffisante pour filtrer les leçons mal formulées. |
| 2 | **Fiabilité du fan-out d'enquête** : un sous-agent enquêteur peut rater une source payante, se rabattre sur un repli de moindre qualité, ou halluciner un fait dans le clipping. | Élevé | Le garde-fou `non_verifie` + la passe sceptique en mode `ciblé` couvrent les cas critiques. À valider sur un corpus de sujets réels. |
| 3 | **Mode ciblé du sceptique laissé au jugement du LLM** (`GAP-08`) : le critère d'activation (chiffres, superlatifs, records) est heuristique, non déterministe. | Moyen | Accepté comme posture LLM-judge intentionnelle ; peut rater des cas limites. |
| 4 | **Dépendance externe forte au MCP BoilingBrain** (`GAP-10`) : la chaîne d'archivage est inopérante si le script Python ou le repo `bbDir` est indisponible. | Élevé | Dépendance assumée de l'écosystème ; pas de fallback en v1. |
| 5 | **Portabilité des chemins hardcodés** (`GAP-01`) : les défauts `env.ts:20-24` pointent sur la machine de Pierre ; sur un autre poste, la configuration manuelle via `.env`/Settings est requise. | Faible (outil perso) | Acceptable pour un outil mono-utilisateur perso ; à documenter si un second poste est envisagé. |
| 6 | **Régularité de publication** : le risque principal n'est pas technique mais humain — si Pierre ne lance pas l'outil régulièrement, la valeur ne se réalise pas. | Élevé | L'outil doit être suffisamment fluide (UX) pour ne pas être perçu comme une friction. |

---

## Hypothèse principale

**Une plume éditoriale codifiée (SOUL §3-5) peut être répliquée fidèlement par le sous-agent rédacteur (LLM opus, aucun outil) — c'est le cœur de valeur de Brèves IA.**

Si cette hypothèse s'avère fausse (le LLM produit systématiquement des brèves qui ne sonnent pas comme Pierre, malgré les échantillons §5 et les corrections §6), le pipeline de rédaction perd son intérêt différenciant et retombe sur un usage générique de Claude.

La SOUL vivante (§5 curation manuelle, §6 journal daté) est le mécanisme de correction continue de cette hypothèse : chaque feedback enregistré la renforce ou révèle ses limites.

> Décision PM en interview : hypothèse principale déduite — la plume éditoriale codifiée (SOUL §3-5) peut être répliquée fidèlement par le LLM/sous-agent rédacteur.
