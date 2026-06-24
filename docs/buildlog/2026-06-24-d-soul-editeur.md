# D — Éditeur SOUL structuré (build log) : §1-4 éditables, §5-6 display

**Date** : 2026-06-24
**Spec** : `docs/superpowers/specs/2026-06-24-soul-editeur-structure-design.md`
**Plan** : `docs/superpowers/plans/2026-06-24-soul-editeur-structure.md`
**Objectif** : remplacer l'éditeur SOUL brut par une vue structurée — §1-4 (Qui parle / Audience / Voix & tics / Lignes rouges) éditables et sauvés dans `SOUL.md` ; §5 (échantillons) et §6 (journal) en affichage lecture seule. Moteur de brèves inchangé.
**Statut** : livré — **validé en RÉEL** (parse + round-trip sur la vraie SOUL) ; rendu confirmé par Pierre. Mergé sur `main`, poussé.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Modèle SOUL pur** | `lib/soul-model.mjs` | `parseSoul(raw)` → `{ version, quiParle, audience, voix, lignesRouges, echantillons[], journal[] }` ; `replaceSoulSections(raw, edits)` réécrit **uniquement** §1-4 (découpe sur `## `, §5/§6/préambule intacts). |
| **Fix version dashboard** | `lib/soul.mjs` | `readSoul` lisait le journal en `- (date)` (parenthèses) alors que le vrai fichier est en `- [date]` (crochets) → comptait 0 leçon → badge toujours `v1`. Aligné sur `[date]`. |
| **Engine SOUL** | `hud/engine.mjs` | `getSoul(deps)` (parse du fichier, `null` si échec) ; `saveSoulSections(deps, edits)` (refuse un champ vide → pas d'écriture ; sinon lit → `replaceSoulSections` → écrit). Retrait de `readSoulRaw`/`saveSoul` (éditeur brut). |
| **IPC** | `hud/main.mjs`, `hud/preload.cjs` | `get-soul-structured` / `save-soul-sections` (remplacent `get-soul-raw`/`save-soul`). |
| **UI structurée** | `hud/companion.html`, `hud/renderer.mjs` | 4 textareas §1-4 + « Enregistrer §1-4 » + version ; §5 et §6 en **cartes read-only** (date accent + texte ; badge « épinglé » en §5). |

## Validation RÉELLE

- ✅ **`getSoul` sur la vraie SOUL** : version **v3** (2 leçons + 1), §1 « Je suis Pierre, VP Engineering… », §3 558 chars, §4 252 chars, **3 échantillons**, **2 leçons** datées 2026-06-24. Le badge version est désormais correct (était v1).
- ✅ **Round-trip d'intégrité sur la vraie SOUL** : modifier §1 via `replaceSoulSections` laisse tout `## 5.` → fin **octet pour octet identique** (probe lecture seule, sans écrire).
- Suite : **74/74** tests (`parseSoul`/round-trip, `readSoul` `[date]`, `getSoul`/`saveSoulSections`), pristine.

## Gotchas de la passe

1. **Format `[date]` vs `(date)`** : bug latent — `readSoul` (Plan A) attendait des parenthèses, la vraie SOUL utilise des crochets → version affichée v1 à tort. Détecté en concevant le parser ; aligné dans la passe.
2. **`id="soul-version"` dupliqué** : la review finale (opus) a attrapé un doublon entre le badge dashboard et le span de la vue SOUL. `querySelector` renvoyant le premier match, la version de la vue restait vide et « SOUL introuvable » aurait pollué le badge dashboard. Corrigé : `id="soul-view-version"` distinct.
3. **Découpe `## ` only** : `replaceSoulSections` ne split que sur les titres `## ` (deux dièses), donc les `### ` du §5 et les `- ` du §6 ne sont jamais touchés. Limite connue : une brève dont le corps contiendrait une ligne `## ` casserait le découpage (improbable, les brèves sont des paragraphes).

## Décisions / restes

- **§6 aligné sur §5** : journal rendu en cartes comme les échantillons (cohérence visuelle), à la demande de Pierre.
- **Hors scope (confirmé)** : sélection manuelle des échantillons §5, suppression de leçons §6, file de curation des suggestions d'évolution. Le moteur de brèves (archive/draft) n'a pas été touché.
- **Suite** : l'UI des brèves (flux compose → checking → editor) — prochain cycle brainstorm → spec → plan.
