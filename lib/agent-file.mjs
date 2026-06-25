function splitFrontmatter(raw) {
  const m = String(raw).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: String(raw).trim() };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: m[2].trim() };
}

export function parseAgent(raw) {
  const { fm, body } = splitFrontmatter(raw);
  const tools = fm.tools ? fm.tools.split(',').map((t) => t.trim()).filter(Boolean) : [];
  return {
    name: fm.name || '',
    description: fm.description || '',
    tools,
    model: fm.model && fm.model !== 'inherit' ? fm.model : '',
    enabled: fm.breves_enabled !== 'false',
    mode: fm.breves_mode || '',
    systemPrompt: body,
  };
}

export function toAgentDefinition(a) {
  const def = { description: a.description, prompt: a.systemPrompt };
  if (a.tools && a.tools.length) def.tools = a.tools;
  if (a.model) def.model = a.model;
  return def;
}

export function serializeAgent(a) {
  const fm = ['---', `name: ${a.name || ''}`];
  if (a.description) fm.push(`description: ${a.description}`);
  fm.push(`tools: ${(a.tools || []).join(', ')}`);
  if (a.model) fm.push(`model: ${a.model}`);
  fm.push(`breves_enabled: ${a.enabled === false ? 'false' : 'true'}`);
  if (a.mode) fm.push(`breves_mode: ${a.mode}`);
  fm.push('---');
  return `${fm.join('\n')}\n${(a.systemPrompt || '').trim()}\n`;
}
