import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSkill as realRunSkill, runRaw as realRunRaw } from '../lib/runner.mjs';
import { readSoul as realReadSoul } from '../lib/soul.mjs';
import { listEditions as realListEditions } from '../lib/editions.mjs';
import { loadEngineConfig } from '../lib/config.mjs';
import { parseSoul, replaceSoulSections, replaceSoulEchantillons } from '../lib/soul-model.mjs';
import { parseAgent, toAgentDefinition, serializeAgent } from '../lib/agent-file.mjs';

const SOUL_PARTS = ['.claude', 'breves-ia', 'SOUL.md'];

export function defaultDeps(env = process.env) {
  const { bbDir, repoDir, wikiMcp } = loadEngineConfig(env);
  return {
    bbDir,
    repoDir,
    wikiMcp,
    runSkill: realRunSkill,
    runRaw: realRunRaw,
    readSoul: realReadSoul,
    listEditions: realListEditions,
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, t) => writeFileSync(p, t, 'utf8'),
    readdir: (p) => readdirSync(p),
  };
}

export function loadAgents(deps) {
  const dir = join(deps.repoDir, '.claude', 'agents');
  let files = [];
  try { files = deps.readdir(dir); } catch { return { defs: {}, byName: {} }; }
  const defs = {}, byName = {};
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const a = parseAgent(deps.readFile(join(dir, f)));
    if (!a.name) continue;
    byName[a.name] = a;
    if (a.enabled) defs[a.name] = toAgentDefinition(a);
  }
  return { defs, byName };
}

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

export function saveSoulEchantillons(deps, entries) {
  if (!Array.isArray(entries) || entries.length > 3) return { ok: false, error: 'max 3 échantillons' };
  if (entries.some((e) => typeof e?.texte !== 'string' || !e.texte.trim())) return { ok: false, error: 'échantillon vide' };
  try {
    const path = join(deps.repoDir, ...SOUL_PARTS);
    deps.writeFile(path, replaceSoulEchantillons(deps.readFile(path), entries));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Lit le texte intégral d'une édition archivée. Nom de fichier strictement validé
// (anti-traversal) : YYYY-MM-DD-breves-ia-merim.md, sous raw/notes/. Renvoie null sinon.
export function readEdition(deps, file) {
  if (!/^\d{4}-\d{2}-\d{2}-breves-ia-merim(-[a-z0-9-]+)?\.md$/.test(String(file))) return null;
  try { return deps.readFile(join(deps.bbDir, 'raw', 'notes', file)); } catch { return null; }
}

export async function dispatch({ skill, inputs, onEvent }, deps) {
  const { defs, byName } = loadAgents(deps);
  const finalInputs = { ...inputs };
  if (skill === 'breves-verify' && finalInputs.sceptique == null) {
    const s = byName.sceptique;
    finalInputs.sceptique = (s && s.enabled && s.mode) ? s.mode : 'off';
  }
  if (skill === 'breves-draft' && finalInputs.redacteur == null) {
    const r = byName.redacteur;
    finalInputs.redacteur = (r && r.enabled) ? 'on' : 'off';
  }
  return deps.runSkill({
    skill,
    inputs: finalInputs,
    bbDir: deps.repoDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    agents: Object.keys(defs).length ? defs : undefined,
    onEvent,
  });
}

export function getDashboard(deps) {
  let soul = null;
  try { soul = deps.readSoul(deps.repoDir); } catch { soul = null; }
  let editions = [];
  try { editions = deps.listEditions(deps.bbDir); } catch { editions = []; }
  return { soul, editions };
}

export function getAgents(deps) {
  const { byName } = loadAgents(deps);
  return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
}

export function saveAgent(deps, name, edits) {
  if (!name || typeof edits?.systemPrompt !== 'string' || !edits.systemPrompt.trim()) {
    return { ok: false, error: 'nom ou prompt vide' };
  }
  const path = join(deps.repoDir, '.claude', 'agents', `${name}.md`);
  try {
    const current = parseAgent(deps.readFile(path));
    const merged = {
      ...current,
      model: edits.model ?? current.model,
      tools: edits.tools ?? current.tools,
      systemPrompt: edits.systemPrompt,
      enabled: edits.enabled ?? current.enabled,
      mode: edits.mode ?? current.mode,
      description: edits.description ?? current.description,
    };
    deps.writeFile(path, serializeAgent(merged));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function archiveAndIngest({ teamsText, topics, sources, leconSOUL, onEvent }, deps) {
  const archiveResult = await dispatch(
    { skill: 'breves-archive', inputs: { teamsText, topics, sources, leconSOUL }, onEvent },
    deps,
  );
  if (!archiveResult.ok) return archiveResult;
  const ingest = await deps.runRaw({
    prompt: '/ingest',
    cwd: deps.bbDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
    onEvent,
  });
  return { ...archiveResult, ingest };
}
