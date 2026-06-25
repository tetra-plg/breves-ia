# §5 « Échantillons vivants » curaté manuellement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la fenêtre glissante FIFO de §5 par une liste curatée à la main (3 max), gérée dans l'éditeur SOUL, en piochant des brèves dans les éditions passées ; l'archivage ne touche plus §5.

**Architecture :** Un module pur extrait les brèves d'une note archivée (`lib/edition-breves.mjs`). `lib/soul-model.mjs` simplifie §5 (drop des flags) et gagne un réécriveur de §5. `hud/engine.mjs` + IPC exposent l'enregistrement de §5. L'éditeur SOUL rend §5 éditable (retrait + ajout via sélecteur d'éditions). Les commandes d'archivage perdent la logique §5.

**Tech Stack :** Node ≥ 20, ESM, vanilla JS/HTML, `node --test`, Electron.

## Global Constraints

- **§5 : 3 maximum, plafond dur, pas de FIFO, pas d'éviction auto.** L'archivage ne modifie plus §5.
- **Format d'entrée** : `### [YYYY-MM-DD] · <source>` (source = domaine de l'URL, omise si inconnue → `### [YYYY-MM-DD]`) puis le verbatim (accroche `**…**` + corps + URL).
- **Flags `seed:` / `épinglé:` supprimés** du format ; `parseEchantillons` tolère l'ancien format en lecture (ignore les flags, garde date + texte).
- **`version` SOUL** reste `v{nb leçons §6 + 1}` (inchangée). `soulVersion` à l'archivage inchangé.
- **Ajout / retrait uniquement** (pas de réordonnancement, pas de texte libre).
- Pas de nouvelle dépendance. Préambule §5 normalisé à chaque enregistrement.

---

## Task 1 : `lib/edition-breves.mjs` — extraction des brèves d'une note

**Files:**
- Create: `lib/edition-breves.mjs`
- Test: `test/edition-breves.test.mjs`

**Interfaces:**
- Produces : `extractBreves(noteText) -> [{ date, source, accroche, texte }]`. `date` = libellé de la ligne `— … —` courante ; `source` = domaine (`hostname` sans `www.`) de la 1re URL de la brève (`''` si aucune) ; `accroche` = texte du 1er `**…**` ; `texte` = verbatim (accroche + corps + URL) trimé. Titre/intro avant la 1re date, titres `##`, séparateurs `---` et tableaux `|` ne produisent pas de brève. Entrée non-string → `[]`.

- [ ] **Step 1 : Écrire les tests**

```js
// test/edition-breves.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBreves } from '../lib/edition-breves.mjs';

const NOTE = `# Brèves IA — édition Merim (PM)
Un mot d'intro qui n'est pas une brève.

— 17 juin 2026 —
**Google publie l'OKF.** Un kit open source sous Apache 2.0 pour les agents.
https://cloud.google.com/blog/okf

**Sakana sort Fugu.** Un orchestrateur de LLM, présenté comme sobre.
https://sakana.ai/fugu/

— 18 juin 2026 —
**GLM 5.2 débarque.** Modèle ouvert, 1M de contexte annoncé.
https://z.ai/blog/glm-5-2

## Sources
| Sujet | URL | Clipping |
|---|---|---|
| GLM | https://z.ai/blog/glm-5-2 | = citée |`;

test('extrait une brève par accroche, avec date/source/accroche/texte', () => {
  const b = extractBreves(NOTE);
  assert.equal(b.length, 3);
  assert.equal(b[0].date, '17 juin 2026');
  assert.equal(b[0].source, 'cloud.google.com');
  assert.equal(b[0].accroche, "Google publie l'OKF.");
  assert.match(b[0].texte, /^\*\*Google publie l'OKF\.\*\* Un kit open source/);
  assert.match(b[0].texte, /https:\/\/cloud\.google\.com\/blog\/okf$/);
  assert.equal(b[2].date, '18 juin 2026');
  assert.equal(b[2].source, 'z.ai');
});
test('le titre, l’intro et le bloc Sources ne sont pas des brèves', () => {
  const b = extractBreves(NOTE);
  assert.ok(b.every((x) => !/Sujet \| URL/.test(x.texte)));
  assert.ok(b.every((x) => !/édition Merim/.test(x.texte)));
});
test('entrée vide ou non-string → []', () => {
  assert.deepEqual(extractBreves(''), []);
  assert.deepEqual(extractBreves(null), []);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/edition-breves.test.mjs` → FAIL (module absent).

- [ ] **Step 3 : Implémenter `lib/edition-breves.mjs`**

```js
const DATE_RE = /^—\s*(.+?)\s*—$/;
const URL_RE = /^(?:source\s*:\s*)?(https?:\/\/\S+)$/i;
const H_RE = /^#{1,6}\s/;
const HR_RE = /^-{3,}$/;

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function accrocheOf(texte) {
  const m = texte.match(/\*\*(.+?)\*\*/);
  return m ? m[1].trim() : texte.split('\n')[0].trim();
}

export function extractBreves(noteText) {
  if (typeof noteText !== 'string') return [];
  const lines = noteText.split(/\r?\n/);
  const breves = [];
  let curDate = '';
  let firstDateSeen = false;
  let cur = null; // { date, lines:[], url:'' }
  const flush = () => {
    if (cur && cur.lines.length) {
      const texte = cur.lines.join('\n').trim();
      breves.push({ date: cur.date, source: domainOf(cur.url), accroche: accrocheOf(texte), texte });
    }
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dm = line.match(DATE_RE);
    if (dm) { flush(); curDate = dm[1].trim(); firstDateSeen = true; continue; }
    if (!firstDateSeen) continue;                       // titre / intro
    if (H_RE.test(line) || HR_RE.test(line) || line.includes('|')) { flush(); continue; }
    const um = line.match(URL_RE);
    if (um) { if (cur) { cur.url = cur.url || um[1]; cur.lines.push(um[1]); } continue; }
    if (/^\*\*/.test(line)) { flush(); cur = { date: curDate, lines: [line], url: '' }; continue; }
    if (cur) cur.lines.push(line);                      // corps
  }
  flush();
  return breves;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/edition-breves.test.mjs` → PASS. Puis `npm test`.

- [ ] **Step 5 : Commit** — `git add lib/edition-breves.mjs test/edition-breves.test.mjs && git commit -m "feat(soul): extractBreves (découpe une note archivée en brèves)"`

---

## Task 2 : `lib/soul-model.mjs` — §5 simplifié + réécriture

**Files:**
- Modify: `lib/soul-model.mjs`
- Test: `test/soul-model.test.mjs`

**Interfaces:**
- Consumes : rien de nouveau.
- Produces :
  - `parseEchantillons` (interne) renvoie désormais `{ date, source, texte }` (drop `seed`/`epingle`) ; tolère l'ancien format (`[date] seed: … | épinglé: …`) en gardant date + texte, source `''`.
  - `parseSoul(raw).echantillons` = `[{ date, source, texte }]`.
  - `serializeEchantillons(entries) -> string` : préambule normalisé + au plus 3 entrées `### [date] · source` (source omise si vide) + texte.
  - `replaceSoulEchantillons(raw, entries) -> raw'` : remplace le corps de §5 par `serializeEchantillons(entries)` ; n'altère aucune autre section.

- [ ] **Step 1 : Écrire les tests** (AJOUTER à `test/soul-model.test.mjs`)

```js
import { parseSoul, replaceSoulEchantillons, serializeEchantillons } from '../lib/soul-model.mjs';

const SOUL = `# SOUL

## 1. Qui parle
Pierre.

## 5. Échantillons vivants (fenêtre glissante)
> ancien préambule
### [2026-06-17] seed: false | épinglé: non
**Vieux.** corps vieux.
https://a.com/x

## 6. Journal d'évolution
> j
- [2026-06-24] une leçon.`;

test('parseEchantillons : nouveau shape {date,source,texte}, tolère l’ancien format', () => {
  const s = parseSoul(SOUL);
  assert.equal(s.echantillons.length, 1);
  assert.equal(s.echantillons[0].date, '2026-06-17');
  assert.equal(s.echantillons[0].source, '');           // ancien format : pas de source
  assert.match(s.echantillons[0].texte, /^\*\*Vieux\.\*\*/);
  assert.equal(s.echantillons[0].seed, undefined);       // flags supprimés
});
test('serializeEchantillons : préambule + entrées, source omise si vide, cap 3', () => {
  const out = serializeEchantillons([
    { date: '2026-06-18', source: 'z.ai', texte: '**A.** corps a.' },
    { date: '2026-06-18', source: '', texte: '**B.** corps b.' },
    { date: '2026-06-18', source: 'c.com', texte: '**C.** corps c.' },
    { date: '2026-06-18', source: 'd.com', texte: '**D.** corps d.' },
  ]);
  assert.match(out, /^> /);                               // préambule
  assert.match(out, /### \[2026-06-18\] · z\.ai\n\*\*A\.\*\*/);
  assert.match(out, /### \[2026-06-18\]\n\*\*B\.\*\*/);   // source vide → pas de « · »
  assert.doesNotMatch(out, /\*\*D\.\*\*/);                // 4e ignoré (cap 3)
});
test('replaceSoulEchantillons : remplace §5, garde §1 et §6', () => {
  const out = replaceSoulEchantillons(SOUL, [{ date: '2026-06-18', source: 'z.ai', texte: '**Neuf.** corps.' }]);
  assert.match(out, /## 1\. Qui parle\nPierre\./);
  assert.match(out, /## 6\. Journal[\s\S]*une leçon\./);
  assert.match(out, /### \[2026-06-18\] · z\.ai\n\*\*Neuf\.\*\*/);
  assert.doesNotMatch(out, /Vieux/);                      // ancien échantillon remplacé
  assert.equal(parseSoul(out).echantillons.length, 1);
});
test('replaceSoulEchantillons : liste vide → préambule seul', () => {
  const out = replaceSoulEchantillons(SOUL, []);
  assert.equal(parseSoul(out).echantillons.length, 0);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/soul-model.test.mjs` → FAIL.

- [ ] **Step 3 : Implémenter dans `lib/soul-model.mjs`**

Remplacer `parseEchantillons` par :

```js
function parseEchantillons(body5) {
  return body5.split(/^###\s+/m).slice(1).map((chunk) => {
    const nl = chunk.indexOf('\n');
    const head = nl === -1 ? chunk : chunk.slice(0, nl);
    const dm = head.match(/^\[(\d{4}-\d{2}-\d{2})\]/);
    const sm = head.match(/·\s*(.+?)\s*$/);              // source (nouveau format) après « · »
    return {
      date: dm ? dm[1] : '',
      source: sm ? sm[1].trim() : '',
      texte: nl === -1 ? '' : chunk.slice(nl + 1).trim(),
    };
  });
}
```

Ajouter (avant `replaceSoulSections`) :

```js
const ECH_PREAMBULE = '> Jusqu\'à 3 brèves validées, choisies à la main, verbatim. Elles donnent le ton de la plume : densité, rythme, structure. Curées depuis l\'éditeur SOUL.';

export function serializeEchantillons(entries) {
  const items = (entries || []).slice(0, 3).map((e) => {
    const head = e.source ? `### [${e.date}] · ${e.source}` : `### [${e.date}]`;
    return `${head}\n${String(e.texte || '').trim()}`;
  });
  return [ECH_PREAMBULE, ...items].join('\n\n') + '\n';
}

export function replaceSoulEchantillons(raw, entries) {
  const body = serializeEchantillons(entries);
  const parts = String(raw).split(/(^##\s+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] || '';
    if (/^5\./.test(block)) {
      const nl = block.indexOf('\n');
      const titleLine = nl === -1 ? block : block.slice(0, nl);
      parts[i + 1] = `${titleLine}\n${body}\n`;
    }
  }
  return parts.join('');
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/soul-model.test.mjs` → PASS. Puis `npm test`.

  Note : si un test existant s'appuyait sur `echantillons[].epingle`/`.seed`, le mettre à jour vers le nouveau shape `{date, source, texte}` (ces champs n'existent plus).

- [ ] **Step 5 : Commit** — `git add lib/soul-model.mjs test/soul-model.test.mjs && git commit -m "feat(soul): §5 simplifié (drop flags) + serialize/replaceSoulEchantillons"`

---

## Task 3 : `hud/engine.mjs` — `saveSoulEchantillons` + IPC

**Files:**
- Modify: `hud/engine.mjs`, `hud/main.mjs`, `hud/preload.cjs`
- Test: `test/engine.test.mjs`

**Interfaces:**
- Consumes : `replaceSoulEchantillons` (Task 2), `SOUL_PARTS` (déjà présent dans engine.mjs).
- Produces : `saveSoulEchantillons(deps, entries) -> { ok:true } | { ok:false, error }` — refuse un tableau de longueur > 3 ou contenant un `texte` vide/blanc (sans écrire) ; sinon réécrit §5 et écrit le fichier SOUL. Preload : `window.breves.saveSoulEchantillons(entries)`.

- [ ] **Step 1 : Écrire les tests** (AJOUTER à `test/engine.test.mjs`)

```js
import { saveSoulEchantillons } from '../hud/engine.mjs';

const SOUL_MIN = '# SOUL\n\n## 5. Échantillons vivants\n> p\n### [2026-06-17]\n**Vieux.** x.\n\n## 6. Journal\n> j\n- [2026-06-24] l.';

test('saveSoulEchantillons écrit §5 (≤ 3)', () => {
  let wrote = null;
  const deps = { repoDir: '/repo', readFile: () => SOUL_MIN, writeFile: (p, t) => { wrote = { p, t }; } };
  const r = saveSoulEchantillons(deps, [{ date: '2026-06-18', source: 'z.ai', texte: '**Neuf.** corps.' }]);
  assert.equal(r.ok, true);
  assert.match(wrote.p, /SOUL\.md$/);
  assert.match(wrote.t, /### \[2026-06-18\] · z\.ai/);
  assert.doesNotMatch(wrote.t, /Vieux/);
});
test('saveSoulEchantillons refuse > 3 et texte vide, sans écrire', () => {
  let called = false;
  const deps = { repoDir: '/repo', readFile: () => SOUL_MIN, writeFile: () => { called = true; } };
  const quatre = [1, 2, 3, 4].map((n) => ({ date: '2026-06-18', source: '', texte: `**${n}.** x.` }));
  assert.equal(saveSoulEchantillons(deps, quatre).ok, false);
  assert.equal(saveSoulEchantillons(deps, [{ date: '2026-06-18', source: '', texte: '   ' }]).ok, false);
  assert.equal(called, false);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/engine.test.mjs` → FAIL.

- [ ] **Step 3 : Implémenter**

Dans `hud/engine.mjs`, compléter l'import soul-model :

```js
import { parseSoul, replaceSoulSections, replaceSoulEchantillons } from '../lib/soul-model.mjs';
```

Ajouter (près de `saveSoulSections`) :

```js
export function saveSoulEchantillons(deps, entries) {
  if (!Array.isArray(entries) || entries.length > 3) return { ok: false, error: 'max 3 échantillons' };
  if (entries.some((e) => typeof e?.texte !== 'string' || !e.texte.trim())) return { ok: false, error: 'échantillon vide' };
  try {
    const path = join(deps.repoDir, ...SOUL_PARTS);
    deps.writeFile(path, replaceSoulEchantillons(deps.readFile(path), entries));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
```

Dans `hud/main.mjs`, compléter l'import depuis `./engine.mjs` avec `saveSoulEchantillons`, puis ajouter (près de `save-soul-sections`) :

```js
  ipcMain.handle('save-soul-echantillons', (_e, entries) => saveSoulEchantillons(deps, entries));
```

Dans `hud/preload.cjs`, ajouter :

```js
  saveSoulEchantillons: (entries) => ipcRenderer.invoke('save-soul-echantillons', entries),
```

- [ ] **Step 4 : Vérifier** — `node --test test/engine.test.mjs` → PASS ; `npm test` vert ; `node --check hud/main.mjs`.

- [ ] **Step 5 : Commit** — `git add hud/engine.mjs hud/main.mjs hud/preload.cjs test/engine.test.mjs && git commit -m "feat(engine): saveSoulEchantillons + IPC"`

---

## Task 4 : Éditeur SOUL — §5 éditable (retrait + ajout via sélecteur)

**Files:**
- Modify: `hud/companion.html`, `hud/renderer.mjs`

**Note (vérification) :** DOM/Electron, vérifié en lançant l'app.

- [ ] **Step 1 : companion.html — remplacer le bloc §5 statique**

Remplacer :

```html
        <div class="eyebrow" style="margin:22px 0 9px">5 · Échantillons vivants</div>
        <div id="soul-echantillons" style="display:flex;flex-direction:column;gap:9px"></div>
```

par :

```html
        <div class="eyebrow" style="margin:22px 0 9px">5 · Échantillons vivants <span class="faint" style="font:400 10px var(--mono)">(<span id="ech-count">0</span>/3, choisis à la main)</span></div>
        <div id="soul-echantillons" style="display:flex;flex-direction:column;gap:9px"></div>
        <div class="row" style="margin-top:9px">
          <button id="btn-ech-add" class="btn-ghost" style="flex:1">+ Ajouter depuis une édition</button>
          <button id="btn-ech-save" class="btn-primary" style="flex:1">Enregistrer §5</button>
        </div>
        <div id="ech-picker" class="overlay" hidden>
          <div class="sheet">
            <div class="pad">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><b style="font:600 14px var(--display)">Choisir une brève</b><button id="ech-picker-close" class="btn-ghost" style="margin-left:auto;padding:7px 13px">Fermer</button></div>
              <div id="ech-picker-body" style="display:flex;flex-direction:column;gap:10px"></div>
            </div>
          </div>
        </div>
```

- [ ] **Step 2 : renderer.mjs — import + état + rendu §5**

En tête de fichier, compléter les imports lib avec `extractBreves` :

```js
import { extractBreves } from '../lib/edition-breves.mjs';
```

Remplacer le bloc d'échantillons dans `renderSoul` (la portion `const ech = $('#soul-echantillons'); … });`) par un appel `renderEchantillons()` après avoir chargé l'état local :

```js
  echantillons = (s.echantillons || []).map((e) => ({ date: e.date, source: e.source || '', texte: e.texte }));
  renderEchantillons();
```

Ajouter (au-dessus de `renderSoul`) l'état + les fonctions :

```js
let echantillons = []; // état local de §5 jusqu'à l'enregistrement
function renderEchantillons() {
  const box = $('#soul-echantillons'); box.innerHTML = '';
  $('#ech-count').textContent = String(echantillons.length);
  if (!echantillons.length) box.appendChild(el('div', 'faint', 'Aucun échantillon. Ajoute jusqu’à 3 brèves depuis tes éditions.'));
  echantillons.forEach((e, i) => {
    const card = el('div', 'card');
    card.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font:500 10.5px var(--mono);color:var(--accent)">${escapeHtml(dateLong(e.date))}${e.source ? ' · ' + escapeHtml(e.source) : ''}</span><button class="ech-del btn-ghost" style="margin-left:auto;padding:5px 10px;font-size:11px">Retirer</button></div><div style="font:400 12.5px/1.5 var(--body)">${inlineMd(e.texte)}</div>`;
    card.querySelector('.ech-del').onclick = () => { echantillons.splice(i, 1); renderEchantillons(); };
    box.appendChild(card);
  });
  $('#btn-ech-add').disabled = echantillons.length >= 3;
}
async function openEchPicker() {
  const body = $('#ech-picker-body'); body.innerHTML = '';
  const eds = state.dashboard?.editions || [];
  if (!eds.length) { body.appendChild(el('div', 'faint', 'Aucune édition archivée.')); }
  eds.forEach((ed) => {
    const row = el('button', 'card'); row.style.cssText = 'display:block;width:100%;text-align:left';
    row.textContent = `${dateLong(ed.date)}${ed.title ? ' · ' + ed.title : ''}`;
    row.onclick = () => showEchBrevesOf(ed);
    body.appendChild(row);
  });
  $('#ech-picker').hidden = false;
}
async function showEchBrevesOf(ed) {
  const body = $('#ech-picker-body'); body.innerHTML = '';
  const back = el('button', 'btn-ghost', '‹ éditions'); back.style.cssText = 'padding:6px 11px;margin-bottom:4px'; back.onclick = openEchPicker; body.appendChild(back);
  const text = ed.file ? await window.breves.readEdition(ed.file) : '';
  const breves = extractBreves(text || '');
  if (!breves.length) { body.appendChild(el('div', 'faint', 'Aucune brève détectée.')); return; }
  breves.forEach((b) => {
    const card = el('div', 'card');
    card.innerHTML = `<div style="font:400 12px/1.5 var(--body);margin-bottom:8px">${inlineMd(b.texte)}</div>`;
    const add = el('button', 'btn-primary', 'Ajouter cet échantillon'); add.style.cssText = 'padding:7px 12px;font-size:12px';
    add.onclick = () => {
      if (echantillons.length >= 3) { toast('3 échantillons maximum.'); return; }
      echantillons.push({ date: ed.date, source: b.source, texte: b.texte }); // ed.date = ISO de l'édition (format §5)
      $('#ech-picker').hidden = true; renderEchantillons();
    };
    card.appendChild(add); body.appendChild(card);
  });
}
async function saveEchantillons() {
  const r = await window.breves.saveSoulEchantillons(echantillons);
  toast(r && r.ok ? 'Échantillons §5 enregistrés' : 'Échec : ' + (r?.error || 'inconnu'));
}
```

  Note : on stocke `ed.date` (date **ISO** de l'édition, ex. `2026-06-17`) — c'est ce qu'attend le format `### [YYYY-MM-DD]` et le regex de `parseEchantillons`. `b.date` (libellé en toutes lettres) n'est pas utilisé pour le stockage. `dateLong`, `extractBreves`, `escapeHtml`, `inlineMd`, `el`, `toast` sont déjà importés/définis dans le renderer.

- [ ] **Step 3 : renderer.mjs — câblage** — dans `wire()`, ajouter :

```js
  $('#btn-ech-add').onclick = openEchPicker;
  $('#btn-ech-save').onclick = saveEchantillons;
  $('#ech-picker-close').onclick = () => { $('#ech-picker').hidden = true; };
```

- [ ] **Step 4 : Vérifier** — `node --check hud/renderer.mjs` ; `npm test` vert. Lancer l'app : ouvrir SOUL (icône ✦) → §5 affiche les échantillons actuels avec « Retirer » ; « + Ajouter depuis une édition » ouvre le sélecteur → choisir une édition → ses brèves → « Ajouter cet échantillon » (bloqué à 3, toast) ; « Enregistrer §5 » → toast ; rouvrir SOUL → la sélection est persistée ; vérifier `.claude/breves-ia/SOUL.md` §5 (entrées `### [date] · source`).

- [ ] **Step 5 : Commit** — `git add hud/companion.html hud/renderer.mjs && git commit -m "feat(hud): éditeur SOUL §5 manuel (retrait + ajout depuis éditions)"`

---

## Task 5 : Archivage sans §5 + réinitialisation de §5

**Files:**
- Modify: `.claude/commands/breves-archive.md`, `.claude/breves-ia/_archive.md`, `.claude/breves-ia/SOUL.md`

**Note :** fichiers de prompt/données ; vérification par `parseSoul` + `grep`.

- [ ] **Step 1 : `.claude/commands/breves-archive.md`** — supprimer la puce de MAJ §5. Retirer la ligne :

```
- **MAJ SOUL §5** : insère la/les brève(s) validée(s) en tête de la fenêtre glissante (FIFO 3 hors épinglés).
```

  et, dans la garde-fou §5 :

```
- MAJ SOUL §5 = fenêtre glissante FIFO 3 hors épinglés ; supprime les entrées `seed: true` une fois la fenêtre remplie.
```

  Mettre à jour l'`archiveSteps` exemple : l'entrée « SOUL mise à jour » ne concerne plus que §6 (`"d": "vX → vY · +K leçon(s)"` reste correct ; aucune mention §5).

- [ ] **Step 2 : `.claude/breves-ia/_archive.md`** — retirer toute la procédure de mise à jour de §5 (insertion en tête, fenêtre glissante FIFO 3, suppression des `seed: true`). Conserver la mise à jour du §6 (journal) et le calcul de `soulVersion` (basé sur le nombre de leçons §6). Si une étape « SOUL » mentionne §5, la restreindre au §6.

- [ ] **Step 3 : `.claude/breves-ia/SOUL.md` — réinitialiser §5** — remplacer le titre et le corps de la section §5 par (vide, nouveau préambule) :

```
## 5. Échantillons vivants
> Jusqu'à 3 brèves validées, choisies à la main, verbatim. Elles donnent le ton de la plume : densité, rythme, structure. Curées depuis l'éditeur SOUL.
```

  (supprimer les 3 entrées smoke `### […]` actuelles et le `(fenêtre glissante)` du titre).

- [ ] **Step 4 : Vérifier**

```bash
node --input-type=module -e "import {parseSoul} from './lib/soul-model.mjs'; import {readFileSync} from 'node:fs'; const s=parseSoul(readFileSync('.claude/breves-ia/SOUL.md','utf8')); console.log('echantillons:', s.echantillons.length, '| version:', s.version);"
```

  Attendu : `echantillons: 0`. Puis vérifier l'absence de FIFO §5 :

```bash
grep -n "FIFO\|fenêtre glissante\|§5" .claude/commands/breves-archive.md .claude/breves-ia/_archive.md || echo "plus de logique §5 dans l'archivage"
```

- [ ] **Step 5 : Commit** — `git add .claude/commands/breves-archive.md .claude/breves-ia/_archive.md .claude/breves-ia/SOUL.md && git commit -m "feat(archive): retire la MAJ §5 (FIFO) + réinitialise §5"`

---

## Notes de fin

- Modules testés : `extractBreves`, `parseEchantillons`/`serializeEchantillons`/`replaceSoulEchantillons`, `saveSoulEchantillons`. UI et fichiers de prompt vérifiés à la main.
- Boucle complète : éditeur SOUL → `saveSoulEchantillons` → §5 du fichier SOUL → lu par `/breves-draft` (prompt §5) à la rédaction suivante.
- Build log à écrire en fin d'exécution : `docs/buildlog/2026-06-25-i-soul-echantillons-manuels.md`.
```

