# _HANDOFF — Reverse Fonctionnel → Reverse Utilisateur (Brèves IA)

> Passation de la couche fonctionnelle vers le manuel utilisateur. Mode reverse : constater, tout tracer.

## Livré (couche fonctionnelle)
- `docs/project/vision.md` (160 l) — document de **cadrage interne** (outil perso, pas de vente). Problème, personas (opérateur Pierre / lecteurs PM Merim), périmètre v1 livré, hors-scope (multi-SOUL en v2), contraintes, risques, hypothèse principale.
- `docs/project/specs.md` (518 l) — **14 US** (US-01→14) sur les 8 sections d'app, **2 parcours Mermaid** (« quoi »), **11 règles métier** (RMB-01→11), table de **14 cas d'erreur**, spécifications transverses (navigation, design system, pas d'auth), contraintes non-fonctionnelles. Chaque US tracée.
- `docs/project/modules.md` (209 l) — formalisation des **8 modules** validés (socle + 7 sections d'app) : objectif, périmètre, hors-périmètre, dépendances, priorité.

## Décisions d'interview (PM) — intégrées à la vision
- **Distribution** : outil **perso / interne** Merim (pas de vente externe → hors cible).
- **Opérateur** : Pierre, VP Eng / référent IA ; **lecteurs** : PM Merim non-spécialistes.
- **Cap 12 mois** : ouvrir **multi-rédacteurs / multi-SOUL** (roadmap v2 — aucune spec v2 n'existe encore).
- **Succès** : régularité de publication · fidélité à la plume (SOUL) · fiabilité factuelle (jamais d'invention).

## Points d'attention pour le Reverse Utilisateur
- Le manuel doit suivre les **parcours de `specs.md`** : parcours principal `Saisir sujets → Vérification live (5 étapes) → Rédiger → Corriger → Archiver → Copier`, + édition SOUL (dont sous-flux ech-*), Agents, Commandes, Réglages, Historique/Lecteur.
- **Prérequis utilisateur** à documenter (sinon états cassés, GAP-17) : `claudeBin` valide, `bbDir` (BoilingBrain + MCP wiki Python) et `repoDir` configurés ; macOS, app non notarisée → retrait quarantaine au 1er lancement (`scripts/install-local.sh`).
- Garde-fou à expliquer à l'utilisateur : l'app **n'invente jamais** (non confirmé = `non_verifie`) ; SOUL §6 « propose puis confirme » ; **zéro tiret cadratin** dans les brèves.
- 17 zones d'ombre dans `docs/REVERSE_GAPS.md` (GAP-17 ajoutée par cette passe : onboarding/1er lancement). Ne pas documenter comme tranchées.

## Passation
```text
---
Couche fonctionnelle produite (vision, specs, modules).
Prochaine étape : manuel utilisateur.
Déclencheur : "Prends le role de Reverse Utilisateur et documente le manuel utilisateur de Brèves IA"
---
```
