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
