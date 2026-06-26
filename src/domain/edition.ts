import { escapeHtml, inlineMd } from '@domain/format';
import type { TopicEvent } from '@domain/events';

// ---------- rendu d'une édition archivée (← edition-render) ----------

const DATE_RE = /^—\s*(.+?)\s*—$/;
const URL_RE = /^(?:source\s*:\s*)?(https?:\/\/\S+)$/i;
const H_RE = /^#{2,3}\s+(.+)$/;
const HR_RE = /^-{3,}$/;
const BARE_URL_RE = /^(https?:\/\/\S+)$/;
const isTableSep = (l: string): boolean => /\|/.test(l) && /^[\s|:-]+$/.test(l);
const cells = (row: string): string[] =>
  row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

function srcLink(url: string): string {
  let domaine = url;
  try {
    domaine = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* garde l'url */
  }
  return `<a class="ed-src" data-url="${escapeHtml(url)}">${escapeHtml(domaine)} →</a>`;
}

export function renderEditionHtml(markdown: string): string {
  if (typeof markdown !== 'string') return '';
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let titleDone = false;
  let firstDateSeen = false;
  let cardOpen = false;
  let breveStarted = false;
  const closeCard = (): void => {
    if (cardOpen) {
      html += '</div>';
      cardOpen = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (HR_RE.test(line)) {
      closeCard();
      html += '<hr class="ed-hr">';
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1].trim())) {
      closeCard();
      i += 2;
      let rows = '';
      for (; i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== ''; i++) {
        const cs = cells(lines[i].trim());
        const inner = cs
          .map((cell, k) => {
            const um = cell.match(BARE_URL_RE);
            if (um) return srcLink(um[1]);
            return `<span class="${k === 0 ? 'ed-srcsubj' : 'ed-srcnote'}">${inlineMd(cell)}</span>`;
          })
          .join(' ');
        rows += `<div class="ed-srcrow">${inner}</div>`;
      }
      i--;
      html += `<div class="ed-srclist">${rows}</div>`;
      continue;
    }

    const hm = line.match(H_RE);
    if (hm) {
      closeCard();
      html += `<div class="ed-h2">${inlineMd(hm[1])}</div>`;
      continue;
    }

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
    if (um) {
      html += srcLink(um[1]);
      continue;
    }

    if (!titleDone && !firstDateSeen) {
      titleDone = true;
      html += `<div class="ed-title">${inlineMd(line.replace(/^#+\s*/, ''))}</div>`;
      continue;
    }
    if (!firstDateSeen) {
      html += `<p class="ed-intro">${inlineMd(line)}</p>`;
      continue;
    }
    if (/^\*\*/.test(line)) {
      if (breveStarted) html += '<div class="ed-bsep"></div>';
      breveStarted = true;
    }
    html += `<p class="ed-body">${inlineMd(line)}</p>`;
  }
  closeCard();
  return html;
}

// ---------- extraction de brèves (← edition-breves) ----------

export interface Breve {
  date: string;
  source: string;
  accroche: string;
  texte: string;
}

const B_DATE_RE = /^—\s*(.+?)\s*—$/;
const B_URL_RE = /^(?:source\s*:\s*)?(https?:\/\/\S+)$/i;
const B_H_RE = /^#{1,6}\s/;
const B_HR_RE = /^-{3,}$/;

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
function accrocheOf(texte: string): string {
  const m = texte.match(/\*\*(.+?)\*\*/);
  return m ? m[1].trim() : texte.split('\n')[0].trim();
}

interface BreveAcc {
  date: string;
  lines: string[];
  url: string;
}

export function extractBreves(noteText: string): Breve[] {
  if (typeof noteText !== 'string') return [];
  const lines = noteText.split(/\r?\n/);
  const breves: Breve[] = [];
  let curDate = '';
  let firstDateSeen = false;
  let cur: BreveAcc | null = null;
  const flush = (): void => {
    if (cur && cur.lines.length) {
      const texte = cur.lines.join('\n').trim();
      breves.push({ date: cur.date, source: domainOf(cur.url), accroche: accrocheOf(texte), texte });
    }
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dm = line.match(B_DATE_RE);
    if (dm) {
      flush();
      curDate = dm[1].trim();
      firstDateSeen = true;
      continue;
    }
    if (!firstDateSeen) continue;
    if (B_H_RE.test(line) || B_HR_RE.test(line) || line.includes('|')) {
      flush();
      continue;
    }
    const um = line.match(B_URL_RE);
    if (um) {
      if (cur) {
        cur.url = cur.url || um[1];
        cur.lines.push(um[1]);
      }
      continue;
    }
    if (/^\*\*/.test(line)) {
      flush();
      cur = { date: curDate, lines: [line], url: '' };
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  flush();
  return breves;
}

// ---------- parsing du flux SDK (← parse-result) ----------

const SENTINEL_STEPS = ['recherche', 'faits', 'date', 'source', 'article'];

export function extractJsonBlock(text: string): unknown {
  const s = String(text);
  const open = s.lastIndexOf('```json');
  if (open !== -1) {
    const after = s.slice(open + '```json'.length);
    const close = after.lastIndexOf('```');
    if (close !== -1) {
      try {
        return JSON.parse(after.slice(0, close).trim());
      } catch {
        /* tombe au fallback */
      }
    }
  }
  try {
    return JSON.parse(s.trim());
  } catch {
    /* rien */
  }
  throw new Error('aucun bloc JSON');
}

export function parseSentinels(text: string): TopicEvent[] {
  const out: TopicEvent[] = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('«BREVES»')) continue;
    const rest = line.slice('«BREVES»'.length).trim();
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^topic\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-detected', key: m[1], sujet: m[2].trim() });
    } else if ((m = rest.match(/^step\s+(\S+)\s+(\S+)$/))) {
      if (SENTINEL_STEPS.includes(m[2])) out.push({ type: 'topic-progress', key: m[1], step: m[2] });
    } else if ((m = rest.match(/^done\s+(\S+)$/))) {
      out.push({ type: 'topic-done', key: m[1] });
    } else if ((m = rest.match(/^error\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-error', key: m[1], error: m[2].trim() });
    }
  }
  return out;
}
