# _HANDOFF — Reverse Technique → Reverse Fonctionnel (Brèves IA)

> Passation de la couche technique vers la couche fonctionnelle. Mode reverse : constater, tout tracer.

## Livré (couche technique)
- `docs/project/architecture.md` — choix techno, composants/déploiement (Mermaid), entités (fichiers, pas SQL), structure, séquences verify & archive, patterns, cartographie technique des modules (repliée).
- `docs/project/implementation.md` — protocoles IPC, `ApiResult`/`SaveResult`, **table des 20 canaux**, détail des 3 canaux pipeline (Zod in/out), types transport, conventions, implémentation par module.
- `docs/project/security.md` — modèle de menace app locale, hardening Electron, **bypassPermissions** (point central), validation/anti-traversal, XSS/rendu HTML, packaging macOS.
- `docs/project/tests.md` — 48 tests, pyramide réelle (unit + intégration SDK mocké + invariants DS + smoke), pas de seuil de couverture, hook pre-commit, pas de CI.

## Décisions de la passe
- **Modules repliés** dans la doc globale (complexité modérée, substance technique transverse). Pas de `docs/modules/[m]/`. Les sections d'app validées par le PM apparaissent en sous-sections « par module » dans architecture/implementation.
- Templates forward **adaptés** au stack réel : IPC au lieu de REST, Zod au lieu de RLS, pas de BDD/auth/CORS/rate-limit (signalés « sans objet »).
- **Délégation aux vrais agents forward** : après un 1er essai bloqué (indisponibilité du classifieur → brouillon driver), les 4 livrables ont été **re-produits en déléguant aux agents forward authentiques** (Architecte/Lead Dev/Security/QA) sous override `reverse-base`, chacun dans son périmètre. Versions autoritaires. Corrections apportées vs brouillon : `VIEWS`=12 (+`detail`/`reader`=14 vues routées), `command-event`=push (pas invoke), 48 tests (pas 54).

## Points d'attention pour le Reverse Fonctionnel
- Le découpage **fonctionnel** doit suivre les 7 sections d'app + socle (`_REVERSE_MODULE_MAP.md §3`). Décris les **parcours utilisateur** (pas les séquences techniques, déjà dans architecture.md) : flux `compose→checking→editor→archived`, édition SOUL (+ sous-flux ech-*), Agents, Commandes, Réglages, Historique/Reader, Accueil.
- 16 zones d'ombre dans `docs/REVERSE_GAPS.md` (dont GAP-12→16 ajoutées par cette passe). Ne pas documenter comme tranchées.
- Garde-fou produit central : l'app n'invente jamais (`non_verifie`), SOUL §6 « propose puis confirme ».

## Passation
```text
---
Couche technique produite (architecture, implementation, security, tests). Modules repliés.
Prochaine étape : couche fonctionnelle.
Déclencheur : "Prends le role de Reverse Fonctionnel et documente la couche fonctionnelle de Brèves IA"
---
```
