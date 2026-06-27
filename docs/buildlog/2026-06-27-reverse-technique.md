# reverse-technique (build log) : couche technique de la doc Brèves IA

**Date** : 2026-06-27
**Spec** : rôle `reverse-technique` (MCP `factory`, driver Cycle R) + base `reverse-base` + templates forward (`architecture-global`, `implementation-global`, `security`, `tests-strategy`)
**Plan** : déléguer les 4 livrables techniques aux agents forward en posture reverse, à partir de la cartographie validée
**Objectif** : produire `architecture.md`, `implementation.md`, `security.md`, `tests.md` — uniquement le livré, chaque assertion tracée
**Statut** : livré — **2 passes** : (1) brouillon driver après échec d'infra des délégations ; (2) **reprise réussie en déléguant aux vrais agents forward** (Architecte/Lead Dev/Security/QA) qui ont produit les versions autoritaires

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Architecture | `docs/project/architecture.md` | Composants + déploiement (Mermaid), entités=fichiers (pas SQL), séquences verify/archive, patterns, modules repliés |
| Implémentation | `docs/project/implementation.md` | IPC (pas REST), `ApiResult`/`SaveResult`, table des 20 canaux, Zod in/out, conventions |
| Sécurité | `docs/project/security.md` | App locale, bypassPermissions, hardening Electron, XSS/rendu, packaging macOS ; RLS/CORS/rate-limit « sans objet » |
| Tests | `docs/project/tests.md` | 48 tests, SDK mocké par injection, invariants DS, smoke-boot, pas de seuil ni de CI |
| Handoff | `docs/followup/_HANDOFF_reverse-technique.md` | Passation → Reverse Fonctionnel |
| Gaps ajoutés | `docs/REVERSE_GAPS.md` | GAP-12→16 (CSP absente, DevTools prod, escapeHtml guillemets, sandbox implicite, couverture) |

## Validation RÉELLE

- ✅ 4 fichiers techniques créés sous `docs/project/` (vérifié : absents avant, présents après).
- ✅ Faits vérifiés par lecture directe avant rédaction : `src/main/index.ts` (webPreferences `contextIsolation:true`, DevTools F12, smoke `BREVES_SMOKE`), `src/renderer/index.html` (aucune CSP, fonts distantes), `src/domain/format.ts` (escapeHtml `&<>` seulement), `src/domain/edition.ts:25-110` (échappement via `inlineMd`), `build/entitlements.mac.plist`.
- ✅ Tests : `vitest.config.mjs` sans bloc coverage (confirmé), `.github/workflows` **absent** (confirmé), hook `.husky/pre-commit` = `typecheck && lint && test`. Comptes réels : domain 11, main 11, renderer 9, ui 12, shared 4, alias 1 = **48**.
- ✅ UI testée par `renderToStaticMarkup` (SSR), SDK mocké via `query` injecté (`tests/main/llm.service.test.mjs`).
- 🔴 **Délégations forward échouées** : 4 agents spawnés (Architecte/Lead Dev/Security/QA) — 2 partiels (lecture seule), 2 non démarrés ; cause = classifieur `claude-opus-4-8[1m]` indisponible + limite de session. Aucun fichier écrit par eux.

## Gotchas de la passe

- **Templates web/SaaS vs app Electron** : les templates forward supposent SQL/RLS/REST/auth/CORS. Adaptés au réel (IPC, Zod, fichiers, pas de serveur) ; absences signalées « sans objet » plutôt qu'inventées.
- **Échec de délégation → bascule en rédaction directe** : le driver a produit les livrables lui-même à partir de la cartographie déjà tracée, en conservant la posture reverse. Tracé dans chaque fichier et dans le handoff.
- **Correction de compte** : l'estimation initiale « 54 tests » de la cartographie était haute ; recompte réel = **48**. Corrigé dans `tests.md`.
- **Précision sécurité** : ne pas surévaluer le risque XSS — l'échappement `inlineMd` est bien appliqué ; le résidu réel (guillemets non échappés) est consigné en GAP-14 (sévérité basse), pas dramatisé.

## Décisions / restes

- **Décidé** : modules repliés dans la doc globale (pas de `docs/modules/[m]/`) ; sécurité = posture locale assumée (bypassPermissions documenté, pas corrigé).
- **Restes** : 5 nouveaux gaps (GAP-12→16) à arbitrer par le PM/Lead Dev/Security ; option de re-déléguer une revue forward (Architecte/Security) quand le classifieur sera rétabli.
- **Prochaine étape** : « Prends le role de Reverse Fonctionnel et documente la couche fonctionnelle de Brèves IA ».
