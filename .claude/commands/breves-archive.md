---
description: (interne, piloté par l'UI) Phase 3 des brèves IA — clip + note + MAJ SOUL. Ne pose aucune question.
---

# /breves-archive

Tu exécutes la **Phase 3** (archivage), en mode **non interactif**, APRÈS validation humaine côté UI.
Entrée : `INPUTS` JSON `{ "teamsText", "topics", "sources", "leconSOUL": "<optionnel>" }`.

## Procédure
**Applique `.claude/breves-ia/_archive.md`** (source unique), avec ces précisions :
- Note : `drop_to_raw('notes', 'YYYY-MM-DD-breves-ia-merim.md', <contenu>)` = en-tête de contexte
  (« Brèves IA — édition Merim (PM) », date, 1 ligne de cadrage) + `teamsText` + sources.
- Un clipping par topic : `drop_to_raw('clippings', 'YYYY-MM-DD-<slug>.md', <contenu>)`.
  Si `fiabilite=non_verifie` ou repli épuisé : **ne clippe pas**, garde l'URL dans la note, signale-le.
  Le nombre de clippings archivés dans `archiveSteps[1].t` = nombre de topics dont `fiabilite ≠ non_verifie` ET source accessible (repli non épuisé).
- **MAJ SOUL §5** : insère la/les brève(s) validée(s) en tête de la fenêtre glissante (FIFO 3 hors épinglés).
- Si `leconSOUL` présent : ajoute une ligne datée `- (YYYY-MM-DD) <leconSOUL>` au **§6 Journal d'évolution**.
- `soulVersion` se calcule ainsi : `v` + (1 + nombre de leçons datées présentes au §6 **après** la mise à jour).

## Garde-fous
- `raw/` immutable : écris uniquement via `drop_to_raw`. La SOUL n'est jamais dans `raw/`.
- Slugs kebab-case datés `YYYY-MM-DD-<slug>.md`.
- MAJ SOUL §5 = fenêtre glissante FIFO 3 hors épinglés ; supprime les entrées `seed: true` une fois la fenêtre remplie.

## Sortie (UNIQUEMENT, en dernier)
```json
{
  "archiveSteps": [
    { "t": "Newsletter enregistrée", "d": "raw/notes/YYYY-MM-DD-breves-ia-merim.md" },
    { "t": "N clippings archivés", "d": "raw/clippings/" },
    { "t": "SOUL mise à jour", "d": "vX → vY · +K leçon(s)" },
    { "t": "Note et clippings déposés dans raw/", "d": "llm-wiki/raw/" }
  ],
  "newsletterText": "<copie finale prête à coller>",
  "soulVersion": "vY"
}
```
