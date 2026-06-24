## Phase 3 — Clip + note + MAJ SOUL (uniquement après Valider)

8. Dépose la **note** via `drop_to_raw('notes', 'YYYY-MM-DD-breves-ia-merim.md', <contenu>)`. Contenu : en-tête de contexte (« Brèves IA — édition Merim (PM) », date d'édition, 1 ligne de cadrage) + la newsletter groupée par date + les sources.
9. Pour chaque sujet, dépose **un clipping** via `drop_to_raw('clippings', 'YYYY-MM-DD-<slug>.md', <contenu>)`. En-tête de chaque clipping : URL citée d'origine + URL clippée (si repli) + `clipping_meta` + date de clip, puis `clipping_contenu`. Si `fiabilite=non_verifie` ou repli épuisé (aucune source accessible), n'invente pas : garde l'URL dans la note, ne clippe pas, et signale-le dans le récap final.
10. **Mets à jour la SOUL §5** : insère la (les) brève(s) validée(s) en tête de la fenêtre glissante (`seed: false | épinglé: non`), retire les plus anciennes non épinglées au-delà de 3, et supprime les entrées `seed: true` une fois la fenêtre remplie de vraies éditions.
11. Si `leconSOUL` présent → ajoute une ligne datée `- (YYYY-MM-DD) <leconSOUL>` au §6 Journal d'évolution.

## Garde-fous
- Aucune invention ; `non_verifie` signalé dans la brève.
- `raw/` immutable ; SOUL jamais dans `raw/`. Écris UNIQUEMENT via `drop_to_raw(...)` du MCP boiling-brain-wiki.
- Repli source auto + mention de l'origine.
- Slugs kebab-case datés `YYYY-MM-DD-<slug>.md`.
- MAJ SOUL §5 = fenêtre glissante FIFO 3 hors épinglés.
- Si `leconSOUL` présent → ajoute une ligne datée `- (YYYY-MM-DD) <leconSOUL>` au §6 Journal d'évolution.
