# I — §5 « Échantillons vivants » curaté manuellement (build log)

**Date** : 2026-06-25
**Spec** : `docs/superpowers/specs/2026-06-25-soul-echantillons-manuels-design.md`
**Plan** : `docs/superpowers/plans/2026-06-25-soul-echantillons-manuels.md`
**Objectif** : remplacer la fenêtre glissante FIFO de §5 par une liste curatée à la main (3 max), gérée dans l'éditeur SOUL en piochant des brèves dans les éditions passées ; l'archivage ne touche plus §5.
**Statut** : livré, review finale (opus) *Ready to merge*, 116/116 tests. Mergé sur `main`.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Extraction de brèves** | `lib/edition-breves.mjs` (+ test) | `extractBreves(noteText) → [{date, source, accroche, texte}]` : découpe une note archivée en brèves (date `— … —`, accroche `**…**`, URL → source = domaine). Titre/intro/Sources exclus. |
| **§5 simplifié** | `lib/soul-model.mjs` (+ tests) | `parseEchantillons` → `{date, source, texte}` (flags `seed`/`épinglé` supprimés, ancien format toléré) ; `serializeEchantillons` (préambule + ≤ 3 entrées `### [date] · source`) ; `replaceSoulEchantillons` (réécrit le seul corps de §5). |
| **Engine + IPC** | `hud/engine.mjs`, `hud/main.mjs`, `hud/preload.cjs` (+ tests) | `saveSoulEchantillons(deps, entries)` : refuse > 3 ou texte vide avant toute écriture ; IPC `save-soul-echantillons`. |
| **Éditeur SOUL §5** | `hud/companion.html`, `hud/renderer.mjs` | §5 éditable : cartes avec « Retirer », « + Ajouter depuis une édition » (désactivé à 3) → sélecteur d'éditions → brèves → « Ajouter », « Enregistrer §5 ». Stocke `ed.date` (ISO). |
| **Archivage sans §5** | `.claude/commands/breves-archive.md`, `.claude/breves-ia/_archive.md`, `.claude/breves-ia/SOUL.md` | Retrait de la MAJ §5 (FIFO) ; `soulVersion` (basé §6) inchangé ; §5 réinitialisé (0 entrée, nouveau préambule). |

## Validation RÉELLE

- ✅ **Round-trip date** : le picker sérialise avec `ed.date` (ISO issu du nom de fichier), `parseEchantillons` relit via `^\[(\d{4}-\d{2}-\d{2})\]` — pas de perte. (Piège évité : `extractBreves.date` est un libellé en toutes lettres, non utilisé pour le stockage.)
- ✅ **Garde-fous avant écriture** : `saveSoulEchantillons` refuse > 3 / texte vide sans écrire (testé `called === false`). Cap appliqué en triple (engine, `serialize.slice(0,3)`, UI).
- ✅ **Isolation §5** : `replaceSoulEchantillons` ne touche que `## 5.` ; §1-4 et §6 intacts (testé).
- ✅ **Archivage purgé** : plus de FIFO/§5 dans `breves-archive.md`/`_archive.md` ; `parseSoul(SOUL.md)` → `echantillons: 0`, `version: v3`, journal 2.
- ✅ **Pas de résidu** `.seed`/`.epingle` ; le draft lit la SOUL en markdown brut (insensible au changement de shape).
- Suite : **116/116** tests.

## Gotchas de la passe

1. **Date ISO vs libellé** : `extractBreves` renvoie la date en toutes lettres (« 17 juin 2026 »), mais §5 attend `[YYYY-MM-DD]`. Fix : l'UI stocke `ed.date` (ISO de l'édition), pas `b.date`.
2. **Shape §5 changé** : un test existant lisait `.epingle`/`.seed` → mis à jour vers `{date, source, texte}`.

## Décisions / restes

- Minors non bloquants (review finale) : champ `accroche` d'`extractBreves` inerte côté UI (testé) ; fragilité théorique du split `## ` si un verbatim contenait `## ` (impossible en pratique).
- §5 repart **vide** : l'utilisateur reconstruit ses 3 échantillons via la nouvelle UI à partir de vraies éditions.
- Boucle complète : éditeur SOUL → `saveSoulEchantillons` → §5 du fichier → lu par `/breves-draft` à la rédaction suivante.
