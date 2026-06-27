# reverse-fonctionnel (build log) : couche fonctionnelle de la doc Brèves IA

**Date** : 2026-06-27
**Spec** : rôle `reverse-fonctionnel` (MCP `factory`, driver Cycle R) + base `reverse-base` + agents forward `product-discovery`, `po-global` + templates `vision`, `specs-global`, `modules`
**Plan** : interview ciblée (vente/distribution, cap 12 mois) → déléguer vision/specs/modules aux agents forward en posture reverse
**Objectif** : produire `vision.md`, `specs.md`, `modules.md` — uniquement le livré, chaque US tracée, découpage formalisé depuis la carte validée
**Statut** : livré

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Vision | `docs/project/vision.md` (160 l) | Cadrage interne (outil perso) ; personas Pierre/PM Merim ; périmètre v1 livré ; multi-SOUL en v2 |
| Specs | `docs/project/specs.md` (518 l) | 14 US tracées, 2 parcours Mermaid, 11 règles métier, 14 cas d'erreur, transverses |
| Modules | `docs/project/modules.md` (209 l) | 8 modules formalisés (socle + 7 sections), objectif/périmètre/hors-périmètre/dépendances/priorité |
| Handoff | `docs/followup/_HANDOFF_reverse-fonctionnel.md` | Passation → Reverse Utilisateur |
| Gap ajouté | `docs/REVERSE_GAPS.md` | GAP-17 (état cassé au 1er lancement si chemins invalides) |

## Validation RÉELLE

- ✅ Interview ciblée menée (4 questions) AVANT rédaction, conformément à la posture du rôle : distribution=perso/interne, opérateur=Pierre VP Eng, cap=multi-SOUL, succès=régularité+fidélité plume+fiabilité.
- ✅ Délégation aux **vrais agents forward** (`product-discovery`, `po-global` ×2) chargés via `factory.get_prompt`, adoptés sous override `reverse-base`, interview transmise en input (les sous-agents n'interviewent pas).
- ✅ 3 fichiers créés sous `docs/project/` (vérifié : absents avant, présents après — vision 160 l, specs 518 l, modules 209 l).
- 🔴 1re tentative `specs.md` rejetée/interrompue par le PM ; **relancée à l'identique** → produite (518 l). vision.md et modules.md non affectés.

## Gotchas de la passe

- **Template `vision` orienté vente** : adapté à un OUTIL PERSO INTERNE (pas d'argumentaire commercial, hors-cible = distribution externe). Métriques de succès qualitatives, pas de chiffres d'analytics fabriqués.
- **Posture interview respectée** : la partie forward-looking de la vision (cap 12 mois, risques) vient de l'interview, pas d'une invention de l'agent ; la partie reconstructible vient du sillage + code.
- **modules.md = mise en forme, pas détection** : le découpage vient de `_REVERSE_MODULE_MAP.md` validé par le PM ; le PO formalise seulement (D1-D5 référencées).

## Décisions / restes

- **Décidé (interview)** : outil perso/interne ; v1 = 3 phases + SOUL + vues config ; v2 = multi-rédacteurs/multi-SOUL (pas encore spécifié).
- **Restes** : GAP-17 (onboarding 1er lancement) + D3/D5 du module map encore « proposé » (page socle distincte, design system dans socle) — à confirmer ; aucune spec v2 n'existe (intention seulement).
- **Prochaine étape** : « Prends le role de Reverse Utilisateur et documente le manuel utilisateur de Brèves IA ».
