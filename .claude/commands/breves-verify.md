---
description: (interne, piloté par l'UI) Phase 1 des brèves IA — fan-out de vérification, renvoie un JSON structuré. Ne pose aucune question.
---

# /breves-verify

Tu exécutes la **Phase 1** des brèves IA (vérification), en mode **non interactif**.
Entrée : un bloc `INPUTS` JSON `{ "sujets": "<texte en vrac>", "sceptique": "off|ciblé|toujours" }`. N'attends rien d'autre, ne pose aucune question.

Domaine : IA. Date du jour = date d'édition.

## Étapes
1. Extrais les **sujets distincts** du texte. Pour chacun, choisis une `key` courte en kebab-case.
   Émets immédiatement, une ligne par sujet : `«BREVES» topic <key> | <libellé court>`
2. Si **plus de 15 sujets**, n'en traite que les 15 premiers et ajoute `"avertissement_lot": true` au JSON final.
3. Dispatche **en parallèle un sous-agent par sujet** via l'outil Task avec **`subagent_type: "enqueteur"`** (un seul message, plusieurs `Task`). Tâche = le sujet (+ date/URL fournies). Le brief EST le prompt système de l'agent : ne le répète pas.
4. Dès réception de la réponse de chaque sous-agent, émets ses jalons :
   `«BREVES» step <key> source` (source retenue), `«BREVES» step <key> article` (contenu récupéré).
   Quand un sujet est entièrement traité : `«BREVES» done <key>`. En cas d'échec irrécupérable : `«BREVES» error <key> | <message>`.

## Passe sceptique (selon INPUTS.sceptique : off | ciblé | toujours)

- `off` : ne fais rien.
- `toujours` : pour CHAQUE brève, dispatche un Task `subagent_type: "sceptique"` (donne l'affirmation centrale + la date + la source à réfuter).
- `ciblé` : seulement pour les brèves à affirmation forte (un chiffre, un superlatif, « premier/record/jamais »), dispatche le sceptique.
Fusion des verdicts : si le sceptique répond `refute: oui`, applique sa `fiabilite_suggeree` (rétrograde `fiabilite` en `partiel`/`non_verifie`) et ajoute une `alerte` (niveau `nuance` ou `corrigé`) + une ligne dans `corrections` résumant la réfutation. Sinon, ne change rien.

## Garde-fous (identiques à /breves-ia)
- Aucune invention : `fiabilite: non_verifie` si non confirmé.
- Repli source auto si paywall/403/timeout, URL citée d'origine conservée, repli signalé.
- N'écris RIEN dans `raw/`. Ne rédige PAS les brèves.

## Mapping des réponses sous-agents → JSON final
Pour chaque sujet, avant de remplir le bloc JSON :
- Le champ `faits_verifies` de la réponse du sous-agent devient `faits` (tableau) dans le JSON final.
- Déduis `source` depuis `clipping_meta` (la partie avant le premier ` — `).
- `date_corrigee` : convertis le `oui|non` du sous-agent en booléen.

## Sortie (et UNIQUEMENT ça, en dernier)
Un bloc ```json``` :
```json
{ "topics": [ {
  "key": "...", "sujet": "...", "raw": "<énoncé d'origine>",
  "date_reelle": "YYYY-MM-DD", "date_fournie": "YYYY-MM-DD|aucune", "date_corrigee": false,
  "fiabilite": "confirme|partiel|non_verifie",
  "faits": ["..."], "corrections": "<écarts ou 'aucune'>",
  "alerte": { "niveau": "corrigé|nuance|date", "texte": "..." },
  "source": "<publication>", "url_citee": "...", "url_clippee": "...",
  "clipping_meta": "publication — auteur — date", "slug": "kebab-sans-date",
  "clipping_contenu": "<markdown fidèle, sans pub ni navigation>"
} ] }
```
Omets `alerte` s'il n'y a ni correction ni nuance.
