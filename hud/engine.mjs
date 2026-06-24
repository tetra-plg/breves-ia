import { runSkill as realRunSkill } from '../lib/runner.mjs';
import { readSoul as realReadSoul } from '../lib/soul.mjs';
import { listEditions as realListEditions } from '../lib/editions.mjs';
import { loadEngineConfig } from '../lib/config.mjs';

export function defaultDeps(env = process.env) {
  return {
    bbDir: loadEngineConfig(env).bbDir,
    runSkill: realRunSkill,
    readSoul: realReadSoul,
    listEditions: realListEditions,
  };
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
