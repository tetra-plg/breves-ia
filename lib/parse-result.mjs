const STEPS = ['recherche', 'faits', 'date', 'source', 'article'];

export function extractJsonBlock(text) {
  const s = String(text);
  const open = s.lastIndexOf('```json');
  if (open !== -1) {
    const after = s.slice(open + '```json'.length);
    const close = after.lastIndexOf('```');
    if (close !== -1) {
      try { return JSON.parse(after.slice(0, close).trim()); } catch { /* tombe au fallback */ }
    }
  }
  try { return JSON.parse(s.trim()); } catch { /* rien */ }
  throw new Error('aucun bloc JSON');
}

export function parseSentinels(text) {
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('«BREVES»')) continue;
    const rest = line.slice('«BREVES»'.length).trim();
    let m;
    if ((m = rest.match(/^topic\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-detected', key: m[1], sujet: m[2].trim() });
    } else if ((m = rest.match(/^step\s+(\S+)\s+(\S+)$/))) {
      if (STEPS.includes(m[2])) out.push({ type: 'topic-progress', key: m[1], step: m[2] });
    } else if ((m = rest.match(/^done\s+(\S+)$/))) {
      out.push({ type: 'topic-done', key: m[1] });
    } else if ((m = rest.match(/^error\s+(\S+)\s*\|\s*(.+)$/))) {
      out.push({ type: 'topic-error', key: m[1], error: m[2].trim() });
    }
  }
  return out;
}
