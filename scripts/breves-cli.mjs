import { runSkill } from '../lib/runner.mjs';
import { loadEngineConfig } from '../lib/config.mjs';
import { loadEnvFile } from '../lib/load-env.mjs';

loadEnvFile();
const { bbDir } = loadEngineConfig();
const [, , skillShort, arg] = process.argv;
const SKILL = { verify: 'breves-verify', draft: 'breves-draft', archive: 'breves-archive' }[skillShort];
if (!SKILL) { console.error('usage: breves-cli <verify|draft|archive> [arg]'); process.exit(1); }

async function readStdin() {
  let data = ''; for await (const c of process.stdin) data += c; return data.trim();
}

const inputs = SKILL === 'breves-verify'
  ? { sujets: arg ?? await readStdin() }
  : JSON.parse(await readStdin());

const r = await runSkill({
  skill: SKILL, inputs, bbDir,
  onEvent: (e) => console.error('·', JSON.stringify(e)),
});
if (!r.ok) { console.error('ÉCHEC:', r.error); process.exit(1); }
console.log(JSON.stringify(r.value, null, 2));
