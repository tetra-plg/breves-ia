import { readFileSync } from 'node:fs';

// Chargeur .env minimal (sans dépendance, portable toutes versions Node).
// Format : une ligne KEY=valeur ; lignes vides et # ignorés ; guillemets optionnels.

export function parseEnv(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Charge `path` dans `env` SANS écraser une variable déjà définie (l'env réel a priorité).
// Fichier absent -> no-op. Retourne les clés effectivement appliquées.
export function loadEnvFile(path = '.env', env = process.env) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const parsed = parseEnv(text);
  const applied = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (env[k] === undefined) {
      env[k] = v;
      applied[k] = v;
    }
  }
  return applied;
}
