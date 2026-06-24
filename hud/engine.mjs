import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSkill as realRunSkill } from '../lib/runner.mjs';
import { readSoul as realReadSoul } from '../lib/soul.mjs';
import { listEditions as realListEditions } from '../lib/editions.mjs';
import { loadEngineConfig } from '../lib/config.mjs';

const SOUL_PARTS = ['.claude', 'breves-ia', 'SOUL.md'];

export function defaultDeps(env = process.env) {
  return {
    bbDir: loadEngineConfig(env).bbDir,
    runSkill: realRunSkill,
    readSoul: realReadSoul,
    listEditions: realListEditions,
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, t) => writeFileSync(p, t, 'utf8'),
  };
}

// Texte brut de la SOUL (le fichier tel quel), pour affichage/édition fidèle.
export function readSoulRaw(deps) {
  try { return deps.readFile(join(deps.bbDir, ...SOUL_PARTS)); } catch { return null; }
}

// Écrit la SOUL (mutable, hors raw/). Refuse un contenu vide pour ne jamais l'effacer.
export function saveSoul(deps, text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'contenu vide' };
  try { deps.writeFile(join(deps.bbDir, ...SOUL_PARTS), text); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}

// Lit le texte intégral d'une édition archivée. Nom de fichier strictement validé
// (anti-traversal) : YYYY-MM-DD-breves-ia-merim.md, sous raw/notes/. Renvoie null sinon.
export function readEdition(deps, file) {
  if (!/^\d{4}-\d{2}-\d{2}-breves-ia-merim\.md$/.test(String(file))) return null;
  try { return deps.readFile(join(deps.bbDir, 'raw', 'notes', file)); } catch { return null; }
}

export async function dispatch({ skill, inputs, onEvent }, deps) {
  return deps.runSkill({ skill, inputs, bbDir: deps.bbDir, onEvent });
}

export function getDashboard(deps) {
  let soul = null;
  try { soul = deps.readSoul(deps.bbDir); } catch { soul = null; }
  let editions = [];
  try { editions = deps.listEditions(deps.bbDir); } catch { editions = []; }
  return { soul, editions };
}
