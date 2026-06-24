import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSkill as realRunSkill, runRaw as realRunRaw } from '../lib/runner.mjs';
import { readSoul as realReadSoul } from '../lib/soul.mjs';
import { listEditions as realListEditions } from '../lib/editions.mjs';
import { loadEngineConfig } from '../lib/config.mjs';
import { parseSoul, replaceSoulSections } from '../lib/soul-model.mjs';

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
  };
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

// Lit le texte intégral d'une édition archivée. Nom de fichier strictement validé
// (anti-traversal) : YYYY-MM-DD-breves-ia-merim.md, sous raw/notes/. Renvoie null sinon.
export function readEdition(deps, file) {
  if (!/^\d{4}-\d{2}-\d{2}-breves-ia-merim\.md$/.test(String(file))) return null;
  try { return deps.readFile(join(deps.bbDir, 'raw', 'notes', file)); } catch { return null; }
}

export async function dispatch({ skill, inputs, onEvent }, deps) {
  return deps.runSkill({
    skill,
    inputs,
    bbDir: deps.repoDir,
    mcpServers: deps.wikiMcp ? { 'boiling-brain-wiki': deps.wikiMcp } : undefined,
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
