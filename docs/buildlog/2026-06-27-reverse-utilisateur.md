# reverse-utilisateur (build log) : manuel utilisateur de Brèves IA

**Date** : 2026-06-27
**Spec** : rôle `reverse-utilisateur` (MCP `factory`, driver Cycle R) + base `reverse-base` + agents forward `doc-global`, `ux-researcher`, `technical-writer` + templates `ui-ux-guidelines`, `user-doc-module`
**Plan** : interview ciblée ton/démo → déléguer charte, guidelines visuelles et 7 guides en posture reverse
**Objectif** : produire le manuel utilisateur (`docs/user/`) — uniquement les features atteignables, point de vue utilisateur, ton de la charte
**Statut** : livré

## Livré

| Livrable | Fichier | Agent forward |
|---|---|---|
| Charte rédactionnelle | `docs/user/charter.md` (93 l) | Doc Global (reverse) |
| Guidelines UI/UX | `docs/user/ui-ux-guidelines.md` (377 l) | UX Researcher (reverse) |
| Guide Accueil | `docs/user/accueil/guide.md` (69 l) | Technical Writer (reverse) |
| Guide Nouvelle édition | `docs/user/nouvelle-edition/guide.md` (190 l) | Technical Writer (reverse) |
| Guide Historique | `docs/user/historique/guide.md` (65 l) | Technical Writer (reverse) |
| Guide SOUL | `docs/user/soul/guide.md` (121 l) | Technical Writer (reverse) |
| Guide Agents | `docs/user/agents/guide.md` (73 l) | Technical Writer (reverse) |
| Guide Commandes | `docs/user/commands/guide.md` (68 l) | Technical Writer (reverse) |
| Guide Réglages | `docs/user/reglages/guide.md` (91 l) | Technical Writer (reverse) |
| Handoff | `docs/followup/_HANDOFF_reverse-utilisateur.md` | — |
| Gaps ajoutés | `docs/REVERSE_GAPS.md` | GAP-18 (accessibilité), GAP-19 (thème non exposé) |

## Validation RÉELLE

- ✅ Interview ciblée ton/démo menée AVANT rédaction : tutoiement convivial · 1 guide/section · démo « édition de bout en bout ».
- ✅ Délégation aux **vrais agents forward** (`doc-global`, `ux-researcher`, `technical-writer`) chargés via `factory.get_prompt`, adoptés sous override `reverse-base`.
- ✅ 9 fichiers créés sous `docs/user/` (vérifié à l'écriture). Charte 93 l, guidelines 377 l, 7 guides 677 l cumulées.
- ✅ Guidelines **reconstruites du CSS réel** (`tokens.css`, `index.html`, `foundations/*.mdx`) — tokens tracés, pas inventés.
- ✅ Guides au point de vue utilisateur, sans terme technique (vérifié par la consigne charte) ; démo de bout en bout en fil conducteur de `nouvelle-edition`.

## Gotchas de la passe

- **Templates UX/guide orientés app web mobile** : adaptés à une app desktop Electron à fenêtre fixe 400×760 (responsive « sans objet », layout 1 colonne).
- **oklch non converti** : les couleurs du thème sont en `oklch()` dans le code ; aucune valeur hex n'existe à sourcer → laissées en oklch (signalé).
- **Atteignabilité** : le **thème clair/sombre** existe en CSS mais n'a pas de sélecteur dans l'UI → exclu du manuel et consigné GAP-19 (règle reverse-utilisateur : ne documenter que l'atteignable). Le **CLI** reste hors manuel (outil dev).

## Décisions / restes

- **Décidé** : manuel = 7 guides par section + charte + guidelines ; ton tutoiement convivial ; thème et CLI exclus du manuel (non atteignables / hors scope).
- **Restes** : GAP-18 (accessibilité) et GAP-19 (thème non exposé) à arbitrer ; registre à 19 entrées.
- **Prochaine étape (optionnelle)** : « Prends le role de Reverse Reviewer et consolide la documentation de Brèves IA ».
