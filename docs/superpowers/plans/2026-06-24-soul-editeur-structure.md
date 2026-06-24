# Éditeur SOUL structuré — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'éditeur SOUL brut de l'app par une vue structurée : §1-4 éditables (4 textareas sauvés dans `SOUL.md`), §5 (échantillons) et §6 (journal) en affichage read-only.

**Architecture :** Un module pur `lib/soul-model.mjs` parse `SOUL.md` en sections et réécrit **uniquement** §1-4 (préservant §5/§6 octet pour octet). `hud/engine.mjs` l'enveloppe avec `deps` (getSoul/saveSoulSections). L'UI rend 4 textareas + un affichage read-only de §5/§6. Le moteur de brèves (archive/draft) n'est pas touché.

**Tech Stack :** Node ≥ 20, ESM, vanilla JS/HTML, `node --test`, Electron.

## Global Constraints

- **Éditable** : §1 (Qui parle), §2 (Audience), §3 (Voix & tics), §4 (Lignes rouges). **Read-only** : §5, §6.
- **Garde-fou d'intégrité** : sauver §1-4 ne doit JAMAIS modifier §5, §6, le titre `# …`, ni les notes `>` du fichier.
- **Moteur inchangé** : aucune modification de `breves-archive`/`breves-draft` ni du flux d'archive.
- **SOUL** : `<repoDir>/.claude/breves-ia/SOUL.md`. Format §6 réel : `- [YYYY-MM-DD] <texte>` (crochets). Format §5 réel : `### [YYYY-MM-DD] seed: <true|false> | épinglé: <oui|non>` puis le corps de la brève.
- **Refus de vidage** : `saveSoulSections` refuse si l'un des 4 champs est vide.
- Pas de nouvelle dépendance.

---

## Task 1 : Modèle SOUL pur — `parseSoul` + `replaceSoulSections`

**Files:**
- Create: `lib/soul-model.mjs`, `test/fixtures/SOUL.full.md`
- Test: `test/soul-model.test.mjs`

**Interfaces:**
- Produces :
  - `parseSoul(raw) -> { version, quiParle, audience, voix, lignesRouges, echantillons, journal }`
    - `quiParle/audience/voix/lignesRouges` = corps brut (trim) de §1/§2/§3/§4 (sans la ligne de titre).
    - `echantillons` = `[{ date, seed:boolean, epingle:boolean, texte }]` (§5).
    - `journal` = `[{ date, texte }]` (§6, format `- [date] …`).
    - `version` = `'v' + (journal.length + 1)`.
    - Section absente ⇒ chaîne vide / tableau vide (ne jette pas).
  - `replaceSoulSections(raw, { quiParle, audience, voix, lignesRouges }) -> raw'` : remplace le corps de §1-4 ; §5/§6/préambule intacts.

- [ ] **Step 1 : Créer la fixture** `test/fixtures/SOUL.full.md`

```markdown
# SOUL — Brèves IA (la plume de Pierre)

> Identité vivante. Ce fichier ÉVOLUE.

## 1. Qui parle
Je suis Pierre, VP Engineering.

## 2. Audience
Mes collègues PM de Merim.

## 3. Voix & tics signatures
- Première personne.
- Le fait d'abord, l'aparté entre parenthèses ensuite.

## 4. Lignes rouges
- Jamais d'invention.
- Pas de jargon non explicité.

## 5. Échantillons vivants (fenêtre glissante)
> Les ~3 dernières brèves VALIDÉES, en FIFO.

### [2026-06-24] seed: false | épinglé: non
**Une accroche en gras.** Le corps de la première brève.

### [2026-06-17] seed: false | épinglé: oui
**Autre accroche.** Le corps de la seconde brève.

## 6. Journal d'évolution
> Règles de style apprises au fil des éditions.

- [2026-06-24] Ne jamais construire une brève autour d'un démenti.
- [2026-06-06] Garder la parenthèse courte.
```

- [ ] **Step 2 : Écrire les tests**

```js
// test/soul-model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSoul, replaceSoulSections } from '../lib/soul-model.mjs';

const RAW = readFileSync(new URL('./fixtures/SOUL.full.md', import.meta.url), 'utf8');

test('parseSoul extrait §1-4 (corps brut)', () => {
  const s = parseSoul(RAW);
  assert.equal(s.quiParle, 'Je suis Pierre, VP Engineering.');
  assert.equal(s.audience, 'Mes collègues PM de Merim.');
  assert.match(s.voix, /Première personne/);
  assert.match(s.lignesRouges, /Jamais d'invention/);
});
test('parseSoul extrait §5 échantillons', () => {
  const s = parseSoul(RAW);
  assert.equal(s.echantillons.length, 2);
  assert.deepEqual(
    { date: s.echantillons[0].date, seed: s.echantillons[0].seed, epingle: s.echantillons[0].epingle },
    { date: '2026-06-24', seed: false, epingle: false },
  );
  assert.equal(s.echantillons[1].epingle, true);            // épinglé: oui
  assert.match(s.echantillons[0].texte, /accroche en gras/);
});
test('parseSoul extrait §6 journal + version', () => {
  const s = parseSoul(RAW);
  assert.equal(s.journal.length, 2);
  assert.equal(s.journal[0].date, '2026-06-24');
  assert.match(s.journal[0].texte, /démenti/);
  assert.equal(s.version, 'v3');                            // 2 leçons + 1
});
test('parseSoul tolère une SOUL minimale', () => {
  const s = parseSoul('# SOUL\n\n## 1. Qui parle\nX\n');
  assert.equal(s.quiParle, 'X');
  assert.deepEqual(s.echantillons, []);
  assert.deepEqual(s.journal, []);
  assert.equal(s.version, 'v1');
});
test('replaceSoulSections réécrit §1-4 sans toucher §5/§6', () => {
  const out = replaceSoulSections(RAW, {
    quiParle: 'Nouvelle identité.', audience: 'Nouveau public.',
    voix: '- Nouveau tic.', lignesRouges: '- Nouvelle ligne rouge.',
  });
  // §1-4 reflètent les nouvelles valeurs
  const re = parseSoul(out);
  assert.equal(re.quiParle, 'Nouvelle identité.');
  assert.equal(re.voix, '- Nouveau tic.');
  // §5 + §6 octet pour octet identiques
  const tail = (t) => t.slice(t.indexOf('## 5.'));
  assert.equal(tail(out), tail(RAW));
});
```

- [ ] **Step 3 : Lancer, vérifier l'échec** — `node --test test/soul-model.test.mjs` → FAIL (module manquant).

- [ ] **Step 4 : Créer lib/soul-model.mjs**

```js
// Corps (trim) de la section "## N. …", sans la ligne de titre. '' si absente.
function sectionBody(raw, n) {
  for (const part of String(raw).split(/^##\s+/m)) {
    if (new RegExp(`^${n}\\.`).test(part)) {
      const nl = part.indexOf('\n');
      return nl === -1 ? '' : part.slice(nl + 1).trim();
    }
  }
  return '';
}

function parseEchantillons(body5) {
  return body5.split(/^###\s+/m).slice(1).map((chunk) => {
    const head = chunk.slice(0, chunk.indexOf('\n') === -1 ? undefined : chunk.indexOf('\n'));
    const m = head.match(/^\[(\d{4}-\d{2}-\d{2})\][^\n]*seed:\s*(\w+)[^\n]*épinglé:\s*(\S+)/);
    const nl = chunk.indexOf('\n');
    return {
      date: m ? m[1] : '',
      seed: m ? m[2] === 'true' : false,
      epingle: m ? /^oui/i.test(m[3]) : false,
      texte: nl === -1 ? '' : chunk.slice(nl + 1).trim(),
    };
  });
}

function parseJournal(body6) {
  return [...body6.matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)]
    .map((m) => ({ date: m[1], texte: m[2].trim() }));
}

export function parseSoul(raw) {
  const s = String(raw);
  const journal = parseJournal(sectionBody(s, 6));
  return {
    version: `v${journal.length + 1}`,
    quiParle: sectionBody(s, 1),
    audience: sectionBody(s, 2),
    voix: sectionBody(s, 3),
    lignesRouges: sectionBody(s, 4),
    echantillons: parseEchantillons(sectionBody(s, 5)),
    journal,
  };
}

export function replaceSoulSections(raw, { quiParle, audience, voix, lignesRouges }) {
  const fields = { 1: quiParle, 2: audience, 3: voix, 4: lignesRouges };
  // Split en gardant les délimiteurs '## ' : [préambule, '## ', 'N. Titre\ncorps…', '## ', …]
  const parts = String(raw).split(/(^##\s+)/m);
  for (let i = 1; i < parts.length; i += 2) {
    const block = parts[i + 1] || '';
    const m = block.match(/^(\d)\./);
    if (m && fields[m[1]] != null) {
      const nl = block.indexOf('\n');
      const titleLine = nl === -1 ? block : block.slice(0, nl);
      parts[i + 1] = `${titleLine}\n${fields[m[1]]}\n\n`;
    }
  }
  return parts.join('');
}
```

- [ ] **Step 5 : Lancer, vérifier le succès** — `node --test test/soul-model.test.mjs` → PASS (5 tests).

- [ ] **Step 6 : Commit** — `git add lib/soul-model.mjs test/soul-model.test.mjs test/fixtures/SOUL.full.md && git commit -m "feat(soul): modèle pur parseSoul + replaceSoulSections (round-trip §1-4)"`

---

## Task 2 : Aligner `readSoul` sur le format §6 réel `[date]`

**Files:**
- Modify: `lib/soul.mjs`, `test/fixtures/SOUL.sample.md`
- Test: `test/soul.test.mjs` (inchangé dans ses assertions)

**Contexte :** `readSoul` (badge version dashboard) attend `- (date)` (parenthèses) alors que la vraie SOUL utilise `- [date]` (crochets) → il compte 0 leçon et affiche toujours `v1`. On aligne sur les crochets pour que le dashboard montre la vraie version (cohérent avec `parseSoul`).

- [ ] **Step 1 : Mettre à jour la fixture** `test/fixtures/SOUL.sample.md` — remplacer les lignes de leçons `- (2026-06-17) …` par le format crochets `- [2026-06-17] …` (garder 2 leçons datées pour conserver `v3`). Laisser la ligne `- (vide — première édition)` du second cas telle quelle (elle ne matche aucun format → 0 leçon → v1).

- [ ] **Step 2 : Lancer le test, vérifier l'échec** — `node --test test/soul.test.mjs` → FAIL (version v1 au lieu de v3, car la regex parenthèses ne matche plus les crochets).

- [ ] **Step 3 : Corriger la regex** dans `lib/soul.mjs` — la fonction `datedLessons` :

```js
const datedLessons = (txt) => [...txt.matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)]
  .map((m) => ({ date: m[1], text: m[2].trim() }));
```

(seul le `\(…\)` devient `\[…\]`.)

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/soul.test.mjs` → PASS (version v3 / v1 selon les cas).

- [ ] **Step 5 : Commit** — `git add lib/soul.mjs test/fixtures/SOUL.sample.md && git commit -m "fix(soul): readSoul lit le format réel du journal [date] (badge version correct)"`

---

## Task 3 : Engine — `getSoul` + `saveSoulSections` ; retrait de l'éditeur brut

**Files:**
- Modify: `hud/engine.mjs`
- Test: `test/engine.test.mjs`

**Interfaces:**
- Consumes : `parseSoul`, `replaceSoulSections` (Task 1).
- Produces :
  - `getSoul(deps) -> parseSoul(<repoDir SOUL>) | null` (null si lecture échoue).
  - `saveSoulSections(deps, edits) -> { ok:true } | { ok:false, error }`. `edits = { quiParle, audience, voix, lignesRouges }`. Refuse si l'un est absent ou vide (n'écrit pas). Lit le fichier, applique `replaceSoulSections`, écrit.
- Retire `readSoulRaw` et `saveSoul`.

**Note d'ordre :** après cette tâche, `hud/main.mjs`/`preload.cjs`/`renderer.mjs` référencent encore `readSoulRaw`/`saveSoul` (retirés en Tasks 4-5) — `npm test` reste vert (les tests n'importent pas l'UI), mais l'app n'est relançable qu'après Task 4. C'est attendu ; la suite logique reste la garante.

- [ ] **Step 1 : Écrire les tests** (AJOUTER à `test/engine.test.mjs`)

```js
import { getSoul, saveSoulSections } from '../hud/engine.mjs';

const SOUL_FIXTURE = readFileSync(new URL('./fixtures/SOUL.full.md', import.meta.url), 'utf8');
// (ajouter en haut du fichier : import { readFileSync } from 'node:fs';)

test('getSoul parse le fichier SOUL au bon chemin', () => {
  let asked = null;
  const deps = { repoDir: '/repo', readFile: (p) => { asked = p; return SOUL_FIXTURE; } };
  const s = getSoul(deps);
  assert.equal(s.quiParle, 'Je suis Pierre, VP Engineering.');
  assert.match(asked, /\/repo\/\.claude\/breves-ia\/SOUL\.md$/);
});
test('getSoul renvoie null si lecture échoue', () => {
  const deps = { repoDir: '/repo', readFile: () => { throw new Error('ENOENT'); } };
  assert.equal(getSoul(deps), null);
});
test('saveSoulSections écrit le markdown avec §1-4 modifiés', () => {
  let wrote = null;
  const deps = { repoDir: '/repo', readFile: () => SOUL_FIXTURE, writeFile: (p, t) => { wrote = { p, t }; } };
  const r = saveSoulSections(deps, { quiParle: 'A', audience: 'B', voix: '- C', lignesRouges: '- D' });
  assert.equal(r.ok, true);
  assert.match(wrote.p, /\/repo\/\.claude\/breves-ia\/SOUL\.md$/);
  assert.match(wrote.t, /## 1\. Qui parle\nA\n/);
  assert.ok(wrote.t.includes('## 5.'));                    // §5 toujours présente
});
test('saveSoulSections refuse un champ vide (n’écrit pas)', () => {
  let called = false;
  const deps = { repoDir: '/repo', readFile: () => SOUL_FIXTURE, writeFile: () => { called = true; } };
  assert.equal(saveSoulSections(deps, { quiParle: '  ', audience: 'B', voix: 'C', lignesRouges: 'D' }).ok, false);
  assert.equal(called, false);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/engine.test.mjs` → FAIL.

- [ ] **Step 3 : Implémenter dans hud/engine.mjs**

Ajouter l'import en tête : `import { parseSoul, replaceSoulSections } from '../lib/soul-model.mjs';`

Remplacer `readSoulRaw` et `saveSoul` par :

```js
export function getSoul(deps) {
  try { return parseSoul(deps.readFile(join(deps.repoDir, ...SOUL_PARTS))); }
  catch { return null; }
}

export function saveSoulSections(deps, edits) {
  const req = ['quiParle', 'audience', 'voix', 'lignesRouges'];
  for (const k of req) {
    if (typeof edits?.[k] !== 'string' || !edits[k].trim()) return { ok: false, error: `${k} vide` };
  }
  try {
    const raw = deps.readFile(join(deps.repoDir, ...SOUL_PARTS));
    deps.writeFile(join(deps.repoDir, ...SOUL_PARTS), replaceSoulSections(raw, edits));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
```

(Supprimer les anciennes fonctions `readSoulRaw` et `saveSoul`. `SOUL_PARTS`, `defaultDeps` avec `readFile`/`writeFile` restent.)

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/engine.test.mjs` → PASS. Puis `npm test` (toute la suite verte ; les anciens tests `readSoulRaw`/`saveSoul` sont retirés — voir Step 5).

- [ ] **Step 5 : Retirer les tests obsolètes** — dans `test/engine.test.mjs`, supprimer les 3 tests `readSoulRaw …` / `saveSoul …` (remplacés par les nouveaux). Relancer `npm test` → vert.

- [ ] **Step 6 : Commit** — `git add hud/engine.mjs test/engine.test.mjs && git commit -m "feat(engine): getSoul + saveSoulSections (structuré) ; retrait de l'éditeur brut"`

---

## Task 4 : IPC + preload — exposer le structuré, retirer le brut

**Files:**
- Modify: `hud/main.mjs`, `hud/preload.cjs`

**Interfaces:**
- Consumes : `getSoul`, `saveSoulSections` (Task 3).
- Produces (preload `window.breves`) : `getSoulStructured() -> Promise<soul|null>` ; `saveSoulSections(edits) -> Promise<{ok}|{ok:false,error}>`.

- [ ] **Step 1 : main.mjs** — mettre à jour l'import et les handlers :
  - Import : `import { …, getSoul, saveSoulSections } from './engine.mjs';` (retirer `readSoulRaw`, `saveSoul`).
  - Remplacer les handlers `get-soul-raw`/`save-soul` par :

```js
ipcMain.handle('get-soul-structured', () => getSoul(deps));
ipcMain.handle('save-soul-sections', (_e, edits) => saveSoulSections(deps, edits));
```

- [ ] **Step 2 : preload.cjs** — remplacer `getSoulRaw`/`saveSoul` par :

```js
  getSoulStructured: () => ipcRenderer.invoke('get-soul-structured'),
  saveSoulSections: (edits) => ipcRenderer.invoke('save-soul-sections', edits),
```

- [ ] **Step 3 : Vérifier le démarrage** — `node --check hud/main.mjs` ; `ELECTRON_RUN_AS_NODE= npx electron hud/main.mjs` démarre sans erreur (fermer après). (Pas de test unitaire IPC.)

- [ ] **Step 4 : Commit** — `git add hud/main.mjs hud/preload.cjs && git commit -m "feat(hud): IPC SOUL structuré (get-soul-structured / save-soul-sections)"`

---

## Task 5 : UI — vue SOUL structurée

**Files:**
- Modify: `hud/companion.html`, `hud/renderer.mjs`

**Note (vérification) :** DOM/Electron, vérifié en lançant l'app.

- [ ] **Step 1 : companion.html — remplacer la section `data-view="soul"`** (l'éditeur brut actuel `#soul-raw` + `#btn-soul-save`) par :

```html
    <!-- SOUL (structuré : §1-4 éditables, §5-6 display) -->
    <section data-view="soul">
      <div class="pad">
        <p class="muted" style="font:400 12.5px/1.5 var(--body);margin:0 0 6px">La voix de Pierre. Édite les 4 premières sections, puis enregistre. <span id="soul-version" style="color:var(--accent)"></span></p>
        <label class="eyebrow" style="display:block;margin:14px 0 5px">1 · Qui parle</label>
        <textarea id="soul-quiParle" spellcheck="false" style="min-height:70px;font:400 12.5px/1.55 var(--body)"></textarea>
        <label class="eyebrow" style="display:block;margin:14px 0 5px">2 · Audience</label>
        <textarea id="soul-audience" spellcheck="false" style="min-height:70px;font:400 12.5px/1.55 var(--body)"></textarea>
        <label class="eyebrow" style="display:block;margin:14px 0 5px">3 · Voix &amp; tics</label>
        <textarea id="soul-voix" spellcheck="false" style="min-height:110px;font:400 12.5px/1.55 var(--mono)"></textarea>
        <label class="eyebrow" style="display:block;margin:14px 0 5px">4 · Lignes rouges</label>
        <textarea id="soul-lignesRouges" spellcheck="false" style="min-height:90px;font:400 12.5px/1.55 var(--mono)"></textarea>
        <button id="btn-soul-save" class="btn-primary" style="margin-top:12px">Enregistrer §1-4</button>

        <div class="eyebrow" style="margin:22px 0 9px">5 · Échantillons vivants</div>
        <div id="soul-echantillons" style="display:flex;flex-direction:column;gap:9px"></div>

        <div class="eyebrow" style="margin:22px 0 9px">6 · Journal d'évolution</div>
        <div id="soul-journal" style="display:flex;flex-direction:column;gap:9px"></div>
      </div>
    </section>
```

- [ ] **Step 2 : renderer.mjs — remplacer `renderSoul` et `saveSoulFromUI`** (qui utilisaient `#soul-raw`/`getSoulRaw`/`saveSoul`) par :

```js
// ============ SOUL (structuré) ============
const SOUL_FIELDS = ['quiParle', 'audience', 'voix', 'lignesRouges'];
async function renderSoul() {
  const s = await window.breves.getSoulStructured();
  if (!s) { $('#soul-version').textContent = '(SOUL introuvable)'; return; }
  $('#soul-version').textContent = s.version;
  for (const f of SOUL_FIELDS) $('#soul-' + f).value = s[f] || '';
  const ech = $('#soul-echantillons'); ech.innerHTML = '';
  (s.echantillons || []).forEach((e) => {
    const card = el('div', 'card');
    const pin = e.epingle ? ' <span class="badge-good">épinglé</span>' : '';
    card.innerHTML = `<div style="font:500 10.5px var(--mono);color:var(--accent);margin-bottom:5px">${escapeHtml(e.date)}${pin}</div><div style="font:400 12.5px/1.5 var(--body)">${inlineMd(e.texte)}</div>`;
    ech.appendChild(card);
  });
  const jrn = $('#soul-journal'); jrn.innerHTML = '';
  if (!(s.journal || []).length) jrn.appendChild(el('div', 'faint', 'Aucune leçon enregistrée.'));
  (s.journal || []).forEach((l) => {
    jrn.appendChild(el('div', '', `<div style="font:500 10.5px var(--mono);color:var(--faint)">${escapeHtml(l.date)}</div><div style="font:400 12.5px/1.45 var(--body);margin-top:1px">${escapeHtml(l.texte)}</div>`));
  });
}
async function saveSoulFromUI() {
  const edits = {};
  for (const f of SOUL_FIELDS) edits[f] = $('#soul-' + f).value.trim();
  if (SOUL_FIELDS.some((f) => !edits[f])) { toast('Les 4 sections doivent être remplies.'); return; }
  const r = await window.breves.saveSoulSections(edits);
  if (!r || !r.ok) { toast('Échec de l\'enregistrement : ' + (r?.error || 'inconnu')); return; }
  toast('SOUL enregistrée');
  state.dashboard = await window.breves.getDashboard();   // rafraîchit la version au dashboard
}
```

(Le câblage `$('#btn-soul-save').onclick = saveSoulFromUI;` dans `wire()` reste inchangé — même id de bouton.)

- [ ] **Step 3 : Vérifier l'app**

Run: `ELECTRON_RUN_AS_NODE= npx electron hud/main.mjs` (ou `npm run hud` hors sandbox)
Expected : la vue SOUL montre 4 textareas pré-remplis (Qui parle / Audience / Voix / Lignes rouges) + la version ; §5 en cartes read-only (date, badge épinglé, texte de brève) ; §6 en liste read-only. Éditer §1 et « Enregistrer §1-4 » → toast « SOUL enregistrée » ; le fichier `.claude/breves-ia/SOUL.md` reflète le changement de §1, **§5/§6 inchangés**.

- [ ] **Step 4 : `npm test`** (non-régression logique) → vert. **Commit**

```bash
git add hud/companion.html hud/renderer.mjs
git commit -m "feat(hud): vue SOUL structurée (§1-4 éditables, §5-6 display)"
```

---

## Notes de fin

- Modules testés : `lib/soul-model.mjs` (parse + round-trip), `lib/soul.mjs` (version `[date]`), `hud/engine.mjs` (getSoul/saveSoulSections). UI vérifiée en lançant l'app.
- Garde-fou d'intégrité prouvé par le test `replaceSoulSections` (§5/§6 octet pour octet).
- Hors scope (confirmé) : sélection d'échantillons, suppression de leçons, curation de suggestions, modif du moteur de brèves.
- Build log à écrire en fin d'exécution (convention CLAUDE.md) : `docs/buildlog/2026-06-24-d-soul-editeur.md`.
