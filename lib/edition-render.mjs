import { escapeHtml, inlineMd } from './ui-format.mjs';

const DATE_RE = /^—\s*(.+?)\s*—$/;
const URL_RE = /^(?:source\s*:\s*)?(https?:\/\/\S+)$/i;     // URL nue OU « Source : <url> »
const H_RE = /^#{2,3}\s+(.+)$/;                              // ## ou ### titre
const HR_RE = /^-{3,}$/;                                     // --- séparateur
const BARE_URL_RE = /^(https?:\/\/\S+)$/;
const isTableSep = (l) => /\|/.test(l) && /^[\s|:-]+$/.test(l);   // |---|---|
const cells = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

function srcLink(url) {
  let domaine = url;
  try { domaine = new URL(url).hostname.replace(/^www\./, ''); } catch { /* garde l'url */ }
  return `<a class="ed-src" data-url="${escapeHtml(url)}">${escapeHtml(domaine)} →</a>`;
}

// Rend une édition de brèves : titre + intro, puis UNE CARTE PAR BRÈVE (date + corps + source),
// dans l'esprit des échantillons de la SOUL. Le bloc « ## Sources » et son tableau deviennent
// une liste de sources stylée.
export function renderEditionHtml(markdown) {
  if (typeof markdown !== 'string') return '';
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let titleDone = false;
  let firstDateSeen = false;
  let cardOpen = false;
  let breveStarted = false;   // une brève déjà ouverte dans la carte courante (pour séparer)
  const closeCard = () => { if (cardOpen) { html += '</div>'; cardOpen = false; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (HR_RE.test(line)) { closeCard(); html += '<hr class="ed-hr">'; continue; }

    // Tableau GFM (bloc Sources) : une ligne avec | suivie d'une ligne séparatrice.
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1].trim())) {
      closeCard();
      i += 2;
      let rows = '';
      for (; i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== ''; i++) {
        const cs = cells(lines[i].trim());
        const inner = cs.map((cell, k) => {
          const um = cell.match(BARE_URL_RE);
          if (um) return srcLink(um[1]);
          return `<span class="${k === 0 ? 'ed-srcsubj' : 'ed-srcnote'}">${inlineMd(cell)}</span>`;
        }).join(' ');
        rows += `<div class="ed-srcrow">${inner}</div>`;
      }
      i--;
      html += `<div class="ed-srclist">${rows}</div>`;
      continue;
    }

    const hm = line.match(H_RE);
    if (hm) { closeCard(); html += `<div class="ed-h2">${inlineMd(hm[1])}</div>`; continue; }

    const dm = line.match(DATE_RE);
    if (dm) {
      closeCard();
      firstDateSeen = true;
      cardOpen = true;
      breveStarted = false;
      html += `<div class="card ed-breve"><div class="ed-date">${inlineMd(dm[1])}</div>`;
      continue;
    }

    const um = line.match(URL_RE);
    if (um) { html += srcLink(um[1]); continue; }    // dans la carte si ouverte

    if (!titleDone && !firstDateSeen) { titleDone = true; html += `<div class="ed-title">${inlineMd(line.replace(/^#+\s*/, ''))}</div>`; continue; }
    if (!firstDateSeen) { html += `<p class="ed-intro">${inlineMd(line)}</p>`; continue; }
    // Corps d'une brève. Chaque brève s'ouvre par son accroche en gras (**…**) :
    // si une brève est déjà dans la carte, on insère un séparateur avant la suivante.
    if (/^\*\*/.test(line)) {
      if (breveStarted) html += '<div class="ed-bsep"></div>';
      breveStarted = true;
    }
    html += `<p class="ed-body">${inlineMd(line)}</p>`;
  }
  closeCard();
  return html;
}
