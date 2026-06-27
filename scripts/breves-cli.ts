import { defaultDeps, dispatch } from '@main/engine';
import { loadEnvFile } from '@main/io/env';

loadEnvFile();
const deps = defaultDeps(); // repoDir (cwd) + wikiMcp (MCP) + bbDir
const [, , skillShort, arg] = process.argv;
const SKILLS: Record<string, string> = {
  verify: 'breves-verify',
  draft: 'breves-draft',
  archive: 'breves-archive',
};
const skill = skillShort ? SKILLS[skillShort] : undefined;
if (!skill) {
  console.error('usage: breves-cli <verify|draft|archive> [arg]');
  process.exit(1);
}

async function readStdin(): Promise<string> {
  let data = '';
  for await (const c of process.stdin) data += c;
  return data.trim();
}

const inputs =
  skill === 'breves-verify'
    ? { sujets: arg ?? (await readStdin()) }
    : JSON.parse(await readStdin());

const r = await dispatch(
  { skill, inputs, onEvent: (e) => console.error('·', JSON.stringify(e)) },
  deps,
);
if (!r.ok) {
  console.error('ÉCHEC:', r.error);
  process.exit(1);
}
console.log(JSON.stringify(r.value, null, 2));
