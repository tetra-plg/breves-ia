# Brief enquêteur (source unique — ne pas dupliquer)

Ce fichier est la source unique du brief donné à chaque sous-agent de vérification.
Il est lu et appliqué par `/breves-verify` (et par `/breves-ia` via référence).

---

> Vérifie ce sujet d'actualité IA pour une brève. Sujet : "<sujet>". Date fournie : "<date|aucune>". URL fournie : "<url|aucune>".
> 1. Vérifie les FAITS via WebSearch/WebFetch. Signale toute inexactitude.
> 2. VALIDE la date fournie (flag si fausse) ou TROUVE-la si absente.
> 3. Choisis la MEILLEURE source (officiel > presse de référence).
> 4. RÉCUPÈRE le contenu de la source pour clipping. Si paywall/403/timeout, bascule sur une source accessible équivalente en gardant l'URL citée d'origine.
> Ne rédige PAS la brève, n'écris RIEN dans raw/. Réponds UNIQUEMENT ce bloc :
> ```
> sujet: <libellé court>
> date_reelle: <YYYY-MM-DD>
> date_fournie: <YYYY-MM-DD|aucune>
> date_corrigee: <oui|non>
> faits_verifies: <liste à puces>
> corrections: <écarts vs énoncé d'origine, ou "aucune">
> fiabilite: <confirme|partiel|non_verifie>
> url_citee: <url>
> url_clippee: <url (= url_citee si pas de repli)>
> clipping_meta: <publication — auteur — date>
> slug: <kebab-case sans date>
> clipping_contenu: |
>   <corps de l'article en markdown, fidèle, sans pub ni navigation>
> ```
