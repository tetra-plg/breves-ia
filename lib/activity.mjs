// Transforme un message du SDK en libellés d'activité lisibles, pour donner
// un retour live pendant le fan-out de vérification (Task enquêteur/sceptique,
// recherches web…). Pur : aucune dépendance, aucune horloge.

function trim(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function hostOf(url) {
  const m = String(url || '').match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, '') : trim(url, 40);
}

export function labelForTool(name, input = {}) {
  if (name === 'Task') {
    const who = input.subagent_type === 'sceptique' ? 'Sceptique'
      : input.subagent_type === 'enqueteur' ? 'Enquêteur'
      : (input.subagent_type || 'Sous-agent');
    const what = trim(input.description || input.prompt || '', 60);
    return what ? `${who} : ${what}` : who;
  }
  if (name === 'WebSearch') return input.query ? `Recherche web : ${trim(input.query, 60)}` : 'Recherche web…';
  if (name === 'WebFetch') return `Lecture : ${hostOf(input.url)}`;
  if (typeof name === 'string' && name.startsWith('mcp__')) return null; // bruit MCP
  if (name) return `${name}…`;
  return null;
}

// Renvoie un tableau d'évènements { type:'activity', label } pour les tool_use
// trouvés dans un message assistant (agent principal OU sous-agent).
export function activityFromMessage(m) {
  if (m?.type !== 'assistant') return [];
  const blocks = m?.message?.content;
  if (!Array.isArray(blocks)) return [];
  const out = [];
  for (const b of blocks) {
    if (b?.type !== 'tool_use') continue;
    const label = labelForTool(b.name, b.input || {});
    if (label) out.push({ type: 'activity', label });
  }
  return out;
}
