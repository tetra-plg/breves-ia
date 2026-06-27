# REVERSE_GAPS — Brèves IA

> Registre des zones d'ombre rencontrées pendant la cartographie. **Non comblées par hypothèse** :
> chacune attend un arbitrage. `type` ∈ {intention, divergence, dead-code, config, edge-case, sécurité}.

## Journal de résolution (2026-06-27)

Passe de correction du code (branche `docs/reverse-documentation`) — vérifiée par la suite de tests
(49 fichiers, 216 tests verts) :

| # | Statut | Résolution |
|---|---|---|
| GAP-03 | ✅ **résolu** | Alias `window.breves` retiré (`preload/index.ts`, `window.d.ts`, `api.ts`) — il n'était consommé nulle part. |
| GAP-07 | ✅ **résolu** | `SENTINEL_STEPS` réutilise désormais `checking.STEPS` (`edition.ts`) — plus de duplication. |
| GAP-13 | ✅ **résolu** | DevTools (F12 / Cmd-Alt-I) câblés uniquement si `!app.isPackaged` (`index.ts`). |
| GAP-14 | ✅ **résolu** | `srcLink` utilise un nouvel `escapeAttr` (échappe aussi `"`/`'`) pour `data-url` (`format.ts`, `edition.ts`) + test. |
| GAP-15 | ✅ **résolu** | `webPreferences` explicites : `nodeIntegration:false`, `sandbox:true` (défauts sécurisés rendus explicites). *Smoke visuel `npm start` recommandé avant release.* |
| GAP-19 | ⛔ **faux positif** | Le sélecteur de thème existe bien (`Shell.tsx:63`, appelle `toggleTheme`). L'agent UX ne l'avait pas vu. |
| GAP-23 | ⛔ **faux positif** | Le bouton **Quitter** existe dans le header (`Shell.tsx:66`), pas dans Settings — l'agent module n'avait regardé que `Settings.tsx`. |
| GAP-24 | ✅ **résolu** | Payloads `save-agent`/`save-command` validés par Zod (`shared/schemas/edits.ts`) avant le moteur + tests. |
| GAP-25 | ✅ **résolu** | Vues Agents/Commands/Settings gèrent un état d'erreur de chargement (`.catch`) au lieu d'un « Chargement… » infini. |

**Restent ouverts** (décisions produit ou changements à plus fort risque, non traités dans cette passe) :
GAP-01, GAP-02, GAP-05, GAP-06, GAP-08, GAP-09, GAP-10, GAP-11, GAP-12 (CSP — risque de casser les polices/`dangerouslySetInnerHTML`),
GAP-16 (CI/couverture), GAP-17 (onboarding 1er lancement), GAP-18 (accessibilité), GAP-20 (doc alignée ; reste : afficher ou retirer la SOUL du dashboard),
GAP-21 (refactor double modèle SOUL), GAP-22 (persistance échantillon).

---

| # | type | observation | localisation | hypothèse (non validée) | à trancher par |
|---|---|---|---|---|---|
| GAP-01 | config | Les **défauts de chemins sont hardcodés** sur la machine de Pierre (`/Users/pleguern/...`) — non portables pour un autre utilisateur ; idem chemins du MCP wiki (venv Python + script). | `src/main/io/env.ts:20-24,47-48` | Acceptable car app perso mono-utilisateur ; un autre poste passe par `.env`/Settings. | PM (produit) |
| GAP-02 | sécurité | `permissionMode:'bypassPermissions'` + `allowDangerouslySkipPermissions:true` **hardcodés** : le SDK exécute des outils (Bash, Write, MCP) sans aucune confirmation. | `src/main/services/llm.service.ts:113-121` | Intentionnel (app locale de confiance pilotant son propre Claude). À confirmer comme posture assumée. | PM / Security |
| GAP-03 | divergence | Alias rétro-compat **`window.breves`** annoncé « Phase 4 removal » dans le sillage mais **toujours présent** à HEAD. | `src/preload/index.ts:35-36` | Oubli de nettoyage ; à retirer ou à documenter comme API stable. | PM / Lead Dev |
| GAP-04 | divergence | Vues **`detail` et `reader` absentes du `const VIEWS`** (`navigation.ts`) mais câblées dans le registry `App.tsx` et atteintes par `setView` direct → hors du routeur `nextView`. | `src/domain/navigation.ts:1-4` vs `src/renderer/App.tsx:22-37` | Choix assumé (sous-vues ouvertes par action directe) ; incohérence de modèle, pas un bug. | Lead Dev |
| GAP-05 | divergence | **Versioning SOUL implicite** : `v{journal.length+1}` calculé en double (domain `soul.ts:67` ET commande `breves-archive`). Pas de source de vérité unique du numéro de version. | `src/domain/soul.ts:67`, `.claude/commands/breves-archive.md` | Fragile si la logique diverge ; intention = numéro = nb de leçons +1. | PM |
| GAP-06 | dead-code | `EditionSummary.corr` **toujours à `0`** (jamais calculé) alors que l'UI peut l'afficher. | `src/main/io/editions.io.ts:37` | Placeholder/legacy d'une feature « nb de corrections » non finie. | Lead Dev |
| GAP-07 | divergence | `SENTINEL_STEPS` (`edition.ts:194`) **duplique** `STEPS` (`checking.ts:3`) au lieu de le réutiliser → **risque de drift** si l'une change. | `src/domain/edition.ts:194`, `src/domain/checking.ts:3` | Copie par commodité ; devrait référencer la constante unique. | Lead Dev |
| GAP-08 | intention | Le **mode `ciblé` du sceptique** (« affirmations fortes : chiffres, superlatifs, records ») est défini en prose dans le prompt, sans règle déterministe. Critère d'activation laissé au jugement de l'agent. | `.claude/agents/sceptique.md`, `.claude/commands/breves-verify.md:22-27` | Volontairement heuristique (LLM-judge). À documenter comme tel. | PM |
| GAP-09 | edge-case | Le **plafond de 15 sujets** en parallèle (fan-out enquêteur) est fixé en prose dans le prompt, non appliqué côté code (pas de validation `topics.length<=15`). | `.claude/commands/breves-verify.md:17` | Limite douce non contrainte ; au-delà, comportement non spécifié. | PM / Lead Dev |
| GAP-10 | intention | Le **MCP `boiling-brain-wiki`** (archivage `drop_to_raw` + `/ingest`) est une dépendance externe forte non versionnée dans ce dépôt (script Python dans `bbDir`). La chaîne d'archivage est inopérante sans lui. | `src/main/io/env.ts:44-50`, `.claude/commands/breves-archive.md` | Dépendance assumée de l'écosystème BoilingBrain. À documenter comme prérequis d'intégration. | PM / Architecte |
| GAP-11 | config | Le **CLI `npm run breves`** force `repoDir = cwd` et reconstruit `wikiMcp`/`bbDir` indépendamment de `config.json` (n'utilise pas la config persistée de l'app). | `scripts/breves-cli.ts:4-5` | Chemin de dev distinct de l'app packagée ; cohérent mais non documenté. | Lead Dev |
| GAP-12 | sécurité | **Aucune CSP** définie et la page charge des **polices distantes** (Google Fonts). Pas de `<meta Content-Security-Policy>` ni `onHeadersReceived`. Sévérité **moyenne**. | `src/renderer/index.html:7-12` | Ajouter une CSP stricte + héberger les polices localement réduirait la surface XSS/exfiltration. | Security / Lead Dev |
| GAP-13 | sécurité | **DevTools activable en production** via F12 / Cmd-Alt-I. Sévérité **basse** (app locale). | `src/main/index.ts:35-41` | Pratique en dev ; à conditionner à `!app.isPackaged` si on veut le fermer en prod. | Lead Dev |
| GAP-14 | sécurité | `escapeHtml` **n'échappe pas les guillemets** (`"`/`'`, seulement `& < >`). Une URL contenant `"` interpolée dans un `href` par `srcLink` pourrait casser l'attribut. Sévérité **basse** (contenu semi-fiable, rendu local). | `src/domain/format.ts:3-5`, `src/domain/edition.ts:58,89` | Échapper aussi `"`/`'`, ou valider plus strictement les URLs. | Security |
| GAP-15 | sécurité | `webPreferences` n'active pas **explicitement** `sandbox` ; `nodeIntegration` repose sur le défaut. `contextIsolation:true` est explicite. Sévérité **info**. | `src/main/index.ts:21-24` | Expliciter `sandbox:true` et `nodeIntegration:false` durcirait le renderer. | Lead Dev |
| GAP-16 | tests | **Pages React (15) et `preload` non testés directement** ; **aucun seuil de couverture** configuré ; **pas de CI cloud** (seul le hook pre-commit protège). | `vitest.config.mjs`, `.github/` absent | Ajouter des tests de pages + un seuil + une CI renforcerait le filet. | QA |
| GAP-17 | edge-case | **État cassé silencieux au 1er lancement** si `bbDir`/`repoDir`/`claudeBin` ne pointent pas vers des chemins valides (historique vide, archivage/ingest inopérants) sans onboarding qui force la configuration. Dépendance de données `reglages → historique/nouvelle-edition/soul`. | `src/main/io/editions.io.ts`, `src/main/io/env.ts:20-24`, `src/renderer/pages/Settings.tsx` | Constaté lors de la passe fonctionnelle (specs/modules). Un flux de premier lancement (onboarding chemins) éviterait les états cassés. À arbitrer pour v2. | PM / UX |
| GAP-18 | accessibilité | Plusieurs manques relevés à la reconstruction des guidelines : `outline:none` sur `[contenteditable]:focus` sans focus visible de remplacement ; pas de `prefers-color-scheme` (thème sombre 100% manuel) ; pas d'`aria-live` sur le suivi live des sentinelles ; tailles de texte fonctionnel < 11px (10/10,5px) ; `Modal.sheet` `border-radius:16px` hardcodé (pas `--radius`). | `src/renderer/styles/tokens.css:37`, `components/ui/Modal.module.css`, `layouts/Shell.tsx` | Constaté en passe utilisateur (UX Researcher). Améliorations d'accessibilité/cohérence de tokens. | UX / Lead Dev |
| GAP-19 | divergence | **Thème clair/sombre défini dans le CSS** (double jeu de tokens) mais **aucun sélecteur de thème atteignable dans l'UI** : la feature n'est pas exposée à l'utilisateur. | `src/renderer/styles/tokens.css`, `src/renderer/store/app.store.ts` (`theme`), absence de toggle dans `Shell.tsx` | Constaté en passe utilisateur. Soit câbler un sélecteur, soit documenter le thème comme non exposé. Non documenté dans le manuel (non atteignable). | PM / Lead Dev |
| GAP-20 | divergence | **`Dashboard.soul` agrégé, transmis et stocké mais jamais rendu** dans `Dashboard.tsx` : la SOUL active n'est en fait pas affichée sur l'accueil malgré la donnée disponible. | `src/main/engine.ts` (`getDashboard`), `src/renderer/store/app.store.ts:40`, `src/renderer/pages/Dashboard.tsx` | Constaté en passe module (accueil). **Doc alignée** en passe Reviewer : `accueil/guide.md` ne présente plus la SOUL comme affichée. **Reste côté code** : afficher la SOUL ou retirer la donnée morte. | PM / Lead Dev |
| GAP-21 | divergence | **Double modèle pour `SOUL.md`** : `SoulSummary` (`io/soul.io.ts`, pour le dashboard) vs `Soul` (`domain/soul.ts`, pour le module soul) — deux parseurs, risque de drift. | `src/main/io/soul.io.ts:4-17`, `src/domain/soul.ts:12-20` | Constaté en passe module (soul). Unifier ou documenter la séparation intentionnelle. | Lead Dev |
| GAP-22 | edge-case | **Échantillon §5 non persisté en cas d'oubli** : après le sous-flux ech-*, un toast invite à « Enregistrer §5 » mais rien ne force la persistance ; et `saveSoulEchantillons` ne rafraîchit pas le résumé dashboard (périmé jusqu'au prochain chargement). | `src/renderer/pages/{EchBreves,Soul}.tsx` | Constaté en passe module (soul). | PM / Lead Dev |
| GAP-23 | divergence | **Canal `quit-app` enregistré mais aucun bouton « Quitter » visible** dans `Settings.tsx` à HEAD : déclencheur UI non localisé. | `src/main/ipc/settings.handlers.ts:57-59`, `src/renderer/pages/Settings.tsx` | Constaté en passe module (reglages). Câbler le bouton ou retirer le canal. | Lead Dev |
| GAP-24 | sécurité | **Payloads d'écriture castés `as` sans validation Zod** côté handlers (`save-agent`, `save-command`) : le typage runtime n'est pas garanti (les gardes moteur captent les cas vides, mais pas par contrat). | `src/main/ipc/{agents,commands}.handlers.ts` | Constaté en passe module (agents/commands). Ajouter une validation Zod des edits. | Security / Lead Dev |
| GAP-25 | edge-case | **Vues de config en « Chargement… » indéfini** si l'IPC de lecture échoue (`getAgents`/`getCommands`/`getSettings` non `catch`és → état reste `null`). | `src/renderer/pages/{Agents,Commands}.tsx` | Constaté en passe module. Gérer l'état d'erreur de chargement. | Lead Dev |

---

## Note de méthode

- **0 hypothèse silencieuse n'a été injectée dans les livrables.** Tout point ci-dessus est exclu des
  cartes factuelles tant qu'il n'est pas tranché.
- Les briques **abandonnées** (legacy `lib/` + `hud/`, retirées en Phase 4) ne sont **pas** des gaps :
  elles sont absentes du code et explicitement consignées « retiré » dans `_REVERSE_RECONCILIATION.md`.
