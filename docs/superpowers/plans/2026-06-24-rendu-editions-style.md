# Rendu stylisé des éditions (Direction A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher les éditions de brèves en typographie « Newsletter éditorial » (titre, dates soulignées, accroche en gras, source en lien externe) au lieu du markdown brut, sur le reader, l'écran archivé et l'éditeur (aperçu + toggle « Éditer »).

**Architecture :** Un module pur `lib/edition-render.mjs` (`renderEditionHtml`) parse le format d'édition et produit le HTML Direction A. Le renderer l'applique sur 3 surfaces ; un IPC `open-external` ouvre les liens sources dans le navigateur. Le moteur de brèves n'est pas touché.

**Tech Stack :** Node ≥ 20, ESM, vanilla JS/HTML/CSS, `node --test`, Electron.

## Global Constraints

- **Direction A** : titre, intro en sourdine, en-tête de date `— <date> —` souligné en accent, accroche `**…**` en gras, corps lisible, source = lien externe.
- **Détection de date** : `^—\s*(.+?)\s*—$` (le seul tiret cadratin autorisé ; le corps n'en a pas).
- **Surfaces** : reader + archivé en lecture seule ; éditeur = aperçu stylisé par défaut + bouton « Éditer » → `<textarea>` brut.
- **Source de vérité éditeur** : `state.teamsText` (init depuis le draft) ; Valider/Corriger l'utilisent.
- **Liens** : ouverts via `shell.openExternal`, seulement si `^https?://`.
- **Sécurité** : tout passe par `escapeHtml`/`inlineMd` (déjà dans `lib/ui-format.mjs`).
- **Moteur de brèves inchangé.** Pas de nouvelle dépendance.

---

## Task 1 : Rendu pur `renderEditionHtml`

**Files:**
- Create: `lib/edition-render.mjs`
- Test: `test/edition-render.test.mjs`

**Interfaces:**
- Consumes : `escapeHtml`, `inlineMd` (`lib/ui-format.mjs`).
- Produces : `renderEditionHtml(markdown) -> string` (HTML). Entrée vide/non-string ⇒ `''` (ne jette pas).
  - Titre = 1ʳᵉ ligne non vide (préfixe markdown `#` retiré) → `<div class="ed-title">`.
  - Intro = lignes entre titre et 1ᵉʳ en-tête de date → `<p class="ed-intro">`.
  - En-tête de date → `<div class="ed-date">`.
  - URL nue `^https?://\S+$` → `<a class="ed-src" data-url="<url>">domaine →</a>`.
  - Autre ligne (après la 1ʳᵉ date) → `<p class="ed-body">inlineMd(ligne)</p>`. Lignes vides ignorées.

- [ ] **Step 1 : Écrire les tests**

```js
// test/edition-render.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEditionHtml } from '../lib/edition-render.mjs';

const ED = `📰 Brèves IA
Voici quelques nouvelles.

— 12 juin —
**Google publie l'OKF** (Apache 2.0).
https://cloud.google.com/blog/x

— 13 juin —
**GLM-5.2 débarque.** Modèle <ouvert>.
https://z.ai/blog`;

test('titre + intro', () => {
  const h = renderEditionHtml(ED);
  assert.match(h, /class="ed-title"[^>]*>📰 Brèves IA</);
  assert.match(h, /class="ed-intro"[^>]*>Voici quelques nouvelles\.</);
});
test('chaque date devient un ed-date', () => {
  const h = renderEditionHtml(ED);
  assert.equal((h.match(/class="ed-date"/g) || []).length, 2);
  assert.match(h, /class="ed-date"[^>]*>12 juin</);
});
test('accroche en gras', () => {
  assert.match(renderEditionHtml(ED), /<strong>Google publie l'OKF<\/strong>/);
});
test('URL → lien externe avec data-url + domaine', () => {
  assert.match(renderEditionHtml(ED), /<a class="ed-src" data-url="https:\/\/cloud\.google\.com\/blog\/x">cloud\.google\.com →<\/a>/);
});
test('échappe le HTML du corps', () => {
  assert.match(renderEditionHtml(ED), /Modèle &lt;ouvert&gt;\./);
});
test('retire le préfixe markdown # du titre', () => {
  assert.match(renderEditionHtml('# Brèves IA — édition\nintro'), /class="ed-title"[^>]*>Brèves IA/);
});
test('entrée vide ou non-string ne jette pas', () => {
  assert.equal(renderEditionHtml(''), '');
  assert.equal(renderEditionHtml(null), '');
  assert.equal(renderEditionHtml(undefined), '');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/edition-render.test.mjs` → FAIL (module manquant).

- [ ] **Step 3 : Créer lib/edition-render.mjs**

```js
import { escapeHtml, inlineMd } from './ui-format.mjs';

const DATE_RE = /^—\s*(.+?)\s*—$/;
const URL_RE = /^(https?:\/\/\S+)$/;

export function renderEditionHtml(markdown) {
  if (typeof markdown !== 'string') return '';
  let html = '';
  let titleDone = false;
  let firstDateSeen = false;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const dm = line.match(DATE_RE);
    if (dm) { firstDateSeen = true; html += `<div class="ed-date">${inlineMd(dm[1])}</div>`; continue; }
    const um = line.match(URL_RE);
    if (um) {
      const url = um[1];
      let domaine = url;
      try { domaine = new URL(url).hostname.replace(/^www\./, ''); } catch { /* garde l'url */ }
      html += `<a class="ed-src" data-url="${escapeHtml(url)}">${escapeHtml(domaine)} →</a>`;
      continue;
    }
    if (!titleDone) { titleDone = true; html += `<div class="ed-title">${inlineMd(line.replace(/^#+\s*/, ''))}</div>`; continue; }
    if (!firstDateSeen) { html += `<p class="ed-intro">${inlineMd(line)}</p>`; continue; }
    html += `<p class="ed-body">${inlineMd(line)}</p>`;
  }
  return html;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/edition-render.test.mjs` → PASS (7 tests). Puis `npm test` (suite verte).

- [ ] **Step 5 : Commit** — `git add lib/edition-render.mjs test/edition-render.test.mjs && git commit -m "feat(edition): renderEditionHtml — rendu Direction A (pur, testé)"`

---

## Task 2 : Surfaces lecture seule (reader + archivé) + liens externes

**Files:**
- Modify: `hud/companion.html` (CSS `.ed-*` + styles reader/archivé), `hud/renderer.mjs` (reader, archivé, handler liens), `hud/main.mjs`, `hud/preload.cjs` (IPC `open-external`)

**Interfaces:**
- Consumes : `renderEditionHtml` (Task 1).
- Produces (preload) : `openExternal(url)` → IPC `open-external`.

**Note (vérification) :** DOM/Electron, vérifié en lançant l'app.

- [ ] **Step 1 : CSS Direction A** — dans le `<style>` de `companion.html`, ajouter (près des « cartes & blocs génériques ») :

```css
.ed-title{font:700 18px var(--display);letter-spacing:-.01em;margin:0 0 2px}
.ed-intro{font:400 12.5px var(--body);color:var(--muted);margin:0 0 14px}
.ed-date{display:inline-block;font:600 10px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);border-bottom:2px solid var(--accentSoft);padding-bottom:2px;margin:16px 0 8px}
.ed-body{font:400 13px/1.6 var(--body);margin:0 0 6px}
.ed-src{display:block;font:500 10px var(--mono);color:var(--accent);text-decoration:none;cursor:pointer;margin:0 0 4px}
.ed-src:hover{text-decoration:underline}
```

- [ ] **Step 2 : Dé-monospacer les conteneurs** — dans `companion.html`, retirer `font:…var(--mono)` et `white-space:pre-wrap` des deux conteneurs :
  - `#reader-text` : passer son style inline à `flex:1;overflow:auto;padding:18px`.
  - `#newsletter-final` : passer son style inline à `padding:13px 15px;max-height:200px;overflow:auto`.

- [ ] **Step 3 : IPC `open-external`** — `hud/main.mjs` : ajouter `shell` à l'import electron (`import { app, BrowserWindow, Menu, ipcMain, clipboard, shell } from 'electron';`) et le handler :

```js
  ipcMain.handle('open-external', (_e, url) => { if (/^https?:\/\//.test(String(url))) shell.openExternal(url); });
```

`hud/preload.cjs` : ajouter `openExternal: (url) => ipcRenderer.invoke('open-external', url),`

- [ ] **Step 4 : renderer — import + reader + archivé + handler liens** (`hud/renderer.mjs`) :
  - En tête : `import { renderEditionHtml } from '../lib/edition-render.mjs';`
  - `openReader` : remplacer le remplissage de `#reader-text` par du HTML rendu :

```js
  $('#reader-text').textContent = 'Chargement…';
  state.returnTo = state.view;
  show('reader');
  const text = e.file ? await window.breves.readEdition(e.file) : null;
  $('#reader-text').innerHTML = text ? renderEditionHtml(text)
    : 'Texte introuvable dans le wiki (raw/notes/' + escapeHtml(e.file || '') + ').';
```

  - `renderArchived` : remplacer `$('#newsletter-final').textContent = a.newsletterText || '';` par `$('#newsletter-final').innerHTML = renderEditionHtml(a.newsletterText || '');`
  - Ajouter au bootstrap (dans `wire()`) un handler délégué :

```js
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.ed-src');
    if (a && a.dataset.url) { e.preventDefault(); window.breves.openExternal(a.dataset.url); }
  });
```

- [ ] **Step 5 : Vérifier** — `node --check hud/renderer.mjs hud/main.mjs` ; `npm test` vert. Lancer l'app (`ELECTRON_RUN_AS_NODE= npx electron hud/main.mjs`) : ouvrir une **ancienne édition** (Historique) → rendu stylisé (titre, dates soulignées, accroches en gras, sources en liens) au lieu du monospace ; cliquer une source ouvre le navigateur. L'écran **Archivé** (après une vraie veille) rend pareil.

- [ ] **Step 6 : Commit** — `git add hud/companion.html hud/renderer.mjs hud/main.mjs hud/preload.cjs && git commit -m "feat(hud): reader + archivé en rendu stylisé + liens sources externes"`

---

## Task 3 : Éditeur — aperçu stylisé + toggle « Éditer »

**Files:**
- Modify: `hud/companion.html` (markup éditeur), `hud/renderer.mjs` (renderEditor + toggle + validate/corriger)

**Interfaces:**
- Consumes : `renderEditionHtml` (Task 1).

- [ ] **Step 1 : Markup éditeur** — dans `companion.html`, la zone de l'éditeur (`#teams-text` + la barre « prêt-à-coller · Teams » avec la pill « éditable ») :
  - Remplacer la pill `éditable` par un bouton `<button id="btn-edit-toggle" class="pill" style="cursor:pointer;border:none">Éditer</button>`.
  - Rendre `#teams-text` NON éditable (retirer `contenteditable="true"`) — il devient le conteneur d'aperçu.
  - Ajouter juste après `#teams-text`, dans la même carte : `<textarea id="teams-edit" spellcheck="false" hidden style="width:100%;min-height:240px;border:none;padding:14px 15px;font:400 13px/1.6 var(--mono);color:var(--text);background:transparent;resize:vertical"></textarea>`

- [ ] **Step 2 : renderer — état + modes** (`hud/renderer.mjs`) :
  - Ajouter un état module : `let editorMode = 'preview';` (près des autres `let`).
  - Remplacer le remplissage de `#teams-text` dans `renderEditor(d)` :

```js
function renderEditor(d) {
  state.teamsText = d.teamsText || '';
  editorMode = 'preview';
  applyEditorMode();
  // … corrections + sources : INCHANGÉ …
}
function applyEditorMode() {
  const preview = editorMode === 'preview';
  $('#teams-text').hidden = !preview;
  $('#teams-edit').hidden = preview;
  if (preview) $('#teams-text').innerHTML = renderEditionHtml(state.teamsText);
  else $('#teams-edit').value = state.teamsText;
  $('#btn-edit-toggle').textContent = preview ? 'Éditer' : 'Aperçu';
}
function toggleEditor() {
  if (editorMode === 'edit') state.teamsText = $('#teams-edit').value;  // capture les modifs
  editorMode = editorMode === 'preview' ? 'edit' : 'preview';
  applyEditorMode();
}
function syncTeamsText() { if (editorMode === 'edit') state.teamsText = $('#teams-edit').value; }
```

  (Garder le rendu existant des `#corrections-list` / `#sources-list` dans `renderEditor`.)

- [ ] **Step 3 : Valider/Corriger utilisent `state.teamsText`** — dans `runArchive`, remplacer la lecture de `#teams-text` :

```js
  syncTeamsText();
  const teamsText = state.teamsText || draftValue.teamsText;
```

  (le reste de `runArchive` inchangé ; `inputs.teamsText = teamsText`.)

- [ ] **Step 4 : Câblage** — dans `wire()`, ajouter `$('#btn-edit-toggle').onclick = toggleEditor;`

- [ ] **Step 5 : Vérifier** — lancer l'app, enchaîner verify → draft : l'éditeur montre l'**aperçu stylisé** (titre/dates/accroches) ; « Éditer » bascule vers la textarea brute, modifier puis « Aperçu » reflète la modif ; « Valider » (ou inspection de `state.teamsText`) utilise le texte courant ; « Corriger » relance draft et repasse en aperçu. `npm test` vert.

- [ ] **Step 6 : Commit** — `git add hud/companion.html hud/renderer.mjs && git commit -m "feat(hud): éditeur en aperçu stylisé + toggle Éditer"`

---

## Notes de fin

- Testé : `lib/edition-render.mjs` (`node --test`). UI (3 surfaces + toggle + liens) vérifiée en lançant l'app.
- `escapeHtml` est importé dans `renderer.mjs` (déjà utilisé) ; vérifier qu'il l'est pour le fallback du reader (Step 4 Task 2).
- Build log à écrire en fin d'exécution (convention CLAUDE.md) : `docs/buildlog/2026-06-24-e-rendu-editions.md`.
