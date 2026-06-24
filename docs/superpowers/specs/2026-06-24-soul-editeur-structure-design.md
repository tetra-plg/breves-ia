# Éditeur SOUL structuré — Design

> Date : 2026-06-24
> Statut : design validé, en attente de relecture avant plan d'implémentation
> Portée : remplacer l'éditeur SOUL brut de l'app par une vue structurée (§1-4 éditables, §5-6 en display)

## 1. Objectif

Aujourd'hui la vue SOUL de l'app montre le fichier `SOUL.md` en **texte brut éditable**. On la remplace par une **vue structurée** :
- **§1-4 éditables** (Qui parle, Audience, Voix & tics, Lignes rouges) — 4 zones de texte sauvées dans `SOUL.md`.
- **§5 (Échantillons vivants) et §6 (Journal d'évolution)** en **affichage lisible, lecture seule**.

Le **moteur de brèves reste inchangé** : `breves-archive` continue de gérer §5 (fenêtre glissante) et §6 (leçons) automatiquement ; `breves-draft` continue de proposer une leçon sur Corriger via la case « enrichir la SOUL ». L'éditeur ne fait que **corriger §1-4 à la main** et **afficher** §5/§6.

### Décisions cadrées (brainstorm 2026-06-24)
- **Éditable** : §1, §2, §3, §4 uniquement (4 inputs).
- **Display read-only** : §5, §6.
- **Moteur inchangé** : pas de modification de `breves-archive`/`breves-draft` ; pas de sélection d'échantillons, pas de suppression de leçons, pas de file de curation de suggestions (hors scope, éventuellement plus tard).
- **Garde-fou** : sauver §1-4 ne doit JAMAIS altérer §5, §6, le titre ou les notes `>` du fichier.

## 2. Structure du fichier SOUL (rappel)

`SOUL.md` (`<repoDir>/.claude/breves-ia/SOUL.md`) :
- Titre `# SOUL — …` + bloc d'intro `>` (boilerplate).
- `## 1. Qui parle` — prose.
- `## 2. Audience` — prose.
- `## 3. Voix & tics signatures` — puces.
- `## 4. Lignes rouges` — puces.
- `## 5. Échantillons vivants (fenêtre glissante)` — note `>` + N entrées : `### [YYYY-MM-DD] seed: bool | épinglé: oui/non` puis une brève verbatim (accroche en gras + texte).
- `## 6. Journal d'évolution` — note `>` + leçons datées `- [YYYY-MM-DD] <texte>`.

## 3. Moteur — parse + écriture ciblée

Tout est **pur** (testable) ou injectable (`readFile`/`writeFile` via `deps`). Vit dans `hud/engine.mjs` (avec un helper de parsing pur extractible si utile).

- `parseSoul(raw) -> { version, quiParle, audience, voix, lignesRouges, echantillons, journal }`
  - `version` : dérivée comme aujourd'hui (`v` + 1 + nb de leçons datées du §6).
  - `quiParle, audience, voix, lignesRouges` : le **corps brut** (texte multi-ligne, puces incluses) de §1, §2, §3, §4 respectivement, sans le titre `## N. …`, trim des bords.
  - `echantillons` : `[{ date:'YYYY-MM-DD', seed:boolean, epingle:boolean, texte:string }]` — pour chaque entrée `### [date] seed: … | épinglé: …`, `texte` = le corps verbatim jusqu'à la prochaine `###` ou `##`.
  - `journal` : `[{ date:'YYYY-MM-DD', texte:string }]` depuis `- [date] <texte>` du §6.
- `replaceSoulSections(raw, { quiParle, audience, voix, lignesRouges }) -> raw'`
  - Découpe `raw` sur les titres `## ` ; remplace **uniquement** le corps des sections 1-4 par les valeurs fournies ; réassemble. §5, §6, le préambule (titre + intro `>`) restent **intacts**.
  - Round-trip garanti : `replaceSoulSections(raw, parsed§1-4)` ≈ `raw` (aux espaces de bord près).
- `getSoul(deps) -> parseSoul(readFile(<repoDir>/.claude/breves-ia/SOUL.md))` ; renvoie `null` si lecture échoue.
- `saveSoulSections(deps, edits) -> { ok } | { ok:false, error }`
  - `edits` = `{ quiParle, audience, voix, lignesRouges }`. Refuse si l'un est absent/vide (ne jamais vider une section). Lit le fichier courant, applique `replaceSoulSections`, écrit. Erreurs renvoyées proprement.

Les fonctions existantes `readSoul` (version + rules/examples/lessons pour le dashboard), `readSoulRaw`/`saveSoul` (éditeur brut) : `readSoul` **reste** (badge version dashboard) ; `readSoulRaw`/`saveSoul` deviennent **inutilisés** et sont retirés (et leurs IPC).

## 4. UI — vue SOUL

`hud/companion.html` (section `data-view="soul"`) + `hud/renderer.mjs` (`renderSoul`) :
- **§1-4** : 4 `<textarea>` étiquetés (Qui parle / Audience / Voix & tics / Lignes rouges), pré-remplis par `getSoul`. Un bouton **« Enregistrer »** → `saveSoulSections({quiParle,audience,voix,lignesRouges})`, toast de confirmation/erreur, puis refresh de la version au dashboard (`getDashboard`).
- **§5 Échantillons vivants** : cartes **read-only**, une par entrée — date (+ petit badge « épinglé » si `epingle`), puis le texte de la brève. Pas d'édition.
- **§6 Journal d'évolution** : liste **read-only** des leçons (date + texte).
- Un libellé de version (`v…`) en tête.

## 5. IPC

`hud/main.mjs` + `hud/preload.cjs` :
- Ajoute `get-soul-structured` → `getSoul(deps)` ; `save-soul-sections` → `saveSoulSections(deps, edits)`.
- Retire `get-soul-raw` / `save-soul` (éditeur brut remplacé) côté main, preload et renderer.

## 6. Gestion d'erreurs

- `getSoul` : SOUL illisible → `null` → l'UI affiche un message neutre (« SOUL introuvable »).
- `saveSoulSections` : champ vide → `{ok:false, error:'… vide'}` → toast, pas d'écriture. Erreur d'écriture → toast.
- `parseSoul` robuste à une section absente (renvoie chaîne vide / tableau vide), ne jette pas.

## 7. Tests

`node --test` :
- `parseSoul` sur une fixture SOUL complète : §1-4 extraits (corps brut), §5 entrées (date/seed/épinglé/texte), §6 leçons, version. Tolérance section absente.
- `replaceSoulSections` : éditer §1-4 produit un markdown où §5/§6 + préambule sont **identiques** à l'original (assertion d'intégrité) et où §1-4 reflètent les nouvelles valeurs.
- `saveSoulSections` : via `readFile`/`writeFile` injectés — écrit le bon contenu ; refuse un champ vide (n'appelle pas `writeFile`).
- Réutilise/complète la fixture `test/fixtures/SOUL.sample.md` (ou la vraie structure).

La vue (companion.html/renderer) est vérifiée en lançant l'app (`npm run hud`).

## 8. Hors scope

- Sélection manuelle des échantillons §5 (reste géré par l'archive).
- Suppression de leçons §6 / édition de §5-6.
- File de curation des suggestions d'évolution proposées à la rédaction.
- Toute modification de `breves-archive` / `breves-draft` / du flux d'archive.
