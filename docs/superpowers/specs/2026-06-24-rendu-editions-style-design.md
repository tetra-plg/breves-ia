# Rendu stylisé des éditions (Direction A) — Design

> Date : 2026-06-24
> Statut : design validé, en attente de relecture avant plan d'implémentation
> Portée : afficher les éditions / brèves en typographie « newsletter éditorial » au lieu du markdown brut

## 1. Objectif

Aujourd'hui les éditions de brèves s'affichent en **markdown brut** (monospace, `white-space:pre-wrap`) dans le reader d'historique et l'écran archivé, et en texte semi-brut dans l'éditeur. On les rend en **typographie « Newsletter éditorial » (Direction A)** : titre, intro en sourdine, en-têtes de date soulignés en accent, accroche en gras, corps lisible, source en lien discret.

### Décisions cadrées (brainstorm 2026-06-24, companion visuel)
- **Direction visuelle A — Newsletter éditorial** (choisie parmi 4 options présentées).
- **Surfaces** : reader (historique) et archivé en lecture seule ; éditeur en **aperçu stylisé + toggle « Éditer »** vers le texte brut modifiable.
- **Liens sources** cliquables → navigateur externe.
- **Hors scope** : moteur de brèves, format des fichiers de note (inchangé), autres écrans.

## 2. Format d'entrée d'une édition

Texte « Teams » produit par `breves-draft` / stocké dans les notes :

```
📰 Brèves IA
Voici quelques nouvelles marquantes côté IA.

— 12 juin 2026 —
**Google publie l'OKF en open source** (Apache 2.0). … (corps, zéro tiret cadratin)
https://cloud.google.com/blog/…

— 13 juin —
**GLM-5.2 débarque.** …
https://z.ai/blog/glm-5.2
```

- **Titre** : la ligne d'ouverture (commence par `📰`, sinon la première ligne non vide).
- **Intro** : lignes entre le titre et le premier en-tête de date.
- **En-tête de date** : ligne `— <date> —` (le **seul** tiret cadratin autorisé ; le corps n'en a pas, donc détection nette).
- **Brève** : ligne de corps, commençant typiquement par `**accroche.**` puis le texte.
- **Source** : ligne nue `https?://…`.
- Le reader lit le fichier de note entier (en-tête de contexte + newsletter + sources) ; le rendu doit dégrader proprement (lignes non reconnues → corps).

## 3. Le rendu pur

`lib/edition-render.mjs` — `renderEditionHtml(markdown) -> string` (HTML), **pur**, s'appuie sur `escapeHtml`/`inlineMd` de `lib/ui-format.mjs`.

Traitement ligne par ligne (ou par blocs) :
- Ligne titre (`📰…` ou première non vide) → `<div class="ed-title">`.
- Ligne(s) d'intro (avant le 1ᵉʳ en-tête de date) → `<p class="ed-intro">` (sourdine).
- En-tête de date `^—\s*(.+?)\s*—$` → `<div class="ed-date">…</div>`.
- Ligne URL `^https?://\S+$` → `<a class="ed-src" data-url="<url>">…</a>` (texte = domaine + « → »).
- Autre ligne non vide → `<p class="ed-body">inlineMd(ligne)</p>` (l'accroche `**…**` devient `<strong>`).
- Lignes vides → séparateurs (ignorées ou marge).

Sécurité : tout passe par `escapeHtml`/`inlineMd` (contenu de confiance — notes de Pierre — mais on échappe par principe ; `data-url` échappé).

## 4. UI

Classes CSS Direction A dans `companion.html` : `.ed-title` (gras, large), `.ed-intro` (muted), `.ed-date` (mono, accent, soulignement `border-bottom` accentSoft), `.ed-body` (lisible), `.ed-src` (mono, accent, lien discret).

- **Reader** (`hud/renderer.mjs` `openReader`) : `#reader-text.innerHTML = renderEditionHtml(text)` (au lieu de `textContent` brut). Retirer le `font: mono / white-space:pre-wrap` de `#reader-text`.
- **Archivé** (`renderArchived`) : `#newsletter-final.innerHTML = renderEditionHtml(a.newsletterText)`. Retirer le style monospace pre-wrap.
- **Éditeur** (`renderEditor`) : source de vérité `state.teamsText` (init `draftValue.teamsText`).
  - Mode **aperçu** (défaut) : `#teams-text.innerHTML = renderEditionHtml(state.teamsText)`, non éditable ; bouton libellé **« Éditer »**.
  - Mode **édition** : `#teams-text` remplacé/masqué par une `<textarea id="teams-edit">` pré-remplie avec `state.teamsText` ; bouton **« Aperçu »**. À la bascule retour (ou avant Valider), `state.teamsText = textarea.value`.
  - **Valider & archiver** et **Corriger** utilisent `state.teamsText` (et non plus `#teams-text.innerText`). Corriger relance `breves-draft` ; sur nouveau draft, `state.teamsText` est ré-initialisé et le mode repasse en aperçu.

**Liens externes** : IPC `open-external` → `shell.openExternal(url)` (main), exposé `openExternal(url)` (preload). Un handler délégué sur les clics de `.ed-src` (reader/archivé/éditeur) lit `data-url` et appelle `window.breves.openExternal`.

## 5. Gestion d'erreurs

- `renderEditionHtml('')` ou entrée non-string → renvoie une chaîne vide ou un placeholder neutre, ne jette pas.
- `open-external` : URL invalide → no-op silencieux (validée `^https?://` avant ouverture).
- Toggle éditeur : basculer plusieurs fois conserve `state.teamsText` sans perte.

## 6. Tests

`node --test` :
- `renderEditionHtml` sur un fixture d'édition (titre, intro, 2 dates, brèves avec accroche en gras, URLs) : assertions sur la présence des classes/structure (`ed-title`, `ed-date` pour chaque date, `<strong>` pour l'accroche, `ed-src` avec `data-url`), et l'échappement d'un `<` injecté.
- Cas limites : entrée vide → pas d'exception ; ligne non reconnue → `ed-body`.
- L'UI (reader/archivé/éditeur + toggle + lien externe) vérifiée en lançant l'app.

## 7. Fichiers

- Create : `lib/edition-render.mjs`, `test/edition-render.test.mjs`.
- Modify : `hud/companion.html` (classes `.ed-*` + bouton toggle éditeur), `hud/renderer.mjs` (reader/archivé/éditeur + toggle + handler liens), `hud/main.mjs` + `hud/preload.cjs` (IPC `open-external`).
