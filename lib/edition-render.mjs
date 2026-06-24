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
