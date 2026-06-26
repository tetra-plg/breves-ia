---
description: (interne, piloté par l'UI) Phase 2 des brèves IA — rédaction dans la plume (SOUL), renvoie un JSON. Ne pose aucune question.
---

# /breves-draft

Tu exécutes la **Phase 2** (rédaction), en mode **non interactif**.
Entrée : `INPUTS` JSON `{ "topics": [<résultats de /breves-verify>], "feedback": "<optionnel>", "redacteur": "on|off" }`.

## Aiguillage rédaction (selon `INPUTS.redacteur` : on | off ; défaut off si absent)

Lis d'abord `.claude/breves-ia/SOUL.md`.

- **`on`** : dispatche **un** `Task` avec `subagent_type: "redacteur"`. Donne-lui dans le prompt : la **voix** (SOUL §3 Voix & tics + §4 Lignes rouges), les **échantillons** (§5 verbatim), le bloc **`topics`** (JSON fourni en INPUTS) et le **`feedback`** s'il existe. Le brief est le prompt système de l'agent : ne le répète pas. Récupère sa réponse JSON `{ teamsText, soulLessonProposee }` et utilise-la telle quelle.
- **`off`** : rédige toi-même `teamsText` et `soulLessonProposee` en suivant les étapes 1-3 ci-dessous.

Dans les deux cas, tu assembles ensuite `corrections[]` et `sources[]` depuis les `topics` (étape 4) et tu émets le bloc JSON final.

## Étapes (mode `off` : rédaction directe)

### 1. Incarne la SOUL
Lis `.claude/breves-ia/SOUL.md` intégralement. Incarne :
- **§3 Voix & tics signatures** : première personne, fait d'abord puis aparté entre parenthèses, tournures récurrentes dosées.
- **§4 Lignes rouges** : aucune invention, factuel prime, pas de jargon non explicité.
- **§5 Échantillons vivants** : imite la densité, le rythme, la structure de ces exemples validés.

Ne modifie pas la SOUL. N'écris rien dans `raw/`.

### 2. Rédige les brèves

**Regroupement :** trie les `topics` par `date_reelle` (ordre chronologique). Regroupe-les sous un titre de section `— <date en toutes lettres, français> —` (deux-points autorisés, **zéro tiret cadratin** dans tout le texte rédigé ; cette règle s'applique aussi à l'intérieur des brèves).

**Format de chaque brève :**
1. Une **accroche en gras** (une phrase, fait principal).
2. Le développement : faits issus de `faits[]`, point de vue assumé entre parenthèses, URL nue de la source sur sa propre ligne en fin de brève.
3. Si `fiabilite == "non_verifie"` : signale-le explicitement dans le texte (ex. : « date non confirmée », « information non vérifiée »). Ne l'affirme jamais comme certain.
4. Si le topic a une `alerte` : n'en fais pas l'accroche de la brève ; énonce directement les faits vrais. La traçabilité est gérée par le champ `corrections` du JSON.

**Contraintes impératives :**
- Zéro tiret cadratin (`—`, `–`) dans le texte des brèves.
- Jamais de construction du type « contrairement à ce qu'on a pu lire » ou « c'était X, pas Y » : énoncer les faits vrais suffit.
- La brève s'adresse aux PM Merim, jamais à Pierre en direct (pas de « ton intuition »).

### 3. Applique le feedback (si présent)

Si `feedback` est fourni dans l'`INPUTS` :
- Applique la correction demandée au draft.
- Déduis une règle de style réutilisable → `soulLessonProposee` (chaîne non vide).
- Si aucun feedback ou si le feedback n'implique pas de règle généralisable → `soulLessonProposee: null`.

### 4. Dérive les champs JSON

**`teamsText`** (string, non vide) : le texte complet prêt à coller dans Teams. Structure :
```
— <date en toutes lettres> —

**<accroche brève 1>** Corps de la brève.
<url_citee du topic>

**<accroche brève 2>** Corps de la brève.
<url_citee du topic>

— <date suivante si différente> —
...
```

**`corrections[]`** : construit depuis les `topics` qui ont un champ `alerte`. Pour chaque topic avec une `alerte` :
- `niveau` = `topic.alerte.niveau` (valeur ∈ `{corrigé, date, nuance}`)
- `titre` = `topic.sujet` (libellé court du sujet)
- `detail` = `topic.alerte.texte`

Si aucun topic n'a d'`alerte`, `corrections` est un tableau vide `[]`.

**`sources[]`** : un objet par topic, dans l'ordre des topics :
- `name` = `topic.source` (publication)
- `url_citee` = `topic.url_citee`
- `url_clippee` = `topic.url_clippee`
- `repli` = `true` si `topic.url_clippee !== topic.url_citee`, sinon `false`

**`soulLessonProposee`** : voir §3. Type `string` (non vide) si feedback implique une règle, sinon `null`.

## Garde-fous

- Aucune invention ; le factuel prime ; pas de jargon non explicité pour un PM.
- **Zéro tiret cadratin** dans le texte (`—` et `–` interdits dans les brèves ; les séparateurs de section `— date —` sont la seule exception, en tant que marqueur de structure formaté).
- N'écris RIEN dans `raw/`, ne touche pas à la SOUL (l'archivage s'en charge).

## Sortie (UNIQUEMENT, en dernier)

Un seul bloc ```json``` :
```json
{
  "teamsText": "<prêt-à-coller>",
  "corrections": [ { "niveau": "corrigé|date|nuance", "titre": "...", "detail": "..." } ],
  "sources": [ { "name": "...", "url_citee": "...", "url_clippee": "...", "repli": false } ],
  "soulLessonProposee": null
}
```

Règles de dérivation rappelées :
- `corrections` ← topics avec `alerte` (niveau/texte). Tableau vide si aucune alerte.
- `sources` ← un objet par topic. `repli=true` si `url_clippee ≠ url_citee`.
- `teamsText` ← brèves regroupées par `date_reelle`, accroche en gras, URL nue sur sa ligne.
- `soulLessonProposee` ← règle déduite du `feedback`, ou `null`.
