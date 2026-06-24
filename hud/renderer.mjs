import { nextView, stepper, viewTitle } from '../lib/ui-state.mjs';
import { dateLong, inlineMd, escapeHtml, soulVersionLabel } from '../lib/ui-format.mjs';
import { applyEvent, applyResult, summary } from '../lib/checking-model.mjs';
import { renderEditionHtml } from '../lib/edition-render.mjs';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

const state = { view: 'dashboard', theme: 'light', dashboard: null, teamsText: '', readerText: '' };
let cards = [];
let verifyValue = null;
let draftValue = null;
let archiveValue = null;
let wantSoulLesson = true;

const niveauColor = (n) => (n === 'corrigé' ? 'var(--warn)' : n === 'nuance' ? 'var(--nuance)' : 'var(--accent)');
const niveauSoft = (n) => (n === 'corrigé' ? 'var(--warnSoft)' : n === 'nuance' ? 'var(--nuanceSoft)' : 'var(--accentSoft)');
const niveauLabel = (n) => (n === 'corrigé' ? 'Fait corrigé' : n === 'nuance' ? 'Nuance' : 'Date');

// ============ TOAST ============
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2900);
}

// ============ SHELL / NAV ============
function renderShell() {
  document.querySelectorAll('[data-view]').forEach((s) => { s.hidden = s.dataset.view !== state.view; });
  $('#view-title').textContent = state.view === 'detail' ? 'Sujet vérifié'
    : state.view === 'reader' ? (state.readerLabel || 'Édition')
    : viewTitle(state.view);
  $('#view-sub').hidden = state.view !== 'dashboard';
  $('#head-diamond').hidden = state.view !== 'dashboard';
  $('#btn-back').hidden = state.view === 'dashboard';
  const st = stepper(state.view);
  $('#stepper').hidden = st.steps.length === 0;
  $('#step-line').textContent = st.line;
  const box = $('#steps'); box.innerHTML = '';
  st.steps.forEach((s, i) => {
    box.appendChild(el('div', 'step ' + s.state, s.state === 'done' ? '&#10003;' : s.n));
    if (i < st.steps.length - 1) box.appendChild(el('span', 'step-bar'));
  });
}
function show(view) { state.view = view; renderShell(); onEnter(view); }
function go(action) { show(nextView(state.view, action)); }
function onEnter(view) {
  if (view === 'dashboard') loadDashboard();
  if (view === 'soul') renderSoul();
  if (view === 'history') renderHistory();
}
function applyTheme() { document.body.classList.toggle('dark', state.theme === 'dark'); }
function toggleTheme() { state.theme = state.theme === 'light' ? 'dark' : 'light'; applyTheme(); }

// ============ DASHBOARD ============
async function loadDashboard() {
  state.dashboard = await window.breves.getDashboard();
  renderDashboard(state.dashboard);
}
function renderDashboard(data) {
  $('#dash-date').textContent = dateLong(new Date().toISOString().slice(0, 10));
  const eds = data?.editions || [];
  const last = eds[0];
  $('#last-range').textContent = last ? dateLong(last.date) : '—';
  $('#last-count').textContent = last ? String(last.count) : '0';
  $('#last-corr').textContent = last ? String(last.corr) : '0';
  $('#last-sources').textContent = last ? String(last.count) : '0';
  $('#hist-count').textContent = String(eds.length);
  $('#soul-version').textContent = soulVersionLabel(data?.soul?.version);
  const list = $('#editions-list'); list.innerHTML = '';
  if (!eds.length) list.appendChild(el('div', 'faint', 'Aucune édition archivée pour l\'instant.'));
  for (const e of eds.slice(0, 4)) {
    const b = el('button', 'edition');
    b.appendChild(el('span', 'r', dateLong(e.date)));
    b.appendChild(el('span', 'm', `${e.count} brèves · ${e.corr} corr.`));
    b.onclick = () => openReader(e);
    list.appendChild(b);
  }
}

// ============ COMPOSE ============
function renderDetected() {
  const lines = $('#raw-text').value.split('\n').map((l) => l.trim()).filter(Boolean);
  const box = $('#detected-chips'); box.innerHTML = '';
  lines.slice(0, 8).forEach((l) => box.appendChild(el('span', 'pill', escapeHtml(l.length > 22 ? l.slice(0, 20) + '…' : l))));
}
function launch() {
  const sujets = $('#raw-text').value.trim();
  if (!sujets) { toast('Donne au moins un sujet.'); return; }
  cards = []; verifyValue = null;
  show('checking');
  renderChecking(false);
  runVerify(sujets);
}

// ============ CHECKING ============
async function runVerify(sujets) {
  const r = await window.breves.sendCommand('breves-verify', { sujets });
  if (!r.ok) { toast('Échec de la vérification : ' + r.error); return; }
  verifyValue = r.value;
  cards = applyResult(cards, verifyValue); // filet : termine les cartes même sans sentinelle
  renderChecking(true);
}
function renderChecking(done) {
  const box = $('#checking-cards'); box.innerHTML = '';
  cards.forEach((c) => box.appendChild(renderCard(c)));
  const sum = $('#check-summary');
  if (done && cards.length) {
    const s = summary(cards);
    $('#sum-line').textContent = `${s.verifies} vérifiés · ${s.corriges} corrigés · ${s.nuances} nuancés`;
    sum.hidden = false;
  } else { sum.hidden = true; }
}
function renderCard(c) {
  const card = el('div', 'enq');
  const head = el('div', '', '');
  head.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:11px';
  const dotCol = c.error ? 'var(--warn)' : (c.done ? 'var(--good)' : 'var(--accent)');
  const dot = el('span'); dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${dotCol};${c.done ? '' : 'animation:pulse 1.1s ease-in-out infinite'}`;
  head.appendChild(dot);
  head.appendChild(el('span', 'eyebrow', 'Enquêteur'));
  const status = el('span', '', escapeHtml(c.status));
  status.style.cssText = `margin-left:auto;font:500 10.5px var(--mono);color:${c.error ? 'var(--warn)' : (c.done ? 'var(--good)' : 'var(--accent)')}`;
  head.appendChild(status);
  card.appendChild(head);
  const title = el('div', '', escapeHtml(c.title)); title.style.cssText = 'font:600 13.5px/1.3 var(--display);margin-bottom:12px';
  card.appendChild(title);
  const steps = el('div'); steps.style.cssText = 'display:flex;flex-direction:column;gap:6px';
  c.steps.forEach((s) => {
    const row = el('div', 'enq-step');
    const klass = s.state === 'done' ? 'dot done' : (s.state === 'active' ? 'dot active' : 'dot todo');
    row.appendChild(el('span', klass, s.state === 'done' ? '&#10003;' : ''));
    const lbl = el('span', '', s.name.charAt(0).toUpperCase() + s.name.slice(1));
    lbl.style.color = s.state === 'todo' ? 'var(--faint)' : 'var(--text)';
    row.appendChild(lbl);
    steps.appendChild(row);
  });
  card.appendChild(steps);
  if (c.done && !c.error) {
    const foot = el('div'); foot.style.cssText = 'margin-top:12px;padding-top:11px;border-top:1px solid var(--line)';
    const srcrow = el('div'); srcrow.style.cssText = 'display:flex;align-items:center;gap:7px;margin-bottom:8px;flex-wrap:wrap';
    srcrow.appendChild(el('span', 'badge-good', 'Source'));
    srcrow.appendChild(el('span', '', `<span style="font:500 11px var(--mono);color:var(--muted)">${escapeHtml(c.source || '')}</span>`));
    foot.appendChild(srcrow);
    if (c.alerte) {
      const a = el('div', 'alert'); a.style.background = niveauSoft(c.alerte.niveau);
      a.appendChild(el('span', '', `<span style="font:600 10px var(--body);color:${niveauColor(c.alerte.niveau)};text-transform:uppercase;letter-spacing:.04em">${niveauLabel(c.alerte.niveau)}</span>`));
      a.appendChild(el('span', '', `<span style="font:400 11.5px/1.4 var(--body);color:var(--text)">${escapeHtml(c.alerte.texte)}</span>`));
      foot.appendChild(a);
    }
    card.appendChild(foot);
  }
  if (verifyValue) card.onclick = () => openDrawer(c.key);
  return card;
}

// ============ DRAWER ============
function openDrawer(key) {
  const t = (verifyValue?.topics || []).find((x) => x.key === key);
  if (!t) return;
  $('#drawer-title').textContent = t.sujet || t.key;
  $('#drawer-date').textContent = dateLong(t.date_reelle);
  $('#drawer-raw').textContent = t.raw ? `saisi : « ${t.raw} »` : '';
  const aw = $('#drawer-alert-wrap');
  if (t.alerte) {
    aw.hidden = false;
    aw.innerHTML = `<div style="display:flex;gap:10px;background:${niveauSoft(t.alerte.niveau)};border:1px solid ${niveauColor(t.alerte.niveau)};border-radius:var(--radiusSm);padding:12px 13px">
      <span style="font-size:15px;flex:none">&#9888;</span>
      <div><div style="font:600 11px var(--body);color:${niveauColor(t.alerte.niveau)};text-transform:uppercase;letter-spacing:.04em">${niveauLabel(t.alerte.niveau)}</div>
      <div style="font:400 12.5px/1.5 var(--body);color:var(--text);margin-top:2px">${escapeHtml(t.alerte.texte)}</div></div></div>`;
  } else { aw.hidden = true; aw.innerHTML = ''; }
  const facts = $('#drawer-facts'); facts.innerHTML = '';
  (t.faits || []).forEach((f) => {
    const row = el('div'); row.style.cssText = 'display:flex;gap:9px;align-items:flex-start';
    row.appendChild(el('span', 'dot done', '&#10003;'));
    row.appendChild(el('span', '', `<span style="font:400 13px/1.5 var(--body)">${escapeHtml(f)}</span>`));
    facts.appendChild(row);
  });
  $('#drawer-source').textContent = t.source || '';
  $('#drawer-url').textContent = t.url_citee || '';
  $('#drawer-clip').textContent = t.clipping_contenu ? (t.clipping_contenu.slice(0, 600)) : '(pas de clipping)';
  state.returnTo = state.view;
  show('detail');
}

// ============ EDITOR ============
async function runDraft(feedback) {
  if (!verifyValue) return;
  const inputs = { topics: verifyValue.topics };
  if (feedback) inputs.feedback = feedback;
  toast('Rédaction en cours…');
  const r = await window.breves.sendCommand('breves-draft', inputs);
  if (!r.ok) { toast('Échec de la rédaction : ' + r.error); return; }
  draftValue = r.value;
  renderEditor(draftValue);
}
let editorMode = 'preview';
function applyEditorMode() {
  const preview = editorMode === 'preview';
  $('#teams-text').hidden = !preview;
  $('#teams-edit').hidden = preview;
  if (preview) $('#teams-text').innerHTML = renderEditionHtml(state.teamsText);
  else $('#teams-edit').value = state.teamsText;
  $('#btn-edit-toggle').textContent = preview ? 'Éditer' : 'Aperçu';
}
function toggleEditor() {
  if (editorMode === 'edit') state.teamsText = $('#teams-edit').value;
  editorMode = editorMode === 'preview' ? 'edit' : 'preview';
  applyEditorMode();
}
function syncTeamsText() { if (editorMode === 'edit') state.teamsText = $('#teams-edit').value; }

function renderEditor(d) {
  state.teamsText = d.teamsText || '';
  editorMode = 'preview';
  applyEditorMode();
  const cl = $('#corrections-list'); cl.innerHTML = '';
  if (!d.corrections?.length) cl.appendChild(el('div', 'faint', 'Aucune correction.'));
  (d.corrections || []).forEach((x) => {
    const row = el('div', 'corr-item');
    const dot = el('span', 'corr-dot'); dot.style.background = niveauColor(x.niveau);
    row.appendChild(dot);
    row.appendChild(el('div', '', `<div style="font:600 12.5px var(--body)">${escapeHtml(x.titre)}</div><div style="font:400 11.5px/1.45 var(--body);color:var(--muted);margin-top:1px">${escapeHtml(x.detail)}</div>`));
    cl.appendChild(row);
  });
  const sl = $('#sources-list'); sl.innerHTML = '';
  (d.sources || []).forEach((s) => {
    const row = el('div'); row.style.cssText = 'display:flex;align-items:flex-start;gap:9px';
    row.appendChild(el('span', 'dot done', '&#10003;'));
    const repli = s.repli ? ' <span style="color:var(--nuance)">(repli)</span>' : '';
    row.appendChild(el('div', '', `<div style="font:600 12.5px var(--body)">${escapeHtml(s.name)}${repli}</div><div style="font:400 10.5px var(--mono);color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(s.url_citee)}</div>`));
    sl.appendChild(row);
  });
}

// ============ CORRECT MODAL ============
function openCorrect() { $('#correct-text').value = ''; $('#correct-soul').checked = wantSoulLesson; $('#correct-modal').hidden = false; }
function submitCorrect() {
  const fb = $('#correct-text').value.trim();
  wantSoulLesson = $('#correct-soul').checked;
  $('#correct-modal').hidden = true;
  if (fb) runDraft(fb);
}

// ============ ARCHIVE ============
async function runArchive() {
  if (!draftValue || !verifyValue) return;
  syncTeamsText();
  const teamsText = (state.teamsText || '').trim() || draftValue.teamsText;
  const leconSOUL = (wantSoulLesson && draftValue.soulLessonProposee) || undefined;
  const inputs = { teamsText, topics: verifyValue.topics, sources: draftValue.sources };
  if (leconSOUL) inputs.leconSOUL = leconSOUL;
  toast('Archivage + ingestion en cours…');
  const r = await window.breves.archive(inputs);   // archive (cwd repo) puis /ingest (cwd wiki)
  if (!r.ok) { toast('Échec de l\'archivage : ' + r.error); return; }
  archiveValue = r.value;
  show('archived');
  renderArchived(archiveValue);
  if (r.ingest && !r.ingest.ok) toast('Déposé dans raw/, mais l\'ingestion a échoué : relance /ingest côté wiki');
}
function renderArchived(a) {
  const box = $('#archive-steps'); box.innerHTML = '';
  (a.archiveSteps || []).forEach((s) => {
    const row = el('div'); row.style.cssText = 'display:flex;align-items:center;gap:11px;padding:11px 14px;border-bottom:1px solid var(--line)';
    row.appendChild(el('span', 'dot done', '&#10003;'));
    row.appendChild(el('span', '', `<span style="font:500 13px var(--body)">${escapeHtml(s.t)}</span>`));
    row.appendChild(el('span', '', `<span style="margin-left:auto;font:400 10.5px var(--mono);color:var(--faint)">${escapeHtml(s.d)}</span>`));
    row.style.display = 'flex';
    box.appendChild(row);
  });
  $('#newsletter-final').innerHTML = renderEditionHtml(a.newsletterText || '');
}

// ============ SOUL (structuré : §1-4 éditables, §5-6 display) ============
const SOUL_FIELDS = ['quiParle', 'audience', 'voix', 'lignesRouges'];
async function renderSoul() {
  const s = await window.breves.getSoulStructured();
  if (!s) { $('#soul-view-version').textContent = '(SOUL introuvable)'; return; }
  $('#soul-view-version').textContent = s.version;
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
    const card = el('div', 'card');
    card.innerHTML = `<div style="font:500 10.5px var(--mono);color:var(--accent);margin-bottom:5px">${escapeHtml(l.date)}</div><div style="font:400 12.5px/1.5 var(--body)">${escapeHtml(l.texte)}</div>`;
    jrn.appendChild(card);
  });
}
async function saveSoulFromUI() {
  const edits = {};
  for (const f of SOUL_FIELDS) edits[f] = $('#soul-' + f).value.trim();
  if (SOUL_FIELDS.some((f) => !edits[f])) { toast('Les 4 sections doivent être remplies.'); return; }
  const r = await window.breves.saveSoulSections(edits);
  if (!r || !r.ok) { toast('Échec de l\'enregistrement : ' + (r?.error || 'inconnu')); return; }
  toast('SOUL enregistrée');
  state.dashboard = await window.breves.getDashboard();  // rafraîchit la version au dashboard
}

// ============ HISTORY + READER ============
function renderHistory() {
  const eds = state.dashboard?.editions || [];
  const box = $('#history-list'); box.innerHTML = '';
  if (!eds.length) box.appendChild(el('div', 'faint', 'Aucune édition archivée.'));
  eds.forEach((e) => {
    const b = el('button', 'card'); b.style.cssText = 'display:block;width:100%;text-align:left';
    b.innerHTML = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px"><span style="font:600 14px var(--display)">${dateLong(e.date)}</span><span style="margin-left:auto;font:500 10px var(--body);color:var(--accent)">Lire &#8250;</span></div>
      <div style="display:flex;gap:16px;font:400 12px var(--body);color:var(--muted)"><span><b style="color:var(--text)">${e.count}</b> brèves</span><span><b style="color:var(--warn)">${e.corr}</b> corrections</span></div>`;
    b.onclick = () => openReader(e);
    box.appendChild(b);
  });
}
async function openReader(e) {
  state.readerLabel = dateLong(e.date);
  $('#reader-sub').textContent = `${e.count} brèves · archivée`;
  $('#reader-text').textContent = 'Chargement…';
  state.returnTo = state.view;
  show('reader');
  const text = e.file ? await window.breves.readEdition(e.file) : null;
  state.readerText = text || '';
  $('#reader-text').innerHTML = text ? renderEditionHtml(text)
    : 'Texte introuvable dans le wiki (raw/notes/' + escapeHtml(e.file || '') + ').';
}

// ============ EVENTS MOTEUR (streaming) ============
window.breves.onCommandEvent((ev) => {
  if (['topic-detected', 'topic-progress', 'topic-done', 'topic-error'].includes(ev.type)) {
    cards = applyEvent(cards, ev);
    if (state.view === 'checking') renderChecking(false);
  }
});

// ============ CÂBLAGE ============
function wire() {
  // liens sources des éditions → navigateur externe
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.ed-src');
    if (a && a.dataset.url) { e.preventDefault(); window.breves.openExternal(a.dataset.url); }
  });
  $('#btn-back').onclick = () => {
    if (state.view === 'detail' || state.view === 'reader') show(state.returnTo || 'dashboard');
    else go('goDash');
  };
  $('#btn-theme').onclick = toggleTheme;
  $('#cta-new').onclick = () => { $('#raw-text').value = ''; renderDetected(); go('goCompose'); };
  $('#btn-soul').onclick = () => go('goSoul');
  $('#btn-soul-save').onclick = saveSoulFromUI;
  $('#btn-hist').onclick = () => go('goHist');
  $('#raw-text').addEventListener('input', renderDetected);
  $('#btn-launch').onclick = launch;
  $('#btn-redact').onclick = () => { go('toEditor'); runDraft(); };
  $('#btn-edit-toggle').onclick = toggleEditor;
  $('#btn-corriger').onclick = openCorrect;
  $('#btn-valider').onclick = runArchive;
  $('#correct-cancel').onclick = () => { $('#correct-modal').hidden = true; };
  $('#correct-send').onclick = submitCorrect;
  $('#btn-copy-final').onclick = () => { window.breves.copy(archiveValue?.newsletterText || ''); toast('Brèves copiées : prêtes à coller dans Teams'); };
  $('#btn-hist2').onclick = () => go('goHist');
  $('#btn-new2').onclick = () => { $('#raw-text').value = ''; renderDetected(); go('goCompose'); };
  $('#reader-copy').onclick = () => { window.breves.copy(state.readerText || ''); toast('Brèves copiées'); };
}

wire();
applyTheme();
show('dashboard');
