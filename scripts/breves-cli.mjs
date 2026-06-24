import { defaultDeps, dispatch } from '../hud/engine.mjs';
import { loadEnvFile } from '../lib/load-env.mjs';

loadEnvFile();
const deps = defaultDeps();          // repoDir (cwd) + wikiMcp (MCP) + bbDir
const [, , skillShort, arg] = process.argv;
const SKILL = { verify: 'breves-verify', draft: 'breves-draft', archive: 'breves-archive' }[skillShort];
if (!SKILL) { console.error('usage: breves-cli <verify|draft|archive> [arg]'); process.exit(1); }

async function readStdin() {
  let data = ''; for await (const c of process.stdin) data += c; return data.trim();
}

const inputs = SKILL === 'breves-verify'
  ? { sujets: arg ?? await readStdin() }
  : JSON.parse(await readStdin());

const r = await dispatch({
  skill: SKILL, inputs,
  onEvent: (e) => console.error('·', JSON.stringify(e)),
}, deps);
if (!r.ok) { console.error('ÉCHEC:', r.error); process.exit(1); }
console.log(JSON.stringify(r.value, null, 2));
